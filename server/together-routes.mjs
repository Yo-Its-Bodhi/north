import { workoutSnapshot } from "./community-routes.mjs";
import webpush from "web-push";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const usernamePattern = /^[a-z0-9][a-z0-9_-]{2,29}$/i;
const roomKinds = new Set(["direct", "general", "help", "updates", "trainer"]);
const reportCategories = new Set(["spam", "harassment", "unsafe", "impersonation", "privacy", "other"]);
const preferenceFields = ["direct_messages", "room_messages", "trainer_messages", "feature_announcements", "release_announcements", "incident_notices", "service_notices", "security_notices", "preview_message_text", "sounds", "read_receipts", "typing_indicators", "presence"];
const pushPreferenceByRoom = { direct: "direct_messages", general: "room_messages", help: "room_messages", trainer: "trainer_messages" };
const pushPreferenceByAnnouncement = { feature: "feature_announcements", release: "release_announcements", incident: "incident_notices", service: "service_notices", security: "security_notices" };
const ownerUsername = String(process.env.NORTH_OWNER_USERNAME || "druwbi").trim().toLowerCase();

const cleanText = (value, maximum) => String(value ?? "").trim().slice(0, maximum);
export const togetherPushPayload = ({ title, preview, previewMessageText, roomId = null, url = "/?open=together" }) => ({
  title,
  body: previewMessageText && preview ? preview.slice(0, 160) : "Open North to view this update.",
  url: roomId ? `/?open=together&room=${encodeURIComponent(roomId)}` : url,
});
const cleanAudience = (value) => value?.kind === "users" && Array.isArray(value.userIds) && value.userIds.length > 0 && value.userIds.length <= 500 && value.userIds.every((id) => uuidPattern.test(String(id)))
  ? { kind: "users", userIds: [...new Set(value.userIds.map(String))] }
  : value?.kind === "all" ? { kind: "all" } : null;
const sharedCardSnapshot = (kind, value) => {
  const title = cleanText(value?.title, 80);
  const detail = cleanText(value?.detail, 500);
  return title && detail ? { type: kind, title, detail } : null;
};
const sharedPhotoSnapshot = (value) => {
  const card = sharedCardSnapshot("photo", value);
  const imageDataUrl = String(value?.imageDataUrl ?? "");
  return card && imageDataUrl.length <= 700_000 && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(imageDataUrl) ? { ...card, imageDataUrl } : null;
};

function encodeCursor(row) {
  return Buffer.from(`${new Date(row.created_at).toISOString()}|${row.id}`).toString("base64url");
}

