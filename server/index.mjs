import crypto from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const required = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !process.env[name]);
if (required.length) throw new Error(`Missing environment variables: ${required.join(", ")}`);

const app = Fastify({ logger: true, bodyLimit: 2_000_000, trustProxy: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const OWNER_USERNAME = String(process.env.NORTH_OWNER_USERNAME || "druwbi").trim().toLowerCase();
await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(",") ?? true });
await app.register(jwt, { secret: process.env.JWT_SECRET });
await app.register(rateLimit, { global: true, max: 180, timeWindow: "1 minute" });

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const publicUser = (row) => ({ id: row.id, username: row.username, displayName: row.display_name, timezone: row.timezone });
const accessToken = (user) => app.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "15m" });
const createRecoveryCode = () => crypto.randomBytes(20).toString("hex").toUpperCase().match(/.{1,8}/g).join("-");

function requestDevice(request) {
  const headerId = String(request.headers["x-north-device-id"] ?? "");
  return { id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(headerId) ? headerId : crypto.randomUUID(), name: String(request.headers["x-north-device-name"] ?? "Browser").slice(0, 100) };
}

async function upsertDevice(client, ownerUserId, request) {
  const device = requestDevice(request);
  const existing = await client.query("select owner_user_id,revoked_at from devices where id=$1", [device.id]);
  if (existing.rows[0] && existing.rows[0].owner_user_id !== ownerUserId) throw new Error("Device identity belongs to another account");
  if (!existing.rows[0]) await client.query("insert into devices(id,owner_user_id,name,user_agent,last_ip) values($1,$2,$3,$4,$5)", [device.id, ownerUserId, device.name, request.headers["user-agent"] ?? null, request.ip]);
  else await client.query("update devices set name=$1,user_agent=$2,last_ip=$3,last_seen_at=now() where id=$4", [device.name, request.headers["user-agent"] ?? null, request.ip, device.id]);
  return { ...device, revokedAt: existing.rows[0]?.revoked_at ?? null };
}

async function issueSession(client, user, request) {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const device = await upsertDevice(client, user.id, request);
  if (device.revokedAt) throw new Error("This device has been revoked");
  await client.query(
    "insert into refresh_tokens(owner_user_id, token_hash, device_id, expires_at) values($1,$2,$3,now() + interval '30 days')",
    [user.id, sha256(refreshToken), device.id],
  );
  return { user: publicUser(user), device: { id: device.id, name: device.name }, accessToken: accessToken(user), refreshToken };
}

app.decorate("authenticate", async (request, reply) => {
  await request.jwtVerify();
  const result = await pool.query("select id,display_name,is_admin,status from app_users where id=$1 and deleted_at is null", [request.user.sub]);
  if (!result.rows[0] || result.rows[0].status !== "active") return reply.code(403).send({ error: "Account access is unavailable." });
  const device = await upsertDevice(pool, request.user.sub, request);
  if (device.revokedAt) return reply.code(403).send({ error: "This device has been revoked." });
  request.device = device;
  request.account = result.rows[0];
  void pool.query("update app_users set last_active_at=now() where id=$1", [request.user.sub]);
});
app.decorate("requireAdmin", async (request, reply) => {
  await app.authenticate(request, reply);
  if (reply.sent) return;
  if (!request.account?.is_admin) return reply.code(403).send({ error: "Owner administration access required." });
});

async function recordOperationalEvent({ severity = "warning", source = "api", category, message, request, metadata = {} }) {
  try { await pool.query("insert into operational_events(severity,source,category,message,request_id,ip_address,metadata) values($1,$2,$3,$4,$5,$6,$7)", [severity, source, category, String(message).slice(0, 2000), request?.id ?? null, request?.ip ?? null, metadata]); } catch (error) { app.log.error({ err: error }, "Could not persist operational event"); }
}
app.addHook("onError", async (request, _reply, error) => recordOperationalEvent({ severity: "error", category: "request_error", message: error.message, request, metadata: { method: request.method, url: request.url, code: error.code } }));
app.addHook("onRequest", async (request) => { request.northStartedAt = performance.now(); });
app.addHook("preHandler", async (request, reply) => {
  if (["GET","HEAD","OPTIONS"].includes(request.method) || request.url.startsWith("/v1/admin") || request.url.startsWith("/v1/auth")) return;
  const setting = await pool.query("select value from system_settings where key='maintenance_mode'");
  if (setting.rows[0]?.value === true) return reply.code(503).send({ error: "North is briefly in maintenance mode. Your saved local data is safe; please try syncing again shortly." });
});
app.addHook("onResponse", async (request, reply) => {
  const duration = Math.max(0, performance.now() - (request.northStartedAt ?? performance.now()));
  void pool.query(`insert into api_request_logs(request_id,method,route,status_code,duration_ms,user_id,device_id,user_agent)
    values($1,$2,$3,$4,$5,$6,$7,$8)`, [request.id, request.method, request.routeOptions?.url ?? request.url.split("?")[0], reply.statusCode, duration, request.user?.sub ?? null, request.device?.id ?? null, String(request.headers["user-agent"] ?? "").slice(0, 300)]).catch((error) => app.log.error({ err: error }, "Could not persist request log"));
  if (reply.statusCode === 429 || ((reply.statusCode === 401 || reply.statusCode === 403) && request.url.startsWith("/v1/auth"))) await recordOperationalEvent({ severity: reply.statusCode === 429 ? "warning" : "info", category: reply.statusCode === 429 ? "rate_limit" : "auth_denied", message: `${request.method} ${request.url} returned ${reply.statusCode}`, request, metadata: { statusCode: reply.statusCode, userAgent: request.headers["user-agent"] } });
});

await pool.query("update app_users u set is_admin=true,status='active',updated_at=now() from local_credentials c where c.owner_user_id=u.id and c.username=$1 and u.deleted_at is null", [OWNER_USERNAME]);
app.get("/health", async () => ({ ok: true, service: "north-api" }));
app.get("/v1/config", async () => {
  const settings = await pool.query("select key,value from system_settings where key in ('registration_requires_code','maintenance_mode')");
  const values = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]));
  return { registrationRequiresCode: values.registration_requires_code === true, maintenanceMode: values.maintenance_mode === true };
});

