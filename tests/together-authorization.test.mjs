import test from "node:test";
import assert from "node:assert/strict";
import { registerTogetherRoutes, togetherPushPayload } from "../server/together-routes.mjs";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const ROOM_ID = "22222222-2222-4222-8222-222222222222";
const MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_ID = "44444444-4444-4444-8444-444444444444";

function routeHarness(queryResults) {
  const routes = new Map();
  const queries = [];
  const pool = {
    async query(sql, values = []) {
      queries.push({ sql, values });
      const next = queryResults.shift();
      if (!next) throw new Error(`Unexpected query: ${sql}`);
      return { rows: next, rowCount: next.length };
    },
  };
  const app = {
    authenticate() {},
    requireAdmin() {},
    log: { warn() {}, error() {} },
    addHook() {},
    get(path, options, handler) { routes.set(`GET ${path}`, handler ?? options); },
    post(path, options, handler) { routes.set(`POST ${path}`, handler ?? options); },
    patch(path, options, handler) { routes.set(`PATCH ${path}`, handler ?? options); },
    delete(path, options, handler) { routes.set(`DELETE ${path}`, handler ?? options); },
  };
  registerTogetherRoutes(app, { pool });
  return { routes, queries };
}

function replyHarness() {
  return {
    statusCode: 200,
    payload: undefined,
    code(statusCode) { this.statusCode = statusCode; return this; },
    send(payload) { this.payload = payload; return this; },
  };
}

test("a non-participant cannot read another room's history", async () => {
  const { routes, queries } = routeHarness([[], []]);
  const reply = replyHarness();
  await routes.get("GET /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID },
    params: { id: ROOM_ID },
    query: {},
  }, reply);

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.payload, { error: "Conversation not found." });
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[1].values, [ROOM_ID, MEMBER_ID]);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /from together_messages m/i);
});

test("a block by either direct-message participant prevents insertion", async () => {
  const access = { id: ROOM_ID, connection_id: "44444444-4444-4444-8444-444444444444", kind: "direct", name: "Private", member_status: "active", posting_policy: "members", slow_mode_seconds: 0, role: "member" };
  const { routes, queries } = routeHarness([[], [access], [{ exists: 1 }]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID },
    account: { is_admin: false },
    params: { id: ROOM_ID },
    body: { clientMessageId: MESSAGE_ID, kind: "text", body: "This must not be stored." },
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.deepEqual(reply.payload, { error: "Messages are unavailable for this connection." });
  assert.equal(queries.length, 3);
  assert.deepEqual(queries[2].values, [MEMBER_ID, ROOM_ID]);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /insert into together_messages/i);
});

test("an invited trainer-room member cannot read messages before joining", async () => {
  const { routes, queries } = routeHarness([[], []]);
  const reply = replyHarness();
  await routes.get("GET /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID },
    params: { id: ROOM_ID },
    query: {},
  }, reply);

  assert.equal(reply.statusCode, 404);
  assert.match(queries[1].sql, /rm\.status='active'/);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /from together_messages m/i);
});

test("a surviving participant can read anonymized history after peer account deletion", async () => {
  const access = { id: ROOM_ID, connection_id: null, kind: "direct", name: "Private", member_status: "active", role: "member" };
  const { routes, queries } = routeHarness([[], [access], []]);
  const reply = replyHarness();
  const result = await routes.get("GET /v1/together/rooms/:id/messages")({ user: { sub: MEMBER_ID }, params: { id: ROOM_ID }, query: {} }, reply);

  assert.equal(reply.statusCode, 200);
  assert.deepEqual(result.messages, []);
  assert.equal(result.room.id, ROOM_ID);
  assert.match(queries[2].sql, /left join app_users u on u\.id=m\.sender_user_id/);
});

test("an orphaned direct room rejects new sends", async () => {
  const access = { id: ROOM_ID, connection_id: null, kind: "direct", name: "Private", member_status: "active", posting_policy: "members", slow_mode_seconds: 0, role: "member" };
  const { routes, queries } = routeHarness([[], [access]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID },
    body: { clientMessageId: MESSAGE_ID, kind: "text", body: "No recipient remains." },
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.deepEqual(reply.payload, { error: "This connection is no longer available." });
  assert.equal(queries.length, 2);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /insert into together_messages/i);
});