function decodeCursor(value) {
  try {
    const [createdAt, id] = Buffer.from(String(value ?? ""), "base64url").toString("utf8").split("|");
    if (!createdAt || Number.isNaN(Date.parse(createdAt)) || !uuidPattern.test(id)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function mapPerson(row, prefix = "") {
  const id = row[`${prefix}id`];
  return id ? { id, username: row[`${prefix}username`], displayName: row[`${prefix}display_name`] } : null;
}

function mapRoom(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.kind === "direct" && row.peer_display_name ? row.peer_display_name : row.name,
    kind: row.kind,
    connectionId: row.connection_id,
    description: row.description,
    role: row.role,
    status: row.member_status,
    notificationLevel: row.notification_level,
    mutedUntil: row.muted_until,
    peer: mapPerson(row, "peer_"),
    latestMessage: row.latest_message_id ? {
      id: row.latest_message_id,
      senderUserId: row.latest_sender_user_id,
      kind: row.latest_kind,
      body: row.latest_removed_at ? "Message removed" : row.latest_body,
      createdAt: row.latest_created_at,
    } : null,
    unreadCount: Number(row.unread_count ?? 0),
    lastMessageAt: row.last_message_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    clientMessageId: row.client_message_id,
    sender: mapPerson(row, "sender_"),
    kind: row.kind,
    body: row.removed_at ? "Message removed" : row.body,
    sharedPayload: row.removed_at ? null : row.shared_payload,
    replyToMessageId: row.reply_to_message_id,
    removedAt: row.removed_at,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
  };
}

function mapAccountMessage(row, request) {
  return mapMessage({
    ...row,
    sender_id: request.user.sub,
    sender_username: request.user.username,
    sender_display_name: request.account?.display_name,
  });
}

async function ensureCuratedMemberships(pool, ownerUserId) {
  await pool.query(`insert into together_room_members(room_id,owner_user_id,role,status)
    select id,$1,'member','active' from together_rooms
    where kind in ('general','help','updates') and status='active'
    on conflict(room_id,owner_user_id) do nothing`, [ownerUserId]);
}

async function findRoomAccess(pool, roomId, ownerUserId) {
  const result = await pool.query(`select r.*,rm.role,rm.status member_status,rm.notification_level,rm.muted_until,rm.last_posted_at
    from together_rooms r join together_room_members rm on rm.room_id=r.id
    where r.id=$1 and rm.owner_user_id=$2 and rm.status='active' and r.status='active'
    and (r.kind<>'direct' or exists(select 1 from together_connections connection where connection.id=r.connection_id and connection.status='accepted'))`, [roomId, ownerUserId]);
  return result.rows[0] ?? null;
}

async function findRoomModerator(pool, roomId, ownerUserId, isAdmin) {
  const access = await findRoomAccess(pool, roomId, ownerUserId);
  return access && ["general", "help"].includes(access.kind) && (isAdmin || access.role === "moderator") ? access : null;
}

async function findActiveUser(pool, username) {
  const result = await pool.query(`select u.id,u.display_name,c.username from app_users u
    join local_credentials c on c.owner_user_id=u.id
    where c.username=$1 and u.status='active' and u.deleted_at is null`, [username]);
  return result.rows[0] ?? null;
}

async function isCanonicalOwner(pool, ownerUserId) {
  const result = await pool.query("select 1 from local_credentials where owner_user_id=$1 and username=$2", [ownerUserId, ownerUsername]);
  return Boolean(result.rows[0]);
}

export function registerTogetherRoutes(app, { pool }) {
  const vapidPublicKey = String(process.env.NORTH_VAPID_PUBLIC_KEY ?? "");
  const vapidPrivateKey = String(process.env.NORTH_VAPID_PRIVATE_KEY ?? "");
  const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);
  if (pushEnabled) webpush.setVapidDetails(process.env.NORTH_VAPID_SUBJECT || "mailto:hello@bodhix.io", vapidPublicKey, vapidPrivateKey);
  const eventStreams = new Map();
  const publish = (ownerUserId, event, data) => {
    for (const stream of eventStreams.get(ownerUserId) ?? []) stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const publishPush = async (ownerUserId, preference, { title, preview, roomId = null, url = "/?open=together" }) => {
    if (!pushEnabled || !preferenceFields.includes(preference)) return;
    const result = await pool.query(`select subscription.id,subscription.endpoint,subscription.p256dh,subscription.auth,
      coalesce(preference.${preference},true) enabled,coalesce(preference.preview_message_text,false) preview_message_text
      from together_push_subscriptions subscription join devices device on device.id=subscription.device_id and device.owner_user_id=subscription.owner_user_id and device.revoked_at is null
      left join together_notification_preferences preference on preference.owner_user_id=subscription.owner_user_id
      where subscription.owner_user_id=$1 and subscription.revoked_at is null and ($2::uuid is null or exists(
        select 1 from together_room_members member where member.room_id=$2 and member.owner_user_id=$1 and member.notification_level<>'muted'
        and (member.muted_until is null or member.muted_until<now())))`, [ownerUserId, roomId]);
    const active = result.rows.filter((row) => row.enabled);
    await Promise.allSettled(active.map(async (row) => {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(togetherPushPayload({ title, preview, previewMessageText: row.preview_message_text, roomId, url })), { TTL: 300, urgency: "normal" });
      } catch (error) {
        if ([404, 410].includes(error?.statusCode)) await pool.query("update together_push_subscriptions set revoked_at=now(),updated_at=now() where id=$1", [row.id]);
        else app.log.warn({ err: error, ownerUserId }, "Could not send Together push notification");
      }
    }));
  };
  const publishAnnouncement = async (announcementId, actorUserId = null, auditAction = "published") => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(`update together_announcements set status=case when correction_of_id is null then 'published' else 'corrected' end,
        published_at=coalesce(published_at,now()),updated_at=now() where id=$1 and status in ('draft','scheduled')
        and (expires_at is null or expires_at>now()) returning *`, [announcementId]);
      const announcement = result.rows[0];
      if (!announcement) { await client.query("rollback"); return null; }
      const room = await client.query("select id from together_rooms where slug='north-updates' and status='active'");
      const audienceIds = announcement.audience?.kind === "users" ? announcement.audience.userIds : null;
      const recipients = await client.query(`select id from app_users where status='active' and deleted_at is null
        and ($1::uuid[] is null or id=any($1::uuid[]))`, [audienceIds]);
      if (!recipients.rowCount) { await client.query("rollback"); return null; }
      await client.query(`insert into together_room_members(room_id,owner_user_id,role,status)
        select $1,id,'member','active' from app_users where id=any($2::uuid[])
        on conflict(room_id,owner_user_id) do update set status='active',updated_at=now()`, [room.rows[0].id, recipients.rows.map((row) => row.id)]);
      const message = await client.query(`insert into together_messages(room_id,sender_user_id,client_message_id,kind,body,shared_payload)
        values($1,$2,gen_random_uuid(),'system',$3,$4::jsonb) returning *`, [room.rows[0].id, actorUserId, `${announcement.title}\n\n${announcement.body}`.slice(0, 4000), JSON.stringify({ announcementId: announcement.id, category: announcement.category })]);
      await client.query(`insert into together_announcement_receipts(announcement_id,owner_user_id,delivered_at)
        select $1,id,now() from app_users where id=any($2::uuid[]) on conflict do nothing`, [announcement.id, recipients.rows.map((row) => row.id)]);
      await client.query(`insert into together_message_receipts(message_id,owner_user_id,delivered_at)
        select $1,id,now() from app_users where id=any($2::uuid[]) on conflict do nothing`, [message.rows[0].id, recipients.rows.map((row) => row.id)]);
      await client.query("update together_rooms set last_message_at=$1,updated_at=now() where id=$2", [message.rows[0].created_at, room.rows[0].id]);
      await client.query("insert into together_announcement_audit(announcement_id,actor_user_id,action,metadata) values($1,$2,$3,$4)", [announcement.id, actorUserId, auditAction, { audience: announcement.audience, recipients: recipients.rowCount }]);
      await client.query("commit");
      const mapped = mapMessage(message.rows[0]);
      for (const recipient of recipients.rows) {
        publish(recipient.id, "announcement", mapped);
        void publishPush(recipient.id, pushPreferenceByAnnouncement[announcement.category], { title: "North Updates", preview: announcement.title });
      }
      return announcement;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  };
  const publishDueAnnouncements = async () => {
    const due = await pool.query("select id from together_announcements where status='scheduled' and scheduled_at<=now() and (expires_at is null or expires_at>now()) order by scheduled_at limit 25");
    for (const announcement of due.rows) await publishAnnouncement(announcement.id);
  };
  const announcementTimer = setInterval(() => void publishDueAnnouncements().catch((error) => app.log.error({ err: error }, "Could not publish scheduled North Updates")), 30_000);
  announcementTimer.unref();
  app.addHook("onClose", async () => clearInterval(announcementTimer));

  app.get("/v1/together/events", { preHandler: app.authenticate }, async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    const streams = eventStreams.get(request.user.sub) ?? new Set();
    streams.add(reply.raw);
    eventStreams.set(request.user.sub, streams);
    reply.raw.write("event: ready\ndata: {}\n\n");
    const heartbeat = setInterval(() => reply.raw.write(": keep-alive\n\n"), 25_000);
    request.raw.once("close", () => {
      clearInterval(heartbeat);
      streams.delete(reply.raw);
      if (!streams.size) eventStreams.delete(request.user.sub);
    });
    return reply;
  });

  app.get("/v1/together/push/config", { preHandler: app.authenticate }, async () => ({ enabled: pushEnabled, publicKey: pushEnabled ? vapidPublicKey : null }));

  app.get("/v1/together/push/subscriptions", { preHandler: app.authenticate }, async (request) => ({
    subscriptions: (await pool.query("select id,device_id,created_at,updated_at from together_push_subscriptions where owner_user_id=$1 and revoked_at is null order by created_at", [request.user.sub])).rows,
  }));

  app.post("/v1/together/push/subscriptions", { preHandler: app.authenticate }, async (request, reply) => {
    const endpoint = cleanText(request.body?.endpoint, 2000);
    const p256dh = cleanText(request.body?.keys?.p256dh, 500);
    const auth = cleanText(request.body?.keys?.auth, 500);
    if (!pushEnabled) return reply.code(503).send({ error: "Push notifications are not configured." });
    if (!endpoint.startsWith("https://") || !p256dh || !auth) return reply.code(400).send({ error: "A valid browser push subscription is required." });
    const result = await pool.query(`insert into together_push_subscriptions(owner_user_id,device_id,endpoint,p256dh,auth)
      values($1,$2,$3,$4,$5) on conflict(endpoint) do update set device_id=$2,p256dh=$4,auth=$5,revoked_at=null,updated_at=now()
      where together_push_subscriptions.owner_user_id=$1 returning id,device_id,created_at,updated_at`, [request.user.sub, request.device.id, endpoint, p256dh, auth]);
    if (!result.rows[0]) return reply.code(409).send({ error: "This push subscription belongs to another account." });
    return reply.code(201).send({ subscription: result.rows[0] });
  });

  app.delete("/v1/together/push/subscriptions/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query("update together_push_subscriptions set revoked_at=now(),updated_at=now() where id=$1 and owner_user_id=$2 and revoked_at is null returning id", [request.params.id, request.user.sub]);
    return result.rows[0] ? reply.code(204).send() : reply.code(404).send({ error: "Active push subscription not found." });
  });

  app.get("/v1/together/people", { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const username = cleanText(request.query?.username, 30).toLowerCase();
    if (!usernamePattern.test(username)) return reply.code(400).send({ error: "Enter an exact North username." });
    const person = await findActiveUser(pool, username);
    if (!person || person.id === request.user.sub) return reply.code(404).send({ error: "No available North member matched that username." });
    return { person: mapPerson(person) };
  });

  app.get("/v1/together/requests", { preHandler: app.authenticate }, async (request) => {
    const result = await pool.query(`select c.id,c.requested_at,u.id requester_id,u.display_name requester_display_name,lc.username requester_username
      from together_connections c join app_users u on u.id=c.requester_user_id
      join local_credentials lc on lc.owner_user_id=u.id
      where c.recipient_user_id=$1 and c.status='pending' order by c.requested_at desc`, [request.user.sub]);
    return { requests: result.rows.map((row) => ({ id: row.id, requestedAt: row.requested_at, person: mapPerson(row, "requester_") })) };
  });

  app.post("/v1/together/requests", { preHandler: app.authenticate, config: { rateLimit: { max: 12, timeWindow: "1 hour" } } }, async (request, reply) => {
    const username = cleanText(request.body?.username, 30).toLowerCase();
    if (!usernamePattern.test(username)) return reply.code(400).send({ error: "Enter the person's exact North username." });
    const recipient = await findActiveUser(pool, username);
    if (!recipient || recipient.id === request.user.sub) return reply.code(404).send({ error: "No available North member matched that username." });
    const blocked = await pool.query(`select 1 from together_blocks where
      (blocker_user_id=$1 and blocked_user_id=$2) or (blocker_user_id=$2 and blocked_user_id=$1)`, [request.user.sub, recipient.id]);
    if (blocked.rows[0]) return reply.code(404).send({ error: "No available North member matched that username." });
    const existing = await pool.query(`select * from together_connections where
      least(requester_user_id,recipient_user_id)=least($1::uuid,$2::uuid)
      and greatest(requester_user_id,recipient_user_id)=greatest($1::uuid,$2::uuid)`, [request.user.sub, recipient.id]);
    if (existing.rows[0]?.status === "accepted") return reply.code(409).send({ error: "You are already connected." });
    if (existing.rows[0]?.status === "pending") return reply.code(409).send({ error: existing.rows[0].recipient_user_id === request.user.sub ? "This person has already asked to connect with you." : "Your connection request is already waiting." });
    const result = existing.rows[0]
      ? await pool.query(`update together_connections set requester_user_id=$1,recipient_user_id=$2,status='pending',requested_at=now(),responded_at=null,disconnected_at=null,updated_at=now() where id=$3 returning *`, [request.user.sub, recipient.id, existing.rows[0].id])
      : await pool.query(`insert into together_connections(requester_user_id,recipient_user_id) values($1,$2) returning *`, [request.user.sub, recipient.id]);
    publish(recipient.id, "connection_request", { id: result.rows[0].id });
    return reply.code(201).send({ request: { id: result.rows[0].id, status: result.rows[0].status, requestedAt: result.rows[0].requested_at, person: mapPerson(recipient) } });
  });

  app.post("/v1/together/requests/:id/respond", { preHandler: app.authenticate }, async (request, reply) => {
    const decision = request.body?.decision;
    if (!new Set(["accept", "decline"]).has(decision)) return reply.code(400).send({ error: "Choose accept or decline." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const connection = await client.query(`update together_connections set status=$1,responded_at=now(),updated_at=now()
        where id=$2 and recipient_user_id=$3 and status='pending' returning *`, [decision === "accept" ? "accepted" : "declined", request.params.id, request.user.sub]);
      if (!connection.rows[0]) { await client.query("rollback"); return reply.code(404).send({ error: "Pending connection request not found." }); }
      let roomId = null;
      if (decision === "accept") {
        const room = await client.query(`insert into together_rooms(name,kind,visibility,connection_id,created_by_user_id)
          values('Direct message','direct','private',$1,$2) on conflict(connection_id) do update set status='active',updated_at=now() returning id`, [connection.rows[0].id, request.user.sub]);
        roomId = room.rows[0].id;
        await client.query(`insert into together_room_members(room_id,owner_user_id,role,status) values
          ($1,$2,'member','active'),($1,$3,'member','active')
          on conflict(room_id,owner_user_id) do update set status='active',updated_at=now()`, [roomId, connection.rows[0].requester_user_id, connection.rows[0].recipient_user_id]);
      }
      await client.query("commit");
      if (decision === "accept") {
        const event = { roomId, status: "active" };
        publish(connection.rows[0].requester_user_id, "membership", event);
        publish(connection.rows[0].recipient_user_id, "membership", event);
      }
      return { connection: { id: connection.rows[0].id, status: connection.rows[0].status, roomId } };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.get("/v1/together/inbox", { preHandler: app.authenticate }, async (request) => {
    await ensureCuratedMemberships(pool, request.user.sub);
    const limit = Math.min(50, Math.max(1, Number(request.query?.limit) || 30));
    const result = await pool.query(`select r.*,rm.role,rm.status member_status,rm.notification_level,rm.muted_until,
      latest.id latest_message_id,latest.sender_user_id latest_sender_user_id,latest.kind latest_kind,latest.body latest_body,
      latest.removed_at latest_removed_at,latest.created_at latest_created_at,
      peer.id peer_id,peer.display_name peer_display_name,peer_credentials.username peer_username,
      (select count(*)::int from together_message_receipts receipt join together_messages unread on unread.id=receipt.message_id
        where receipt.owner_user_id=$1 and receipt.read_at is null and unread.room_id=r.id) unread_count
      from together_room_members rm join together_rooms r on r.id=rm.room_id
      left join lateral (select m.* from together_messages m where m.room_id=r.id and (m.kind<>'system' or exists(
        select 1 from together_announcement_receipts announcement_receipt where announcement_receipt.owner_user_id=$1
        and announcement_receipt.announcement_id=(m.shared_payload->>'announcementId')::uuid)) order by m.created_at desc,m.id desc limit 1) latest on true
      left join together_room_members peer_member on peer_member.room_id=r.id and peer_member.owner_user_id<>$1 and r.kind='direct' and peer_member.status='active'
      left join app_users peer on peer.id=peer_member.owner_user_id
      left join local_credentials peer_credentials on peer_credentials.owner_user_id=peer.id
      where rm.owner_user_id=$1 and rm.status in ('active','invited') and r.status='active'
      and (rm.hidden_before is null or r.last_message_at>rm.hidden_before or r.kind in ('general','help','updates','trainer'))
      order by coalesce(r.last_message_at,r.created_at) desc,r.id desc limit $2`, [request.user.sub, limit]);
    return { rooms: result.rows.map(mapRoom) };
  });

  app.get("/v1/together/rooms/:id/messages", { preHandler: app.authenticate }, async (request, reply) => {
    await ensureCuratedMemberships(pool, request.user.sub);
    const access = await findRoomAccess(pool, request.params.id, request.user.sub);
    if (!access) return reply.code(404).send({ error: "Conversation not found." });
    const limit = Math.min(100, Math.max(1, Number(request.query?.limit) || 50));
    const cursor = request.query?.before ? decodeCursor(request.query.before) : null;
    if (request.query?.before && !cursor) return reply.code(400).send({ error: "Message cursor is invalid." });
    const values = [request.params.id, request.user.sub, limit + 1];
    const cursorClause = cursor ? "and (m.created_at,m.id)<($4::timestamptz,$5::uuid)" : "";
    if (cursor) values.push(cursor.createdAt, cursor.id);
    const result = await pool.query(`select m.*,u.id sender_id,u.display_name sender_display_name,lc.username sender_username,
      receipt.delivered_at,receipt.read_at from together_messages m
      join together_room_members access_member on access_member.room_id=m.room_id and access_member.owner_user_id=$2
      left join app_users u on u.id=m.sender_user_id left join local_credentials lc on lc.owner_user_id=u.id
      left join together_message_receipts receipt on receipt.message_id=m.id and receipt.owner_user_id=$2
      where m.room_id=$1 and (access_member.hidden_before is null or m.created_at>access_member.hidden_before)
      and (m.kind<>'system' or exists(select 1 from together_announcement_receipts announcement_receipt
        where announcement_receipt.owner_user_id=$2 and announcement_receipt.announcement_id=(m.shared_payload->>'announcementId')::uuid)) ${cursorClause}
      order by m.created_at desc,m.id desc limit $3`, values);
    const hasMore = result.rows.length > limit;
    const page = result.rows.slice(0, limit);
    return { room: mapRoom({ ...access, id: access.id, member_status: access.member_status }), messages: page.reverse().map(mapMessage), nextCursor: hasMore ? encodeCursor(page.at(-1)) : null };
  });

  app.post("/v1/together/rooms/:id/messages", { preHandler: app.authenticate, config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request, reply) => {
    await ensureCuratedMemberships(pool, request.user.sub);
    const access = await findRoomAccess(pool, request.params.id, request.user.sub);
    if (!access) return reply.code(404).send({ error: "Conversation not found." });
    if (access.member_status !== "active") return reply.code(403).send({ error: "Join this room before posting." });
    if (access.kind === "direct" && !access.connection_id) return reply.code(403).send({ error: "This connection is no longer available." });
    if (access.posting_policy === "read_only" || (access.posting_policy === "staff" && !request.account?.is_admin)) return reply.code(403).send({ error: "This room is read-only." });
    if (access.slow_mode_seconds > 0 && access.role === "member" && access.last_posted_at && Date.now() < new Date(access.last_posted_at).valueOf() + access.slow_mode_seconds * 1000) return reply.code(429).send({ error: "Slow mode is active. Wait before posting again." });
    const clientMessageId = String(request.body?.clientMessageId ?? "");
    const body = cleanText(request.body?.body, 4000);
    const kind = request.body?.kind ?? "text";
    let sharedPayload = request.body?.sharedPayload ?? null;
    const replyToMessageId = uuidPattern.test(String(request.body?.replyToMessageId ?? "")) ? request.body.replyToMessageId : null;
    if (!uuidPattern.test(clientMessageId)) return reply.code(400).send({ error: "A valid client message ID is required." });
    if (!new Set(["text", "workout", "milestone", "recap", "photo", "progress", "encouragement", "invitation"]).has(kind)) return reply.code(400).send({ error: "Message type is not supported." });
    if (kind === "workout") {
      const template = workoutSnapshot(sharedPayload?.template);
      if (!template) return reply.code(400).send({ error: "Review a complete workout before sharing it." });
      sharedPayload = { type: "workout-template", template };
    }
    if (["milestone", "recap", "progress", "encouragement", "invitation"].includes(kind)) {
      sharedPayload = sharedCardSnapshot(kind, sharedPayload);
      if (!sharedPayload) return reply.code(400).send({ error: "Review a title and detail before sharing this card." });
    }
    if (kind === "photo") {
      sharedPayload = sharedPhotoSnapshot(sharedPayload);
      if (!sharedPayload) return reply.code(400).send({ error: "Review a supported photo snapshot before sharing it." });
    }
    if (!body && !sharedPayload) return reply.code(400).send({ error: "Write a message before sending." });
    if (access.kind === "direct") {
      const blocked = await pool.query(`select 1 from together_blocks b join together_room_members peer
        on peer.room_id=$2 and peer.owner_user_id<>$1 where
        (b.blocker_user_id=$1 and b.blocked_user_id=peer.owner_user_id)
        or (b.blocker_user_id=peer.owner_user_id and b.blocked_user_id=$1)`, [request.user.sub, request.params.id]);
      if (blocked.rows[0]) return reply.code(403).send({ error: "Messages are unavailable for this connection." });
    }
    const existing = await pool.query("select * from together_messages where sender_user_id=$1 and client_message_id=$2", [request.user.sub, clientMessageId]);
    if (existing.rows[0]) {
      if (existing.rows[0].room_id !== request.params.id || existing.rows[0].body !== body || existing.rows[0].kind !== kind) return reply.code(409).send({ error: "Client message ID was already used for different content." });
      return { message: mapAccountMessage(existing.rows[0], request), deduplicated: true };
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const inserted = await client.query(`insert into together_messages(room_id,sender_user_id,client_message_id,kind,body,shared_payload,reply_to_message_id)
        values($1,$2,$3,$4,$5,$6::jsonb,$7) on conflict(sender_user_id,client_message_id) do nothing returning *`,
      [request.params.id, request.user.sub, clientMessageId, kind, body, sharedPayload ? JSON.stringify(sharedPayload) : null, replyToMessageId]);
      const message = inserted.rows[0] ?? (await client.query("select * from together_messages where sender_user_id=$1 and client_message_id=$2", [request.user.sub, clientMessageId])).rows[0];
      await client.query("update together_rooms set last_message_at=$1,updated_at=now() where id=$2", [message.created_at, request.params.id]);
      await client.query("update together_room_members set last_posted_at=$1,updated_at=now() where room_id=$2 and owner_user_id=$3", [message.created_at, request.params.id, request.user.sub]);
      await client.query(`insert into together_message_receipts(message_id,owner_user_id,delivered_at)
        select $1,owner_user_id,now() from together_room_members where room_id=$2 and owner_user_id<>$3 and status='active'
        on conflict(message_id,owner_user_id) do nothing`, [message.id, request.params.id, request.user.sub]);
      await client.query("commit");
      const mapped = mapAccountMessage(message, request);
      const recipients = await pool.query("select owner_user_id from together_room_members where room_id=$1 and status='active'", [request.params.id]);
      for (const recipient of recipients.rows) {
        publish(recipient.owner_user_id, "message", mapped);
        if (recipient.owner_user_id !== request.user.sub) {
          publish(recipient.owner_user_id, "unread", { roomId: request.params.id });
          void publishPush(recipient.owner_user_id, pushPreferenceByRoom[access.kind], { title: access.kind === "direct" ? "New direct message" : `New message in ${access.name}`, preview: body, roomId: request.params.id });
        }
      }
      return reply.code(201).send({ message: mapped, deduplicated: !inserted.rows[0] });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/v1/together/rooms/:id/read", { preHandler: app.authenticate }, async (request, reply) => {
    const access = await findRoomAccess(pool, request.params.id, request.user.sub);
    if (!access) return reply.code(404).send({ error: "Conversation not found." });
    await pool.query(`update together_message_receipts receipt set read_at=coalesce(read_at,now()),delivered_at=coalesce(delivered_at,now())
      from together_messages message where receipt.message_id=message.id and receipt.owner_user_id=$1 and message.room_id=$2`, [request.user.sub, request.params.id]);
    await pool.query("update together_room_members set last_read_at=now(),updated_at=now() where room_id=$1 and owner_user_id=$2", [request.params.id, request.user.sub]);
    const preferences = await pool.query("select read_receipts from together_notification_preferences where owner_user_id=$1", [request.user.sub]);
    if (preferences.rows[0]?.read_receipts) {
      const members = await pool.query("select owner_user_id from together_room_members where room_id=$1 and owner_user_id<>$2 and status='active'", [request.params.id, request.user.sub]);
      for (const member of members.rows) publish(member.owner_user_id, "receipt", { roomId: request.params.id, readerUserId: request.user.sub });
    }
    return reply.code(204).send();
  });

  app.post("/v1/together/messages/:id/workout-copy", { preHandler: app.authenticate }, async (request, reply) => {
    const copyId = String(request.body?.copyId ?? "");
    if (!uuidPattern.test(copyId)) return reply.code(400).send({ error: "A valid independent copy ID is required." });
    const result = await pool.query("select room_id,sender_user_id,shared_payload from together_messages where id=$1 and kind='workout' and removed_at is null", [request.params.id]);
    const message = result.rows[0];
    if (!message || message.sender_user_id === request.user.sub || !await findRoomAccess(pool, message.room_id, request.user.sub)) return reply.code(404).send({ error: "Shared workout not found." });
    const template = workoutSnapshot(message.shared_payload?.template);
    if (!template) return reply.code(409).send({ error: "This workout can no longer be copied safely." });
    return { template: { ...template, id: copyId, source: "personal" }, sourceMessageId: request.params.id };
  });

  app.delete("/v1/together/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query(`update together_messages message set body='Message removed',shared_payload=null,removed_at=now(),removed_by_user_id=$2
      where message.id=$1 and message.sender_user_id=$2 and message.removed_at is null and message.kind<>'system'
      and exists(select 1 from together_room_members member where member.room_id=message.room_id and member.owner_user_id=$2 and member.status='active')
      returning message.id,message.room_id,message.removed_at`, [request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Shared item not found." });
    const event = { id: result.rows[0].id, roomId: result.rows[0].room_id, removedAt: result.rows[0].removed_at };
    const members = await pool.query("select owner_user_id from together_room_members where room_id=$1 and status='active'", [event.roomId]);
    for (const member of members.rows) publish(member.owner_user_id, "message_removed", event);
    return reply.code(204).send();
  });

  app.patch("/v1/together/rooms/:id/notifications", { preHandler: app.authenticate }, async (request, reply) => {
    const level = request.body?.level;
    if (!new Set(["all", "mentions", "muted"]).has(level)) return reply.code(400).send({ error: "Choose all, mentions, or muted." });
    const result = await pool.query(`update together_room_members set notification_level=$1,muted_until=$2,updated_at=now()
      where room_id=$3 and owner_user_id=$4 and status in ('active','invited') returning room_id`,
    [level, level === "muted" ? request.body?.mutedUntil ?? "infinity" : null, request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Conversation not found." });
    return { notificationLevel: level };
  });

  app.get("/v1/together/rooms/:id/info", { preHandler: app.authenticate }, async (request, reply) => {
    const access = await findRoomAccess(pool, request.params.id, request.user.sub);
    if (!access) return reply.code(404).send({ error: "Conversation not found." });
    const count = await pool.query("select count(*)::int member_count from together_room_members where room_id=$1 and status='active'", [request.params.id]);
    let members = [];
    if (["direct", "trainer"].includes(access.kind)) {
      const result = await pool.query(`select member.owner_user_id id,credential.username,user_account.display_name,member.role,member.status
        from together_room_members member join app_users user_account on user_account.id=member.owner_user_id
        left join local_credentials credential on credential.owner_user_id=member.owner_user_id
        where member.room_id=$1 and member.status in ('active','invited') order by member.joined_at`, [request.params.id]);
      members = result.rows.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, role: row.role, status: row.status }));
    }
    return { room: { id: access.id, name: access.name, description: access.description, kind: access.kind, role: access.role, memberCount: count.rows[0].member_count }, members };
  });

  app.get("/v1/together/preferences", { preHandler: app.authenticate }, async (request) => {
    const result = await pool.query(`insert into together_notification_preferences(owner_user_id) values($1)
      on conflict(owner_user_id) do update set owner_user_id=excluded.owner_user_id returning *`, [request.user.sub]);
    return { preferences: Object.fromEntries(preferenceFields.map((field) => [field, result.rows[0][field]])) };
  });

  app.get("/v1/together/export", { preHandler: app.authenticate }, async (request) => {
    const ownerUserId = request.user.sub;
    const [connections, rooms, messages, receipts, blocks, reports, preferences, announcements] = await Promise.all([
      pool.query("select id,requester_user_id,recipient_user_id,status,requested_at,responded_at,disconnected_at,updated_at from together_connections where requester_user_id=$1 or recipient_user_id=$1 order by requested_at", [ownerUserId]),
      pool.query(`select room.id,room.slug,room.name,room.description,room.kind,room.visibility,member.role,member.status,member.notification_level,
        member.muted_until,member.hidden_before,member.last_read_at,member.joined_at,member.updated_at
        from together_room_members member join together_rooms room on room.id=member.room_id where member.owner_user_id=$1 order by member.joined_at`, [ownerUserId]),
      pool.query(`select message.* from together_messages message join together_room_members member on member.room_id=message.room_id
        where member.owner_user_id=$1 and (message.kind<>'system' or exists(select 1 from together_announcement_receipts announcement_receipt
        where announcement_receipt.owner_user_id=$1 and announcement_receipt.announcement_id=(message.shared_payload->>'announcementId')::uuid)) order by message.created_at`, [ownerUserId]),
      pool.query(`select receipt.* from together_message_receipts receipt where receipt.owner_user_id=$1
        or exists(select 1 from together_messages message where message.id=receipt.message_id and message.sender_user_id=$1) order by receipt.message_id`, [ownerUserId]),
      pool.query("select blocked_user_id,reason,created_at from together_blocks where blocker_user_id=$1 order by created_at", [ownerUserId]),
      pool.query("select id,reported_user_id,room_id,message_id,category,submitted_context,status,resolution_note,appeal_note,created_at,updated_at,resolved_at from together_reports where reporter_user_id=$1 order by created_at", [ownerUserId]),
      pool.query("select * from together_notification_preferences where owner_user_id=$1", [ownerUserId]),
      pool.query(`select announcement.*,receipt.delivered_at,receipt.read_at,receipt.archived_at from together_announcement_receipts receipt
        join together_announcements announcement on announcement.id=receipt.announcement_id where receipt.owner_user_id=$1 order by announcement.created_at`, [ownerUserId]),
    ]);
    return { exportedAt: new Date().toISOString(), connections: connections.rows, rooms: rooms.rows, messages: messages.rows, receipts: receipts.rows, blocks: blocks.rows, reports: reports.rows, preferences: preferences.rows[0] ?? null, announcements: announcements.rows };
  });

  app.patch("/v1/together/preferences", { preHandler: app.authenticate }, async (request, reply) => {
    const changes = preferenceFields.filter((field) => typeof request.body?.[field] === "boolean");
    if (!changes.length) return reply.code(400).send({ error: "Choose at least one Together preference to update." });
    const values = [request.user.sub, ...changes.map((field) => request.body[field])];
    const assignments = changes.map((field, index) => `${field}=$${index + 2}`).join(",");
    const result = await pool.query(`insert into together_notification_preferences(owner_user_id) values($1)
      on conflict(owner_user_id) do update set ${assignments},updated_at=now() returning *`, values);
    return { preferences: Object.fromEntries(preferenceFields.map((field) => [field, result.rows[0][field]])) };
  });

  app.post("/v1/together/rooms/:id/reports", { preHandler: app.authenticate, config: { rateLimit: { max: 8, timeWindow: "1 hour" } } }, async (request, reply) => {
    const access = await findRoomAccess(pool, request.params.id, request.user.sub);
    if (!access) return reply.code(404).send({ error: "Conversation not found." });
    const category = request.body?.category;
    const submittedContext = cleanText(request.body?.submittedContext, 4000);
    const messageId = uuidPattern.test(String(request.body?.messageId ?? "")) ? request.body.messageId : null;
    if (!reportCategories.has(category) || !submittedContext) return reply.code(400).send({ error: "Choose a report category and describe what should be reviewed." });
    let reportedUserId = null;
    if (messageId) {
      const message = await pool.query("select sender_user_id from together_messages where id=$1 and room_id=$2", [messageId, request.params.id]);
      if (!message.rows[0]) return reply.code(404).send({ error: "Message not found in this conversation." });
      if (message.rows[0].sender_user_id !== request.user.sub) reportedUserId = message.rows[0].sender_user_id;
    } else if (access.kind === "direct") {
      const peer = await pool.query("select owner_user_id from together_room_members where room_id=$1 and owner_user_id<>$2 and status='active'", [request.params.id, request.user.sub]);
      reportedUserId = peer.rows[0]?.owner_user_id ?? null;
    }
    const result = await pool.query(`insert into together_reports(reporter_user_id,reported_user_id,room_id,message_id,category,submitted_context)
      values($1,$2,$3,$4,$5,$6) returning id,status,created_at`, [request.user.sub, reportedUserId, request.params.id, messageId, category, submittedContext]);
    return reply.code(201).send({ report: { id: result.rows[0].id, status: result.rows[0].status, createdAt: result.rows[0].created_at } });
  });

  app.post("/v1/together/reports/:id/appeal", { preHandler: app.authenticate, config: { rateLimit: { max: 4, timeWindow: "1 hour" } } }, async (request, reply) => {
    const appealNote = cleanText(request.body?.appealNote, 4000);
    if (!appealNote) return reply.code(400).send({ error: "Explain what should be reconsidered." });
    const result = await pool.query(`update together_reports set appeal_note=$1,status='open',resolved_at=null,updated_at=now()
      where id=$2 and reporter_user_id=$3 and status in ('resolved','dismissed') returning id,status,updated_at`, [appealNote, request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Resolved report not found." });
    return { report: { id: result.rows[0].id, status: result.rows[0].status, updatedAt: result.rows[0].updated_at } };
  });

  app.get("/v1/admin/together/reports", { preHandler: app.requireAdmin }, async (request, reply) => {
    const status = String(request.query?.status ?? "open");
    if (!new Set(["all", "open", "reviewing", "resolved", "dismissed"]).has(status)) return reply.code(400).send({ error: "Unknown report status." });
    const result = await pool.query(`select report.id,report.category,report.submitted_context,report.status,report.resolution_note,report.appeal_note,
      report.created_at,report.updated_at,report.resolved_at,room.name room_name,room.kind room_kind,
      reporter.id reporter_id,reporter.display_name reporter_name,reporter_credentials.username reporter_username,
      reported.id reported_id,reported.display_name reported_name,reported_credentials.username reported_username,
      reviewer.id reviewer_id,reviewer.display_name reviewer_name
      from together_reports report
      left join together_rooms room on room.id=report.room_id
      left join app_users reporter on reporter.id=report.reporter_user_id left join local_credentials reporter_credentials on reporter_credentials.owner_user_id=reporter.id
      left join app_users reported on reported.id=report.reported_user_id left join local_credentials reported_credentials on reported_credentials.owner_user_id=reported.id
      left join app_users reviewer on reviewer.id=report.reviewed_by_user_id
      where ($1='all' or report.status=$1) order by report.created_at desc limit 250`, [status]);
    return { reports: result.rows };
  });

  app.patch("/v1/admin/together/reports/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const status = request.body?.status;
    const resolutionNote = cleanText(request.body?.resolutionNote, 4000);
    if (!new Set(["reviewing", "resolved", "dismissed"]).has(status) || !resolutionNote) return reply.code(400).send({ error: "Choose a review outcome and record the reason." });
    const result = await pool.query(`update together_reports set status=$1,resolution_note=$2,reviewed_by_user_id=$3,
      resolved_at=case when $1 in ('resolved','dismissed') then now() else null end,updated_at=now()
      where id=$4 returning id,status,resolved_at,updated_at`, [status, resolutionNote, request.user.sub, request.params.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Report not found." });
    return { report: result.rows[0] };
  });

  app.get("/v1/admin/together/announcements", { preHandler: app.requireAdmin }, async () => ({
    announcements: (await pool.query(`select announcement.*,
      coalesce((select count(*)::int from together_announcement_receipts receipt where receipt.announcement_id=announcement.id),0) recipients
      from together_announcements announcement order by announcement.created_at desc limit 250`)).rows,
  }));

  app.post("/v1/admin/together/announcements", { preHandler: app.requireAdmin }, async (request, reply) => {
    const title = cleanText(request.body?.title, 160);
    const body = cleanText(request.body?.body, 3800);
    const category = request.body?.category;
    const audience = cleanAudience(request.body?.audience);
    if (!title || !body || !new Set(["feature", "release", "incident", "service", "security"]).has(category) || !audience) return reply.code(400).send({ error: "Title, message, category, and a valid audience are required." });
    const result = await pool.query(`insert into together_announcements(author_user_id,title,body,category,audience,expires_at)
      values($1,$2,$3,$4,$5,$6) returning *`, [request.user.sub, title, body, category, audience, request.body?.expiresAt ?? null]);
    await pool.query("insert into together_announcement_audit(announcement_id,actor_user_id,action,metadata) values($1,$2,'created',$3)", [result.rows[0].id, request.user.sub, { audience }]);
    return reply.code(201).send({ announcement: result.rows[0] });
  });

  app.patch("/v1/admin/together/announcements/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const audience = request.body?.audience ? cleanAudience(request.body.audience) : undefined;
    if (request.body?.audience && !audience) return reply.code(400).send({ error: "Choose a valid announcement audience." });
    const result = await pool.query(`update together_announcements set title=coalesce($1,title),body=coalesce($2,body),category=coalesce($3,category),
      audience=coalesce($4,audience),expires_at=coalesce($5,expires_at),updated_at=now() where id=$6 and status in ('draft','scheduled') returning *`,
    [request.body?.title ? cleanText(request.body.title, 160) : null, request.body?.body ? cleanText(request.body.body, 3800) : null, request.body?.category ?? null, audience ?? null, request.body?.expiresAt ?? null, request.params.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Editable announcement not found." });
    if (audience) await pool.query("insert into together_announcement_audit(announcement_id,actor_user_id,action,metadata) values($1,$2,'audience_changed',$3)", [request.params.id, request.user.sub, { audience }]);
    return { announcement: result.rows[0] };
  });

  app.post("/v1/admin/together/announcements/:id/schedule", { preHandler: app.requireAdmin }, async (request, reply) => {
    const scheduledAt = new Date(request.body?.scheduledAt);
    if (!Number.isFinite(scheduledAt.valueOf()) || scheduledAt <= new Date()) return reply.code(400).send({ error: "Choose a future publication time." });
    const result = await pool.query("update together_announcements set status='scheduled',scheduled_at=$1,updated_at=now() where id=$2 and status='draft' returning *", [scheduledAt, request.params.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Draft announcement not found." });
    await pool.query("insert into together_announcement_audit(announcement_id,actor_user_id,action,metadata) values($1,$2,'scheduled',$3)", [request.params.id, request.user.sub, { scheduledAt }]);
    return { announcement: result.rows[0] };
  });

  app.post("/v1/admin/together/announcements/:id/publish", { preHandler: app.requireAdmin }, async (request, reply) => {
    if (request.body?.confirmed !== true) return reply.code(400).send({ error: "Confirm this announcement before publishing." });
    const announcement = await publishAnnouncement(request.params.id, request.user.sub);
    return announcement ? { announcement } : reply.code(404).send({ error: "Publishable announcement not found." });
  });

  app.post("/v1/admin/together/announcements/:id/correct", { preHandler: app.requireAdmin }, async (request, reply) => {
    if (request.body?.confirmed !== true) return reply.code(400).send({ error: "Confirm this correction before publishing." });
    const original = await pool.query("select * from together_announcements where id=$1 and status in ('published','corrected')", [request.params.id]);
    if (!original.rows[0]) return reply.code(404).send({ error: "Published announcement not found." });
    const title = cleanText(request.body?.title, 160);
    const body = cleanText(request.body?.body, 3800);
    if (!title || !body) return reply.code(400).send({ error: "Correction title and message are required." });
    const correction = await pool.query(`insert into together_announcements(author_user_id,title,body,category,audience,expires_at,correction_of_id)
      values($1,$2,$3,$4,$5,$6,$7) returning id`, [request.user.sub, title, body, original.rows[0].category, original.rows[0].audience, original.rows[0].expires_at, request.params.id]);
    await pool.query("update together_announcements set status='corrected',updated_at=now() where id=$1", [request.params.id]);
    const announcement = await publishAnnouncement(correction.rows[0].id, request.user.sub, "corrected");
    return { announcement };
  });

  app.post("/v1/admin/together/announcements/:id/archive", { preHandler: app.requireAdmin }, async (request, reply) => {
    const result = await pool.query("update together_announcements set status='archived',updated_at=now() where id=$1 and status<>'archived' returning *", [request.params.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Announcement not found." });
    await pool.query("insert into together_announcement_audit(announcement_id,actor_user_id,action,metadata) values($1,$2,'archived','{}')", [request.params.id, request.user.sub]);
    return { announcement: result.rows[0] };
  });

  app.get("/v1/admin/together/announcements/:id/audit", { preHandler: app.requireAdmin }, async (request) => ({
    events: (await pool.query("select id,actor_user_id,action,metadata,created_at from together_announcement_audit where announcement_id=$1 order by created_at", [request.params.id])).rows,
  }));

  app.patch("/v1/together/rooms/:id/moderation", { preHandler: app.authenticate }, async (request, reply) => {
    const access = await findRoomModerator(pool, request.params.id, request.user.sub, request.account?.is_admin);
    const slowModeSeconds = Number(request.body?.slowModeSeconds);
    if (!access) return reply.code(404).send({ error: "Moderated public room not found." });
    if (!Number.isInteger(slowModeSeconds) || slowModeSeconds < 0 || slowModeSeconds > 3600) return reply.code(400).send({ error: "Slow mode must be between 0 and 3600 seconds." });
    await pool.query("update together_rooms set slow_mode_seconds=$1,updated_at=now() where id=$2", [slowModeSeconds, request.params.id]);
    return { slowModeSeconds };
  });

  app.delete("/v1/together/rooms/:id/members/:userId", { preHandler: app.authenticate }, async (request, reply) => {
    const access = await findRoomModerator(pool, request.params.id, request.user.sub, request.account?.is_admin);
    const reason = cleanText(request.body?.reason, 1000);
    if (!access) return reply.code(404).send({ error: "Moderated public room not found." });
    if (!reason || request.params.userId === request.user.sub) return reply.code(400).send({ error: "Choose another member and record the removal reason." });
    if (await isCanonicalOwner(pool, request.params.userId)) return reply.code(403).send({ error: `The North owner @${ownerUsername} cannot be removed from curated rooms.` });
    const result = await pool.query(`update together_room_members set status='removed',removal_reason=$1,updated_at=now()
      where room_id=$2 and owner_user_id=$3 and status='active' and role='member' returning owner_user_id`, [reason, request.params.id, request.params.userId]);
    return result.rows[0] ? reply.code(204).send() : reply.code(404).send({ error: "Active room member not found." });
  });

  app.patch("/v1/admin/together/rooms/:id/members/:userId/role", { preHandler: app.requireAdmin }, async (request, reply) => {
    const role = request.body?.role;
    if (!new Set(["member", "moderator"]).has(role)) return reply.code(400).send({ error: "Choose member or moderator." });
    const result = await pool.query(`update together_room_members member set role=$1,updated_at=now() from together_rooms room
      where member.room_id=room.id and member.room_id=$2 and member.owner_user_id=$3 and member.status='active'
      and room.kind in ('general','help') returning member.owner_user_id,member.role`, [role, request.params.id, request.params.userId]);
    return result.rows[0] ? { member: result.rows[0] } : reply.code(404).send({ error: "Active public-room member not found." });
  });

  app.delete("/v1/together/rooms/:id/view", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query(`update together_room_members member set hidden_before=now(),last_read_at=now(),updated_at=now()
      from together_rooms room where member.room_id=room.id and member.room_id=$1 and member.owner_user_id=$2
      and member.status='active' and room.kind='direct' returning member.room_id`, [request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Direct conversation not found." });
    return reply.code(204).send();
  });

  app.post("/v1/together/trainer-rooms", { preHandler: app.authenticate, config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
    const username = cleanText(request.body?.username, 30).toLowerCase();
    const name = cleanText(request.body?.name, 80);
    const invitedRole = request.body?.invitedRole === "trainer" ? "trainer" : "member";
    if (!name || !usernamePattern.test(username)) return reply.code(400).send({ error: "A room name and exact North username are required." });
    const invited = await findActiveUser(pool, username);
    if (!invited || invited.id === request.user.sub) return reply.code(404).send({ error: "No available North member matched that username." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const room = await client.query(`insert into together_rooms(name,description,kind,visibility,created_by_user_id)
        values($1,$2,'trainer','private',$3) returning *`, [name, cleanText(request.body?.description, 500), request.user.sub]);
      await client.query(`insert into together_room_members(room_id,owner_user_id,role,status) values
        ($1,$2,'owner','active'),($1,$3,$4,'invited')`, [room.rows[0].id, request.user.sub, invited.id, invitedRole]);
      await client.query("commit");
      publish(invited.id, "membership", { roomId: room.rows[0].id, status: "invited" });
      return reply.code(201).send({ room: { id: room.rows[0].id, name, kind: "trainer" } });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post("/v1/together/rooms/:id/join", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query(`update together_room_members set status='active',joined_at=now(),updated_at=now()
      where room_id=$1 and owner_user_id=$2 and status='invited' returning room_id`, [request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Room invitation not found." });
    const members = await pool.query("select owner_user_id from together_room_members where room_id=$1 and status='active'", [request.params.id]);
    for (const member of members.rows) publish(member.owner_user_id, "membership", { roomId: request.params.id, status: "active" });
    return { joined: true };
  });

  app.delete("/v1/together/connections/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const result = await pool.query(`update together_connections set status='disconnected',disconnected_at=now(),updated_at=now()
      where id=$1 and status='accepted' and (requester_user_id=$2 or recipient_user_id=$2) returning id`, [request.params.id, request.user.sub]);
    if (!result.rows[0]) return reply.code(404).send({ error: "Active connection not found." });
    return reply.code(204).send();
  });

  app.post("/v1/together/connections/:id/block", { preHandler: app.authenticate }, async (request, reply) => {
    const connection = await pool.query(`select *,case when requester_user_id=$2 then recipient_user_id else requester_user_id end peer_id
      from together_connections where id=$1 and (requester_user_id=$2 or recipient_user_id=$2)`, [request.params.id, request.user.sub]);
    if (!connection.rows[0]) return reply.code(404).send({ error: "Connection not found." });
    if (await isCanonicalOwner(pool, connection.rows[0].peer_id)) return reply.code(403).send({ error: `The North owner @${ownerUsername} cannot be blocked.` });
    await pool.query(`insert into together_blocks(blocker_user_id,blocked_user_id,reason) values($1,$2,$3)
      on conflict(blocker_user_id,blocked_user_id) do update set reason=excluded.reason,created_at=now()`,
    [request.user.sub, connection.rows[0].peer_id, cleanText(request.body?.reason, 500)]);
    await pool.query("update together_connections set status='disconnected',disconnected_at=now(),updated_at=now() where id=$1", [request.params.id]);
    return reply.code(204).send();
  });
}