app.post("/v1/auth/register", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
  const { username, password, displayName, timezone = "UTC", accessCode } = request.body ?? {};
  const normalizedUsername = String(username ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(normalizedUsername) || !password || password.length < 10 || !displayName) return reply.code(400).send({ error: "Choose a 3–30 character username, a name, and a password of at least 10 characters." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const requirement = await client.query("select value from system_settings where key='registration_requires_code'");
    if (requirement.rows[0]?.value === true) {
      const codeHash = accessCode ? sha256(String(accessCode).trim().toUpperCase()) : "";
      const validCode = await client.query(`select id from access_codes where code_hash=$1 and enabled=true and (expires_at is null or expires_at>now())
        and (max_uses is null or use_count<max_uses) for update`, [codeHash]);
      if (!validCode.rows[0]) { await client.query("rollback"); return reply.code(403).send({ error: "A valid North access code is required." }); }
      await client.query("update access_codes set use_count=use_count+1,updated_at=now() where id=$1", [validCode.rows[0].id]);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const recoveryCode = createRecoveryCode();
    const result = await client.query(
      `with created_user as (
        insert into app_users(display_name, timezone, is_admin) values($1,$2,$6) returning *
      ), credential as (
        insert into local_credentials(owner_user_id,username,password_hash,recovery_code_hash)
        select id,$3,$4,$5 from created_user
      ) select created_user.*, $3::text as username from created_user`,
      [displayName.trim(), timezone, normalizedUsername, passwordHash, sha256(recoveryCode), normalizedUsername === OWNER_USERNAME],
    );
    const session = await issueSession(client, result.rows[0], request);
    await client.query("commit");
    return reply.code(201).send({ ...session, recoveryCode });
  } catch (error) {
    await client.query("rollback");
    if (error.code === "23505") return reply.code(409).send({ error: "That username is already registered." });
    throw error;
  } finally { client.release(); }
});

app.post("/v1/auth/login", { config: { rateLimit: { max: 12, timeWindow: "15 minutes" } } }, async (request, reply) => {
  const { username, password } = request.body ?? {};
  const normalizedUsername = String(username ?? "").trim().toLowerCase();
  if (normalizedUsername === OWNER_USERNAME) await pool.query("update app_users u set is_admin=true,status='active',updated_at=now() from local_credentials c where c.owner_user_id=u.id and c.username=$1 and u.deleted_at is null", [OWNER_USERNAME]);
  const result = await pool.query(
    `select u.*, c.username, c.password_hash from local_credentials c
     join app_users u on u.id=c.owner_user_id where c.username=$1 and u.deleted_at is null`,
    [normalizedUsername],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password ?? ""), user.password_hash))) return reply.code(401).send({ error: "Invalid username or password." });
  const client = await pool.connect();
  try { return await issueSession(client, user, request); } finally { client.release(); }
});