test("North Updates stays read-only for ordinary members", async () => {
  const access = { id: ROOM_ID, kind: "updates", name: "North Updates", member_status: "active", posting_policy: "read_only", slow_mode_seconds: 0, role: "member" };
  const { routes } = routeHarness([[], [access], []]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID },
    body: { clientMessageId: MESSAGE_ID, kind: "text", body: "Not an owner update." },
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.deepEqual(reply.payload, { error: "This room is read-only." });
});

test("the canonical owner passes the North Updates read-only gate", async () => {
  const access = { id: ROOM_ID, kind: "updates", name: "North Updates", member_status: "active", posting_policy: "read_only", slow_mode_seconds: 0, role: "member" };
  const { routes } = routeHarness([[], [access], [{ exists: 1 }]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: OWNER_ID }, account: { is_admin: true }, params: { id: ROOM_ID },
    body: { clientMessageId: "invalid-after-owner-gate", kind: "text", body: "Owner update." },
  }, reply);

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, { error: "A valid client message ID is required." });
});

test("a reply cannot attach a message from another conversation", async () => {
  const access = { id: ROOM_ID, kind: "general", name: "General", member_status: "active", posting_policy: "members", slow_mode_seconds: 0, role: "member" };
  const { routes, queries } = routeHarness([[], [access], []]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID },
    body: { clientMessageId: MESSAGE_ID, replyToMessageId: OWNER_ID, kind: "text", body: "Cross-room reply." },
  }, reply);

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, { error: "The message being replied to is not in this conversation." });
  assert.deepEqual(queries[2].values, [OWNER_ID, ROOM_ID]);
  assert.match(queries[2].sql, /message\.id=\$1 and message\.room_id=\$2/);
});

test("a deduplicated send retains the authenticated sender identity", async () => {
  const access = { id: ROOM_ID, kind: "general", name: "General", member_status: "active", posting_policy: "members", slow_mode_seconds: 0, role: "member" };
  const existing = { id: MESSAGE_ID, room_id: ROOM_ID, sender_user_id: MEMBER_ID, client_message_id: MESSAGE_ID, kind: "text", body: "Still me", created_at: new Date().toISOString() };
  const { routes } = routeHarness([[], [access], [existing]]);
  const result = await routes.get("POST /v1/together/rooms/:id/messages")({
    user: { sub: MEMBER_ID, username: "member" }, account: { display_name: "Member Name", is_admin: false }, params: { id: ROOM_ID },
    body: { clientMessageId: MESSAGE_ID, kind: "text", body: "Still me" },
  }, replyHarness());

  assert.deepEqual(result.message.sender, { id: MEMBER_ID, username: "member", displayName: "Member Name" });
  assert.equal(result.deduplicated, true);
});

test("Push payloads hide message text by default and deep-link to the exact room", () => {
  const hidden = togetherPushPayload({ title: "New direct message", preview: "Private training detail", previewMessageText: false, roomId: ROOM_ID });
  const visible = togetherPushPayload({ title: "New direct message", preview: "Private training detail", previewMessageText: true, roomId: ROOM_ID });

  assert.equal(hidden.body, "Open North to view this update.");
  assert.doesNotMatch(JSON.stringify(hidden), /Private training detail/);
  assert.equal(visible.body, "Private training detail");
  assert.equal(hidden.url, `/?open=together&room=${ROOM_ID}`);
});

test("ordinary public-room members cannot change moderation settings", async () => {
  const access = { id: ROOM_ID, kind: "general", role: "member", member_status: "active" };
  const { routes, queries } = routeHarness([[access]]);
  const reply = replyHarness();
  await routes.get("PATCH /v1/together/rooms/:id/moderation")({ user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID }, body: { slowModeSeconds: 30 } }, reply);

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.payload, { error: "Moderated public room not found." });
  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0].sql, /update together_rooms/i);
});

test("a public-room moderator can set bounded slow mode", async () => {
  const access = { id: ROOM_ID, kind: "help", role: "moderator", member_status: "active" };
  const { routes, queries } = routeHarness([[access], []]);
  const reply = replyHarness();
  const result = await routes.get("PATCH /v1/together/rooms/:id/moderation")({ user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID }, body: { slowModeSeconds: 30 } }, reply);

  assert.deepEqual(result, { slowModeSeconds: 30 });
  assert.match(queries[1].sql, /update together_rooms set slow_mode_seconds/);
  assert.deepEqual(queries[1].values, [30, ROOM_ID]);
});