app.post("/v1/auth/recover", { config: { rateLimit: { max: 6, timeWindow: "30 minutes" } } }, async (request, reply) => {
  const { username, recoveryCode, newPassword } = request.body ?? {};
  if (!recoveryCode || !newPassword || newPassword.length < 10) return reply.code(400).send({ error: "Recovery code and a new password of at least 10 characters are required." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select u.*, c.username, c.recovery_code_hash from local_credentials c join app_users u on u.id=c.owner_user_id
       where c.username=$1 and u.deleted_at is null for update`,
      [String(username ?? "").trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !crypto.timingSafeEqual(Buffer.from(sha256(String(recoveryCode).replace(/\s/g, "").toUpperCase())), Buffer.from(user.recovery_code_hash))) {
      await client.query("rollback");
      return reply.code(401).send({ error: "Username or recovery code is incorrect." });
    }
    const nextRecoveryCode = createRecoveryCode();
    await client.query("update local_credentials set password_hash=$1,recovery_code_hash=$2,updated_at=now() where owner_user_id=$3", [await bcrypt.hash(newPassword, 12), sha256(nextRecoveryCode), user.id]);
    await client.query("update refresh_tokens set revoked_at=now() where owner_user_id=$1 and revoked_at is null", [user.id]);
    const session = await issueSession(client, user, request);
    await client.query("commit");
    return { ...session, recoveryCode: nextRecoveryCode };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.post("/v1/auth/refresh", async (request, reply) => {
  const refreshToken = request.body?.refreshToken;
  if (!refreshToken) return reply.code(400).send({ error: "Refresh token required." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select u.*, c.username, t.id as refresh_id,t.device_id,
       (select d.revoked_at from devices d where d.id=t.device_id) as device_revoked_at from refresh_tokens t
       join app_users u on u.id=t.owner_user_id join local_credentials c on c.owner_user_id=u.id
       where t.token_hash=$1 and t.revoked_at is null and t.expires_at > now() and u.deleted_at is null
       and coalesce((select d.revoked_at is null from devices d where d.id=t.device_id),true) for update of t`,
      [sha256(refreshToken)],
    );
    if (!result.rows[0]) { await client.query("rollback"); return reply.code(401).send({ error: "Session expired." }); }
    if (result.rows[0].device_id && requestDevice(request).id !== result.rows[0].device_id) { await client.query("rollback"); return reply.code(401).send({ error: "Session belongs to another device." }); }
    await client.query("update refresh_tokens set revoked_at=now() where id=$1", [result.rows[0].refresh_id]);
    const session = await issueSession(client, result.rows[0], request);
    await client.query("commit");
    return session;
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/me", { preHandler: app.authenticate }, async (request, reply) => {
  const result = await pool.query(
    "select u.*, c.username from app_users u join local_credentials c on c.owner_user_id=u.id where u.id=$1 and u.deleted_at is null",
    [request.user.sub],
  );
  return result.rows[0] ? publicUser(result.rows[0]) : reply.code(404).send({ error: "Account not found." });
});

app.delete("/v1/me", { preHandler: app.authenticate }, async (request, reply) => {
  await pool.query("delete from app_users where id=$1", [request.user.sub]);
  return reply.code(204).send();
});

app.get("/v1/me/devices", { preHandler: app.authenticate }, async (request) => ({
  devices: (await pool.query(`select d.id,d.name,d.user_agent,d.last_ip,d.last_seen_at,d.created_at,d.revoked_at,
    count(t.id) filter(where t.revoked_at is null and t.expires_at>now())::int active_sessions
    from devices d left join refresh_tokens t on t.device_id=d.id where d.owner_user_id=$1 group by d.id order by d.last_seen_at desc`, [request.user.sub])).rows,
  currentDeviceId: request.device.id,
}));

app.delete("/v1/me/devices/:id", { preHandler: app.authenticate }, async (request, reply) => {
  const result = await pool.query("update devices set revoked_at=now() where id=$1 and owner_user_id=$2 and revoked_at is null returning id", [request.params.id, request.user.sub]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Device not found." });
  await pool.query("update refresh_tokens set revoked_at=now() where device_id=$1 and revoked_at is null", [request.params.id]);
  return reply.code(204).send();
});

const healthRecordTypes = new Set(["steps", "heart_rate", "sleep", "exercise", "distance", "active_calories", "weight"]);
const healthProviders = new Set(["health_connect", "apple_health"]);

app.get("/v1/health/connections", { preHandler: app.authenticate }, async (request) => ({
  connections: (await pool.query(`select provider,status,scopes,source_apps,last_sync_at,last_error,created_at,updated_at
    from health_connections where owner_user_id=$1 order by provider`, [request.user.sub])).rows,
}));

app.put("/v1/health/connections/:provider", { preHandler: app.authenticate }, async (request, reply) => {
  const provider = String(request.params.provider);
  const scopes = Array.isArray(request.body?.scopes) ? [...new Set(request.body.scopes.map(String))].slice(0, 30) : [];
  const sourceApps = Array.isArray(request.body?.sourceApps) ? [...new Set(request.body.sourceApps.map(String))].slice(0, 20) : [];
  const status = ["connected", "paused"].includes(request.body?.status) ? request.body.status : "connected";
  if (!healthProviders.has(provider)) return reply.code(400).send({ error: "Unsupported health provider." });
  const result = await pool.query(`insert into health_connections(owner_user_id,provider,device_id,status,scopes,source_apps)
    values($1,$2,$3,$4,$5,$6) on conflict(owner_user_id,provider) do update set device_id=$3,status=$4,scopes=$5,source_apps=$6,last_error=null,updated_at=now()
    returning provider,status,scopes,source_apps,last_sync_at,last_error,created_at,updated_at`, [request.user.sub, provider, request.device.id, status, JSON.stringify(scopes), JSON.stringify(sourceApps)]);
  return result.rows[0];
});

app.delete("/v1/health/connections/:provider", { preHandler: app.authenticate }, async (request, reply) => {
  if (!healthProviders.has(request.params.provider)) return reply.code(400).send({ error: "Unsupported health provider." });
  await pool.query("update health_connections set status='revoked',scopes='[]',last_error=null,updated_at=now() where owner_user_id=$1 and provider=$2", [request.user.sub, request.params.provider]);
  return reply.code(204).send();
});

app.post("/v1/health/import", { preHandler: app.authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
  const provider = String(request.body?.provider ?? "");
  const records = request.body?.records;
  if (!healthProviders.has(provider) || !Array.isArray(records) || records.length < 1 || records.length > 500) return reply.code(400).send({ error: "Provide 1–500 records for a supported provider." });
  const normalized = [];
  for (const item of records) {
    const startedAt = new Date(item.startedAt);
    const endedAt = new Date(item.endedAt);
    if (!item.externalRecordId || !healthRecordTypes.has(item.recordType) || !Number.isFinite(startedAt.valueOf()) || !Number.isFinite(endedAt.valueOf()) || endedAt < startedAt || typeof item.payload !== "object" || item.payload === null || Array.isArray(item.payload)) return reply.code(400).send({ error: "A health record is malformed." });
    const payload = JSON.stringify(item.payload);
    normalized.push({ externalRecordId: String(item.externalRecordId).slice(0, 300), recordType: item.recordType, sourceApp: String(item.sourceApp ?? "").slice(0, 200) || null, sourceDevice: String(item.sourceDevice ?? "").slice(0, 200) || null, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), payload, contentHash: sha256(`${item.recordType}:${startedAt.toISOString()}:${endedAt.toISOString()}:${payload}`) });
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    let imported = 0;
    for (const item of normalized) {
      const result = await client.query(`insert into health_records(owner_user_id,provider,external_record_id,record_type,source_app,source_device,started_at,ended_at,payload,content_hash)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(owner_user_id,provider,external_record_id) do update set record_type=$4,source_app=$5,source_device=$6,started_at=$7,ended_at=$8,payload=$9,content_hash=$10,updated_at=now()
        where health_records.content_hash<>excluded.content_hash returning id`, [request.user.sub, provider, item.externalRecordId, item.recordType, item.sourceApp, item.sourceDevice, item.startedAt, item.endedAt, item.payload, item.contentHash]);
      imported += result.rowCount;
    }
    await client.query(`insert into health_connections(owner_user_id,provider,device_id,status,scopes,last_sync_at)
      values($1,$2,$3,'connected','[]',now()) on conflict(owner_user_id,provider) do update set device_id=$3,status='connected',last_sync_at=now(),last_error=null,updated_at=now()`, [request.user.sub, provider, request.device.id]);
    await client.query("commit");
    return { accepted: records.length, imported, syncedAt: new Date().toISOString() };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/health/summary", { preHandler: app.authenticate }, async (request) => {
  const days = Math.min(90, Math.max(1, Number(request.query?.days ?? 7)));
  const result = await pool.query(`select record_type,count(*)::int records,min(started_at) first_record,max(ended_at) latest_record
    from health_records where owner_user_id=$1 and started_at>=now()-($2::text||' days')::interval group by record_type order by record_type`, [request.user.sub, days]);
  return { days, types: result.rows };
});

app.get("/v1/health/activities", { preHandler: app.authenticate }, async (request) => {
  const days = Math.min(90, Math.max(1, Number(request.query?.days ?? 30)));
  const result = await pool.query(`select e.external_record_id id,e.started_at,e.ended_at,e.source_app,e.source_device,
      e.payload->>'title' title,(e.payload->>'exerciseType')::int exercise_type,
      coalesce((select (d.payload->>'metres')::double precision from health_records d
        where d.owner_user_id=e.owner_user_id and d.provider=e.provider and d.record_type='distance'
          and d.started_at=e.started_at and d.ended_at=e.ended_at limit 1),0) distance_metres
    from health_records e where e.owner_user_id=$1 and e.record_type='exercise'
      and e.started_at>=now()-($2::text||' days')::interval order by e.started_at desc limit 200`, [request.user.sub, days]);
  return { days, activities: result.rows.map((item) => ({
    ...item,
    kind: item.exercise_type === 8 ? "bike" : item.exercise_type === 56 ? "run" : item.exercise_type === 79 ? "walk" : "workout",
    duration_minutes: Math.max(1, Math.round((new Date(item.ended_at) - new Date(item.started_at)) / 60000)),
  })) };
});

async function auditAdmin(request, action, targetUserId, reason, metadata = {}) {
  await pool.query("insert into admin_audit_events(actor_user_id,target_user_id,action,reason,ip_address,metadata) values($1,$2,$3,$4,$5,$6)", [request.user.sub, targetUserId ?? null, action, reason ?? null, request.ip, metadata]);
}

app.get("/v1/admin/overview", { preHandler: app.requireAdmin }, async () => {
  const [users, documents, conflicts, events] = await Promise.all([
    pool.query(`select count(*)::int total,count(*) filter(where status='active')::int active,count(*) filter(where status='suspended')::int suspended,count(*) filter(where created_at>now()-interval '7 days')::int new_7d,count(*) filter(where is_admin)::int admins from app_users where deleted_at is null`),
    pool.query("select count(*)::int documents,count(distinct owner_user_id)::int synced_users,max(updated_at) latest_sync from sync_documents"),
    pool.query("select count(*)::int conflicts from sync_conflicts where status='open'"),
    pool.query("select count(*)::int admin_actions from admin_audit_events where created_at>now()-interval '24 hours'"),
  ]);
  return { ...users.rows[0], ...documents.rows[0], ...conflicts.rows[0], ...events.rows[0], generatedAt: new Date().toISOString() };
});

app.get("/v1/admin/operations", { preHandler: app.requireAdmin }, async () => {
  const [database, migrations, accounts, sessions, content, conflicts, backups, events, requestMetrics, logs, jobs] = await Promise.all([
    pool.query(`select pg_database_size(current_database())::bigint database_bytes,
      (select count(*)::int from pg_stat_activity where datname=current_database()) connections,
      (select count(*)::int from information_schema.tables where table_schema='public') tables`),
    pool.query("select filename as version,applied_at from schema_migrations order by applied_at desc"),
    pool.query("select count(*)::int total,count(*) filter(where last_active_at>now()-interval '24 hours')::int active_24h from app_users where deleted_at is null"),
    pool.query(`select count(*) filter(where revoked_at is null and expires_at>now())::int active_sessions,
      (select count(*)::int from devices where revoked_at is null) active_devices,
      (select count(*)::int from devices where revoked_at is not null) revoked_devices from refresh_tokens`),
    pool.query("select count(*)::int total,count(*) filter(where status='published')::int published,count(*) filter(where status='draft')::int drafts from content_catalogue where deleted_at is null"),
    pool.query("select count(*) filter(where status='open')::int open,count(*) filter(where created_at>now()-interval '24 hours')::int last_24h from sync_conflicts"),
    pool.query("select id,filename,status,size_bytes,encrypted,verified_at,error_message,started_at,finished_at from backup_runs order by started_at desc limit 20"),
    pool.query("select id,severity,source,category,message,request_id,metadata,resolved_at,occurred_at from operational_events order by occurred_at desc limit 100"),
    pool.query(`select count(*)::int requests,count(*) filter(where status_code>=500)::int errors_5xx,count(*) filter(where status_code>=400)::int errors_4xx,
      round(avg(duration_ms),1) average_ms,round(percentile_cont(.95) within group(order by duration_ms)::numeric,1) p95_ms
      from api_request_logs where occurred_at>now()-interval '24 hours'`),
    pool.query("select id,request_id,method,route,status_code,duration_ms,user_id,occurred_at from api_request_logs order by occurred_at desc limit 100"),
    pool.query("select id,job_name,status,details,error_message,started_at,finished_at from job_runs order by started_at desc limit 50"),
  ]);
  const memory = process.memoryUsage();
  return { database: database.rows[0], migrations: migrations.rows, accounts: accounts.rows[0], sessions: sessions.rows[0], content: content.rows[0], conflicts: conflicts.rows[0], backups: backups.rows, events: events.rows, request_metrics: requestMetrics.rows[0], logs: logs.rows, jobs: jobs.rows, runtime: { node: process.version, uptime_seconds: Math.floor(process.uptime()), rss_bytes: memory.rss, heap_used_bytes: memory.heapUsed, pid: process.pid }, generated_at: new Date().toISOString() };
});

app.get("/v1/admin/operations/logs", { preHandler: app.requireAdmin }, async (request) => {
  const search = String(request.query?.search ?? "").trim();
  const status = String(request.query?.status ?? "all");
  const limit = Math.min(500, Math.max(20, Number(request.query?.limit ?? 100)));
  const result = await pool.query(`select l.id,l.request_id,l.method,l.route,l.status_code,l.duration_ms,l.user_id,l.device_id,l.user_agent,l.occurred_at,c.username
    from api_request_logs l left join local_credentials c on c.owner_user_id=l.user_id
    where ($1='' or l.route ilike '%'||$1||'%' or l.request_id ilike '%'||$1||'%' or c.username ilike '%'||$1||'%')
    and ($2='all' or ($2='errors' and l.status_code>=400) or ($2='slow' and l.duration_ms>=500) or l.status_code::text=$2)
    order by l.occurred_at desc limit $3`, [search, status, limit]);
  return { logs: result.rows };
});

app.post("/v1/admin/operations/events/:id/resolve", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A resolution note is required." });
  const result = await pool.query("update operational_events set resolved_at=now(),resolved_by=$1 where id=$2 and resolved_at is null returning id", [request.user.sub, request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Open event not found." });
  await auditAdmin(request, "operational_event.resolve", null, reason, { eventId: request.params.id });
  return { resolved: true };
});

app.get("/v1/admin/users/:id/export", { preHandler: app.requireAdmin }, async (request, reply) => {
  const user = await pool.query("select u.id,u.display_name,u.timezone,u.status,u.created_at,u.updated_at,c.username from app_users u join local_credentials c on c.owner_user_id=u.id where u.id=$1 and u.deleted_at is null", [request.params.id]);
  if (!user.rows[0]) return reply.code(404).send({ error: "User not found." });
  const [documents, workouts, activities, devices] = await Promise.all([
    pool.query("select document_key,collection,data,version,created_at,updated_at,deleted_at from sync_documents where owner_user_id=$1 order by updated_at", [request.params.id]),
    pool.query("select * from workout_sessions where owner_user_id=$1 order by session_date", [request.params.id]),
    pool.query("select * from activities where owner_user_id=$1 order by activity_date", [request.params.id]),
    pool.query("select id,name,last_seen_at,created_at,revoked_at from devices where owner_user_id=$1 order by created_at", [request.params.id]),
  ]);
  await auditAdmin(request, "user.export", request.params.id, "Owner requested a user data export");
  reply.header("content-disposition", `attachment; filename="north-${user.rows[0].username}-export.json"`);
  return { exported_at: new Date().toISOString(), user: user.rows[0], documents: documents.rows, workouts: workouts.rows, activities: activities.rows, devices: devices.rows };
});

app.get("/v1/admin/audit/export", { preHandler: app.requireAdmin }, async (request, reply) => {
  const rows = (await pool.query(`select e.created_at,e.action,e.reason,e.ip_address,a.display_name actor,t.display_name target,e.metadata
    from admin_audit_events e left join app_users a on a.id=e.actor_user_id left join app_users t on t.id=e.target_user_id order by e.created_at desc`)).rows;
  const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
  const csv = ["created_at,action,actor,target,reason,ip_address,metadata", ...rows.map((row) => [row.created_at.toISOString(),row.action,row.actor,row.target,row.reason,row.ip_address,JSON.stringify(row.metadata)].map(quote).join(","))].join("\n");
  await auditAdmin(request, "audit.export", null, "Owner requested an audit export", { rows: rows.length });
  reply.type("text/csv").header("content-disposition", "attachment; filename=North-admin-audit.csv");
  return csv;
});

app.get("/v1/admin/users", { preHandler: app.requireAdmin }, async (request) => {
  const search = String(request.query?.search ?? "").trim();
  const status = String(request.query?.status ?? "all");
  const page = Math.max(1, Number(request.query?.page ?? 1));
  const limit = Math.min(100, Math.max(10, Number(request.query?.limit ?? 25)));
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `select u.id,c.username,u.display_name,u.status,u.is_admin,u.created_at,u.last_active_at,
      count(distinct d.document_key)::int document_count,count(distinct t.id) filter(where t.revoked_at is null and t.expires_at>now())::int active_sessions,
      count(*) over()::int total_count
     from app_users u join local_credentials c on c.owner_user_id=u.id
     left join sync_documents d on d.owner_user_id=u.id left join refresh_tokens t on t.owner_user_id=u.id
     where u.deleted_at is null and ($1='' or c.username ilike '%'||$1||'%' or u.display_name ilike '%'||$1||'%' or u.id::text=$1)
       and ($2='all' or u.status=$2)
     group by u.id,c.username order by u.created_at desc limit $3 offset $4`, [search, status, limit, offset],
  );
  return { users: result.rows, page, limit, total: result.rows[0]?.total_count ?? 0 };
});

app.get("/v1/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const result = await pool.query(
    `select u.id,c.username,u.display_name,u.timezone,u.status,u.is_admin,u.created_at,u.updated_at,u.last_active_at,
      (select count(*)::int from sync_documents d where d.owner_user_id=u.id and d.deleted_at is null) document_count,
      (select count(*)::int from workout_sessions w where w.owner_user_id=u.id and w.deleted_at is null) workout_count,
      (select count(*)::int from activities a where a.owner_user_id=u.id and a.deleted_at is null) activity_count,
      (select count(*)::int from refresh_tokens t where t.owner_user_id=u.id and t.revoked_at is null and t.expires_at>now()) active_sessions
     from app_users u join local_credentials c on c.owner_user_id=u.id where u.id=$1 and u.deleted_at is null`, [request.params.id],
  );
  if (!result.rows[0]) return reply.code(404).send({ error: "User not found." });
  const [documents, devices, audit, supportNotes] = await Promise.all([
    pool.query("select document_key,collection,version,updated_at,deleted_at from sync_documents where owner_user_id=$1 order by updated_at desc", [request.params.id]),
    pool.query("select id,name,user_agent,last_ip,last_seen_at,created_at,revoked_at from devices where owner_user_id=$1 order by last_seen_at desc", [request.params.id]),
    pool.query("select id,action,reason,created_at,metadata from admin_audit_events where target_user_id=$1 order by created_at desc limit 50", [request.params.id]),
    pool.query(`select n.id,n.note,n.created_at,n.updated_at,a.display_name author_name from support_notes n
      left join app_users a on a.id=n.author_user_id where n.owner_user_id=$1 and n.deleted_at is null order by n.created_at desc`, [request.params.id]),
  ]);
  return { user: result.rows[0], documents: documents.rows, devices: devices.rows, audit: audit.rows, supportNotes: supportNotes.rows };
});

app.post("/v1/admin/users/:id/support-notes", { preHandler: app.requireAdmin }, async (request, reply) => {
  const note = String(request.body?.note ?? "").trim();
  if (note.length < 2 || note.length > 5000) return reply.code(400).send({ error: "Support notes must be 2–5000 characters." });
  const exists = await pool.query("select id from app_users where id=$1 and deleted_at is null", [request.params.id]);
  if (!exists.rows[0]) return reply.code(404).send({ error: "User not found." });
  const result = await pool.query("insert into support_notes(owner_user_id,author_user_id,note) values($1,$2,$3) returning id,note,created_at,updated_at", [request.params.id, request.user.sub, note]);
  await auditAdmin(request, "support_note.create", request.params.id, "Owner added a private support note", { noteId: result.rows[0].id });
  return reply.code(201).send(result.rows[0]);
});

app.delete("/v1/admin/users/:userId/support-notes/:noteId", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A deletion reason is required." });
  const result = await pool.query("update support_notes set deleted_at=now(),updated_at=now() where id=$1 and owner_user_id=$2 and deleted_at is null returning id", [request.params.noteId, request.params.userId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Support note not found." });
  await auditAdmin(request, "support_note.delete", request.params.userId, reason, { noteId: request.params.noteId });
  return reply.code(204).send();
});

app.get("/v1/admin/duplicate-reviews", { preHandler: app.requireAdmin }, async () => {
  const [candidates, reviews] = await Promise.all([
    pool.query(`select a.id primary_user_id,b.id duplicate_user_id,ca.username primary_username,cb.username duplicate_username,
      a.display_name primary_name,b.display_name duplicate_name,a.created_at primary_created,b.created_at duplicate_created,
      (select count(*)::int from sync_documents where owner_user_id=a.id) primary_documents,
      (select count(*)::int from sync_documents where owner_user_id=b.id) duplicate_documents
      from app_users a join app_users b on a.id<b.id join local_credentials ca on ca.owner_user_id=a.id join local_credentials cb on cb.owner_user_id=b.id
      where a.deleted_at is null and b.deleted_at is null and regexp_replace(lower(a.display_name),'[^a-z0-9]','','g')=regexp_replace(lower(b.display_name),'[^a-z0-9]','','g')
      and not exists(select 1 from duplicate_merge_reviews r where r.primary_user_id=a.id and r.duplicate_user_id=b.id and r.status in ('pending','completed')) order by a.created_at`),
    pool.query(`select r.*,a.display_name primary_name,ca.username primary_username,b.display_name duplicate_name,cb.username duplicate_username,x.display_name reviewer_name
      from duplicate_merge_reviews r join app_users a on a.id=r.primary_user_id join local_credentials ca on ca.owner_user_id=a.id
      join app_users b on b.id=r.duplicate_user_id join local_credentials cb on cb.owner_user_id=b.id left join app_users x on x.id=r.reviewed_by order by r.created_at desc`),
  ]);
  return { candidates: candidates.rows, reviews: reviews.rows };
});

app.post("/v1/admin/duplicate-reviews", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { primaryUserId, duplicateUserId, reason } = request.body ?? {};
  if (!primaryUserId || !duplicateUserId || primaryUserId === duplicateUserId || !reason?.trim()) return reply.code(400).send({ error: "Two different accounts and a review reason are required." });
  const accounts = await pool.query(`select u.id,u.display_name,c.username,u.created_at,(select count(*) from sync_documents d where d.owner_user_id=u.id) documents
    from app_users u join local_credentials c on c.owner_user_id=u.id where u.id=any($1::uuid[]) and u.deleted_at is null`, [[primaryUserId, duplicateUserId]]);
  if (accounts.rowCount !== 2) return reply.code(404).send({ error: "Both accounts must exist." });
  const overlaps = await pool.query(`select a.document_key from sync_documents a join sync_documents b on b.document_key=a.document_key
    where a.owner_user_id=$1 and b.owner_user_id=$2 and a.deleted_at is null and b.deleted_at is null`, [primaryUserId, duplicateUserId]);
  const evidence = { accounts: accounts.rows, overlappingDocuments: overlaps.rows.map((row) => row.document_key), requestedReason: reason };
  const result = await pool.query(`insert into duplicate_merge_reviews(primary_user_id,duplicate_user_id,evidence,requested_by)
    values($1,$2,$3,$4) on conflict(primary_user_id,duplicate_user_id) do update set status='pending',evidence=excluded.evidence,requested_by=excluded.requested_by,created_at=now(),reviewed_at=null returning *`, [primaryUserId, duplicateUserId, evidence, request.user.sub]);
  await auditAdmin(request, "duplicate_review.create", primaryUserId, reason, { reviewId: result.rows[0].id, duplicateUserId });
  return reply.code(201).send(result.rows[0]);
});