test("a trainer-room member cannot invite another person", async () => {
  const access = { id: ROOM_ID, kind: "trainer", role: "member", member_status: "active" };
  const { routes, queries } = routeHarness([[access]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/members")({ user: { sub: MEMBER_ID }, params: { id: ROOM_ID }, body: { username: "someone" } }, reply);

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.payload, { error: "Private trainer room not found." });
  assert.equal(queries.length, 1);
});

test("a trainer-room owner can invite another person", async () => {
  const access = { id: ROOM_ID, kind: "trainer", role: "owner", member_status: "active" };
  const invited = { id: OWNER_ID, username: "someone", display_name: "Someone" };
  const { routes, queries } = routeHarness([[access], [invited], [{ room_id: ROOM_ID }]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/rooms/:id/members")({ user: { sub: MEMBER_ID }, params: { id: ROOM_ID }, body: { username: "someone", role: "member" } }, reply);

  assert.equal(reply.statusCode, 201);
  assert.deepEqual(reply.payload.member, { id: OWNER_ID, username: "someone", displayName: "Someone", role: "member", status: "invited" });
  assert.match(queries[2].sql, /status='invited'/);
});

test("a trainer-room owner can remove an invited participant", async () => {
  const access = { id: ROOM_ID, kind: "trainer", role: "owner", member_status: "active" };
  const { routes, queries } = routeHarness([[access], [{ owner_user_id: OWNER_ID }]]);
  const reply = replyHarness();
  await routes.get("DELETE /v1/together/rooms/:id/members/:userId")({ user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID, userId: OWNER_ID }, body: { reason: "Invitation withdrawn" } }, reply);

  assert.equal(reply.statusCode, 204);
  assert.match(queries[1].sql, /status in \('active','invited'\)/);
  assert.match(queries[1].sql, /role<>'owner'/);
});

test("the canonical owner cannot be removed from a curated room", async () => {
  const access = { id: ROOM_ID, kind: "general", role: "moderator", member_status: "active" };
  const { routes, queries } = routeHarness([[access], [{ exists: 1 }]]);
  const reply = replyHarness();
  await routes.get("DELETE /v1/together/rooms/:id/members/:userId")({
    user: { sub: MEMBER_ID }, account: { is_admin: false }, params: { id: ROOM_ID, userId: OWNER_ID }, body: { reason: "Attempted removal" },
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.match(reply.payload.error, /owner @druwbi cannot be removed/i);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /set status='removed'/i);
});

test("the canonical owner cannot be blocked", async () => {
  const connection = { id: ROOM_ID, requester_user_id: MEMBER_ID, recipient_user_id: OWNER_ID, peer_id: OWNER_ID };
  const { routes, queries } = routeHarness([[connection], [{ exists: 1 }]]);
  const reply = replyHarness();
  await routes.get("POST /v1/together/connections/:id/block")({
    user: { sub: MEMBER_ID }, params: { id: ROOM_ID }, body: { reason: "Attempted block" },
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.match(reply.payload.error, /owner @druwbi cannot be blocked/i);
  assert.doesNotMatch(queries.map(({ sql }) => sql).join("\n"), /insert into together_blocks/i);
});

test("a participant cannot remove another sender's message", async () => {
  const { routes, queries } = routeHarness([[]]);
  const reply = replyHarness();
  await routes.get("DELETE /v1/together/messages/:id")({ user: { sub: MEMBER_ID }, params: { id: MESSAGE_ID } }, reply);

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.payload, { error: "Message not found." });
  assert.deepEqual(queries[0].values, [MESSAGE_ID, MEMBER_ID]);
  assert.match(queries[0].sql, /message\.sender_user_id=\$2/);
});

test("the sender can replace a shared item with a participant-visible tombstone", async () => {
  const removedAt = new Date().toISOString();
  const { routes, queries } = routeHarness([[{ id: MESSAGE_ID, room_id: ROOM_ID, removed_at: removedAt }], [{ owner_user_id: MEMBER_ID }]]);
  const reply = replyHarness();
  await routes.get("DELETE /v1/together/messages/:id")({ user: { sub: MEMBER_ID }, params: { id: MESSAGE_ID } }, reply);

  assert.equal(reply.statusCode, 204);
  assert.match(queries[0].sql, /body='Message removed',shared_payload=null,removed_at=now\(\)/);
  assert.match(queries[1].sql, /status='active'/);
});