app.patch("/v1/admin/duplicate-reviews/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { decision, reason } = request.body ?? {};
  if (!["approved","rejected"].includes(decision) || !reason?.trim()) return reply.code(400).send({ error: "An approved/rejected decision and reason are required." });
  const result = await pool.query("update duplicate_merge_reviews set status=$1,reviewed_by=$2,review_reason=$3,reviewed_at=now() where id=$4 and status='pending' returning *", [decision, request.user.sub, reason, request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Pending review not found." });
  await auditAdmin(request, `duplicate_review.${decision}`, result.rows[0].primary_user_id, reason, { reviewId: request.params.id, duplicateUserId: result.rows[0].duplicate_user_id });
  return result.rows[0];
});

app.patch("/v1/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { displayName, status, isAdmin, reason } = request.body ?? {};
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const targetCredential = await pool.query("select username from local_credentials where owner_user_id=$1", [request.params.id]);
  if (targetCredential.rows[0]?.username === OWNER_USERNAME && (status === "suspended" || isAdmin === false)) return reply.code(400).send({ error: `The canonical owner @${OWNER_USERNAME} cannot be suspended or demoted.` });
  if (request.params.id === request.user.sub && (status === "suspended" || isAdmin === false)) return reply.code(400).send({ error: "The active owner cannot suspend or demote their own session." });
  const before = await pool.query("select display_name,status,is_admin from app_users where id=$1 and deleted_at is null", [request.params.id]);
  if (!before.rows[0]) return reply.code(404).send({ error: "User not found." });
  const updated = await pool.query("update app_users set display_name=coalesce($1,display_name),status=coalesce($2,status),is_admin=coalesce($3,is_admin),updated_at=now() where id=$4 returning id,display_name,status,is_admin", [displayName ?? null, status ?? null, typeof isAdmin === "boolean" ? isAdmin : null, request.params.id]);
  if (status === "suspended") await pool.query("update refresh_tokens set revoked_at=now() where owner_user_id=$1 and revoked_at is null", [request.params.id]);
  await auditAdmin(request, "user.update", request.params.id, reason, { before: before.rows[0], after: updated.rows[0] });
  return updated.rows[0];
});

app.post("/v1/admin/users/:id/revoke-sessions", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const result = await pool.query("update refresh_tokens set revoked_at=now() where owner_user_id=$1 and revoked_at is null returning id", [request.params.id]);
  await auditAdmin(request, "sessions.revoke_all", request.params.id, reason, { revoked: result.rowCount });
  return { revoked: result.rowCount };
});

app.post("/v1/admin/users/:userId/devices/:deviceId/revoke", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const result = await pool.query("update devices set revoked_at=now() where id=$1 and owner_user_id=$2 and revoked_at is null returning id,name", [request.params.deviceId, request.params.userId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Active device not found." });
  await pool.query("update refresh_tokens set revoked_at=now() where device_id=$1 and revoked_at is null", [request.params.deviceId]);
  await auditAdmin(request, "device.revoke", request.params.userId, reason, { deviceId: request.params.deviceId, name: result.rows[0].name });
  return { revoked: true };
});

app.post("/v1/admin/users/:id/recovery-code", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const recoveryCode = createRecoveryCode();
  const result = await pool.query("update local_credentials set recovery_code_hash=$1,updated_at=now() where owner_user_id=$2 returning owner_user_id", [sha256(recoveryCode), request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "User not found." });
  await pool.query("update refresh_tokens set revoked_at=now() where owner_user_id=$1 and revoked_at is null", [request.params.id]);
  await auditAdmin(request, "recovery.rotate", request.params.id, reason);
  return { recoveryCode, shownOnce: true };
});

app.delete("/v1/admin/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const targetCredential = await pool.query("select username from local_credentials where owner_user_id=$1", [request.params.id]);
  if (targetCredential.rows[0]?.username === OWNER_USERNAME) return reply.code(400).send({ error: `The canonical owner @${OWNER_USERNAME} cannot be deleted.` });
  if (request.params.id === request.user.sub) return reply.code(400).send({ error: "The active owner cannot delete their own account here." });
  await auditAdmin(request, "user.delete", request.params.id, reason);
  const result = await pool.query("delete from app_users where id=$1 returning id", [request.params.id]);
  return result.rows[0] ? reply.code(204).send() : reply.code(404).send({ error: "User not found." });
});

app.get("/v1/admin/audit", { preHandler: app.requireAdmin }, async (request) => {
  const limit = Math.min(200, Math.max(20, Number(request.query?.limit ?? 100)));
  const result = await pool.query(`select e.id,e.action,e.reason,e.ip_address,e.metadata,e.created_at,a.display_name actor_name,t.display_name target_name
    from admin_audit_events e left join app_users a on a.id=e.actor_user_id left join app_users t on t.id=e.target_user_id order by e.created_at desc limit $1`, [limit]);
  return { events: result.rows };
});

app.get("/v1/admin/conflicts", { preHandler: app.requireAdmin }, async (request) => {
  const status = String(request.query?.status ?? "open");
  const result = await pool.query(`select c.id,c.document_key,c.collection,c.base_version,c.remote_version,c.status,c.created_at,c.resolved_at,
    u.display_name,cx.username,d.name device_name from sync_conflicts c join app_users u on u.id=c.owner_user_id
    join local_credentials cx on cx.owner_user_id=u.id left join devices d on d.id=c.device_id
    where ($1='all' or c.status=$1) order by c.created_at desc limit 200`, [status]);
  return { conflicts: result.rows };
});

app.post("/v1/admin/conflicts/:id/resolve", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { choice, reason } = request.body ?? {};
  if (!reason?.trim() || !["local", "remote", "dismiss"].includes(choice)) return reply.code(400).send({ error: "Choice and reason are required." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const found = await client.query("select * from sync_conflicts where id=$1 and status='open' for update", [request.params.id]);
    const conflict = found.rows[0];
    if (!conflict) { await client.query("rollback"); return reply.code(404).send({ error: "Open conflict not found." }); }
    if (choice === "local") await client.query("update sync_documents set data=$1,version=version+1,updated_at=now(),deleted_at=null where owner_user_id=$2 and document_key=$3", [conflict.local_data, conflict.owner_user_id, conflict.document_key]);
    const status = choice === "local" ? "kept_local" : choice === "remote" ? "kept_remote" : "dismissed";
    await client.query("update sync_conflicts set status=$1,resolved_by=$2,resolved_at=now() where id=$3", [status, request.user.sub, request.params.id]);
    await client.query("commit");
    await auditAdmin(request, "sync_conflict.resolve", conflict.owner_user_id, reason, { conflictId: conflict.id, documentKey: conflict.document_key, choice });
    return { resolved: true, status };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/admin/codes", { preHandler: app.requireAdmin }, async () => ({ codes: (await pool.query("select id,code_prefix,label,max_uses,use_count,expires_at,enabled,notes,created_at,updated_at from access_codes order by created_at desc")).rows }));
app.post("/v1/admin/codes", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { label, maxUses, expiresAt, notes } = request.body ?? {};
  if (!label?.trim()) return reply.code(400).send({ error: "A label is required." });
  const code = `NORTH-${crypto.randomBytes(16).toString("hex").toUpperCase()}`;
  const result = await pool.query("insert into access_codes(code_hash,code_prefix,label,max_uses,expires_at,notes,created_by) values($1,$2,$3,$4,$5,$6,$7) returning id,label,max_uses,expires_at,enabled,created_at", [sha256(code), code.slice(0, 13), label.trim(), maxUses || null, expiresAt || null, notes || null, request.user.sub]);
  await auditAdmin(request, "access_code.create", null, null, { codeId: result.rows[0].id, label });
  return reply.code(201).send({ ...result.rows[0], code, shownOnce: true });
});
app.patch("/v1/admin/codes/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { enabled, label, expiresAt, maxUses, notes, reason } = request.body ?? {};
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const result = await pool.query("update access_codes set enabled=coalesce($1,enabled),label=coalesce($2,label),expires_at=coalesce($3,expires_at),max_uses=coalesce($4,max_uses),notes=coalesce($5,notes),updated_at=now() where id=$6 returning id,code_prefix,label,max_uses,use_count,expires_at,enabled,notes,updated_at", [typeof enabled === "boolean" ? enabled : null, label ?? null, expiresAt ?? null, maxUses ?? null, notes ?? null, request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Code not found." });
  await auditAdmin(request, "access_code.update", null, reason, { codeId: request.params.id });
  return result.rows[0];
});

app.get("/v1/admin/settings", { preHandler: app.requireAdmin }, async () => ({ settings: (await pool.query("select key,value,description,updated_at from system_settings order by key")).rows }));
app.put("/v1/admin/settings/:key", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { value, reason } = request.body ?? {};
  if (!reason?.trim()) return reply.code(400).send({ error: "A reason is required." });
  const result = await pool.query("update system_settings set value=$1,updated_by=$2,updated_at=now() where key=$3 returning key,value,description,updated_at", [value, request.user.sub, request.params.key]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Setting not found." });
  await auditAdmin(request, "setting.update", null, reason, { key: request.params.key, value });
  return result.rows[0];
});

const contentKinds = new Set(["exercise", "workout", "program", "milestone", "announcement"]);
app.get("/v1/content", async (request, reply) => {
  const kind = request.query?.kind ? String(request.query.kind) : null;
  if (kind && !contentKinds.has(kind)) return reply.code(400).send({ error: "Unknown content type." });
  const result = await pool.query(`select id,kind,slug,title,summary,version,payload,published_at,updated_at
    from content_catalogue where deleted_at is null and status='published' and ($1::text is null or kind=$1)
    order by kind,title`, [kind]);
  reply.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return { items: result.rows };
});
app.get("/v1/admin/content", { preHandler: app.requireAdmin }, async (request, reply) => {
  const kind = String(request.query?.kind ?? "exercise");
  const status = String(request.query?.status ?? "all");
  const search = String(request.query?.search ?? "").trim();
  if (!contentKinds.has(kind)) return reply.code(400).send({ error: "Unknown content type." });
  const result = await pool.query(`select id,kind,slug,title,summary,status,version,payload,published_at,created_at,updated_at
    from content_catalogue where deleted_at is null and kind=$1 and ($2='all' or status=$2)
    and ($3='' or title ilike '%'||$3||'%' or slug ilike '%'||$3||'%' or summary ilike '%'||$3||'%')
    order by updated_at desc limit 500`, [kind, status, search]);
  return { items: result.rows };
});

app.post("/v1/admin/content/import", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { items, reason } = request.body ?? {};
  if (!Array.isArray(items) || items.length < 1 || items.length > 1500 || !reason?.trim()) return reply.code(400).send({ error: "Provide 1–1500 catalogue items and an import reason." });
  const invalid = items.find((item) => !contentKinds.has(item?.kind) || !item?.title?.trim() || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(String(item?.slug ?? "")));
  if (invalid) return reply.code(400).send({ error: "Every item needs a valid type, title, and URL-safe slug." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    let created = 0; let updated = 0;
    for (const item of items) {
      const result = await client.query(`insert into content_catalogue(kind,slug,title,summary,status,payload,created_by,updated_by,published_at)
        values($1,$2,$3,$4,$5,$6,$7,$7,case when $5='published' then now() end)
        on conflict(kind,slug) do update set title=excluded.title,summary=excluded.summary,payload=excluded.payload,updated_by=excluded.updated_by,
        updated_at=now(),version=content_catalogue.version+1 returning *, (xmax=0) inserted`,
        [item.kind, item.slug, item.title.trim(), String(item.summary ?? ""), item.status ?? "draft", item.payload ?? {}, request.user.sub]);
      const row = result.rows[0]; if (row.inserted) created += 1; else updated += 1;
      await client.query(`insert into content_catalogue_versions(content_id,version,snapshot,changed_by,change_reason) values($1,$2,$3,$4,$5)
        on conflict(content_id,version) do nothing`, [row.id, row.version, row, request.user.sub, reason]);
    }
    await client.query("commit");
    await auditAdmin(request, "content.bulk_import", null, reason, { count: items.length, created, updated });
    return { imported: items.length, created, updated };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.post("/v1/admin/content", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { kind, slug, title, summary = "", status = "draft", payload = {}, reason } = request.body ?? {};
  if (!contentKinds.has(kind) || !title?.trim() || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(String(slug ?? "")) || !reason?.trim()) return reply.code(400).send({ error: "Type, title, URL-safe slug, and reason are required." });
  const result = await pool.query(`insert into content_catalogue(kind,slug,title,summary,status,payload,created_by,updated_by,published_at)
    values($1,$2,$3,$4,$5,$6,$7,$7,case when $5='published' then now() end) returning *`, [kind, slug, title.trim(), summary.trim(), status, payload, request.user.sub]);
  await pool.query("insert into content_catalogue_versions(content_id,version,snapshot,changed_by,change_reason) values($1,1,$2,$3,$4)", [result.rows[0].id, result.rows[0], request.user.sub, reason]);
  await auditAdmin(request, "content.create", null, reason, { contentId: result.rows[0].id, kind, slug });
  return reply.code(201).send(result.rows[0]);
});

app.patch("/v1/admin/content/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const { title, summary, status, payload, reason } = request.body ?? {};
  if (!reason?.trim()) return reply.code(400).send({ error: "A change reason is required." });
  if (status && !["draft", "published", "archived"].includes(status)) return reply.code(400).send({ error: "Invalid publication status." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const before = await client.query("select * from content_catalogue where id=$1 and deleted_at is null for update", [request.params.id]);
    if (!before.rows[0]) { await client.query("rollback"); return reply.code(404).send({ error: "Content item not found." }); }
    const next = await client.query(`update content_catalogue set title=coalesce($1,title),summary=coalesce($2,summary),status=coalesce($3,status),payload=coalesce($4,payload),
      version=version+1,updated_by=$5,updated_at=now(),published_at=case when $3='published' then coalesce(published_at,now()) else published_at end where id=$6 returning *`,
      [title ?? null, summary ?? null, status ?? null, payload ?? null, request.user.sub, request.params.id]);
    await client.query("insert into content_catalogue_versions(content_id,version,snapshot,changed_by,change_reason) values($1,$2,$3,$4,$5)", [request.params.id, next.rows[0].version, next.rows[0], request.user.sub, reason]);
    await client.query("commit");
    await auditAdmin(request, "content.update", null, reason, { contentId: request.params.id, kind: next.rows[0].kind, version: next.rows[0].version });
    return next.rows[0];
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.delete("/v1/admin/content/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
  const reason = request.body?.reason;
  if (!reason?.trim()) return reply.code(400).send({ error: "A deletion reason is required." });
  const result = await pool.query("update content_catalogue set deleted_at=now(),updated_by=$1,updated_at=now() where id=$2 and deleted_at is null returning id,kind,slug", [request.user.sub, request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Content item not found." });
  await auditAdmin(request, "content.delete", null, reason, result.rows[0]);
  return reply.code(204).send();
});

app.post("/v1/sync/mutations", { preHandler: app.authenticate }, async (request, reply) => {
  const idempotencyKey = request.headers["idempotency-key"];
  const mutation = request.body ?? {};
  if (!idempotencyKey || !mutation.documentKey || !mutation.collection || !["put", "delete"].includes(mutation.operation)) return reply.code(400).send({ error: "Invalid mutation." });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const previous = await client.query("select response from document_mutations where owner_user_id=$1 and idempotency_key=$2", [request.user.sub, idempotencyKey]);
    if (previous.rows[0]) { await client.query("commit"); return previous.rows[0].response; }
    const current = await client.query("select * from sync_documents where owner_user_id=$1 and document_key=$2 for update", [request.user.sub, mutation.documentKey]);
    const remote = current.rows[0];
    if (remote && Number(mutation.baseVersion ?? 0) !== Number(remote.version)) {
      const conflict = await client.query(`insert into sync_conflicts(owner_user_id,device_id,document_key,collection,base_version,remote_version,local_data,remote_data)
        values($1,$2,$3,$4,$5,$6,$7,$8) returning id`, [request.user.sub, request.device?.id ?? null, mutation.documentKey, mutation.collection, Number(mutation.baseVersion ?? 0), Number(remote.version), mutation.data ?? null, remote.data]);
      await client.query("commit");
      return reply.code(409).send({ status: "conflict", conflictId: conflict.rows[0].id, remote: mapDocument(remote) });
    }
    const result = await client.query(
      `insert into sync_documents(owner_user_id,document_key,collection,data,version,deleted_at)
       values($1,$2,$3,$4,1,case when $5='delete' then now() else null end)
       on conflict(owner_user_id,document_key) do update set collection=excluded.collection,data=excluded.data,
       version=sync_documents.version+1,updated_at=now(),deleted_at=excluded.deleted_at returning *`,
      [request.user.sub, mutation.documentKey, mutation.collection, mutation.operation === "delete" ? null : mutation.data, mutation.operation],
    );
    const response = { status: "applied", document: mapDocument(result.rows[0]) };
    await client.query("insert into document_mutations(owner_user_id,idempotency_key,response) values($1,$2,$3)", [request.user.sub, idempotencyKey, response]);
    await client.query("commit");
    return response;
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.post("/v1/sync/conflicts/:id/resolve", { preHandler: app.authenticate }, async (request, reply) => {
  const choice = request.body?.choice;
  if (!["local","remote"].includes(choice)) return reply.code(400).send({ error: "Choose the device or server version." });
  const status = choice === "local" ? "kept_local" : "kept_remote";
  const result = await pool.query("update sync_conflicts set status=$1,resolved_by=$2,resolved_at=now() where id=$3 and owner_user_id=$2 and status='open' returning id", [status, request.user.sub, request.params.id]);
  if (!result.rows[0]) return reply.code(404).send({ error: "Open conflict not found." });
  return { resolved: true, status };
});

app.get("/v1/sync/documents", { preHandler: app.authenticate }, async (request) => {
  const since = request.query?.since || "1970-01-01T00:00:00.000Z";
  const result = await pool.query("select * from sync_documents where owner_user_id=$1 and updated_at > $2 order by updated_at", [request.user.sub, since]);
  return { documents: result.rows.map(mapDocument), serverTime: new Date().toISOString() };
});

function mapDocument(row) {
  return { key: row.document_key, collection: row.collection, id: row.document_key.split(":").slice(1).join(":"), data: row.data, version: Number(row.version), updatedAt: row.updated_at, deletedAt: row.deleted_at };
}

app.addHook("onClose", async () => pool.end());
await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? "127.0.0.1" });
