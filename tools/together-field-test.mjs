import assert from "node:assert/strict";
import crypto from "node:crypto";

const base = String(process.env.NORTH_FIELD_BASE_URL || "").replace(/\/$/, "");
const destructive = process.env.NORTH_TOGETHER_FIELD_DESTRUCTIVE === "true";
const credentials = {
  a: { username: process.env.NORTH_FIELD_A_USERNAME, password: process.env.NORTH_FIELD_A_PASSWORD },
  b: { username: process.env.NORTH_FIELD_B_USERNAME, password: process.env.NORTH_FIELD_B_PASSWORD },
};

if (!base || !credentials.a.username || !credentials.a.password || !credentials.b.username || !credentials.b.password) {
  throw new Error("Set NORTH_FIELD_BASE_URL and both NORTH_FIELD_A/B_USERNAME and NORTH_FIELD_A/B_PASSWORD values.");
}
if (!destructive) throw new Error("Use disposable accounts and set NORTH_TOGETHER_FIELD_DESTRUCTIVE=true; this test disconnects and blocks them.");
if (credentials.a.username === credentials.b.username) throw new Error("The field test requires two different accounts.");

const devices = {
  aDesktop: crypto.randomUUID(), aMobile: crypto.randomUUID(),
  bDesktop: crypto.randomUUID(), bMobile: crypto.randomUUID(),
};

async function request(path, { token, deviceId, method = "GET", body, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(deviceId ? { "X-North-Device-ID": deviceId, "X-North-Device-Name": "Together field test" } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  assert.ok(expected.includes(response.status), `${method} ${path} returned ${response.status}: ${payload?.error || "unexpected response"}`);
  return payload;
}

async function login(account, deviceId) {
  return request("/v1/auth/login", { deviceId, method: "POST", body: { ...account, timezone: "America/Toronto" } });
}

const [aDesktop, aMobile, bDesktop, bMobile] = await Promise.all([
  login(credentials.a, devices.aDesktop), login(credentials.a, devices.aMobile),
  login(credentials.b, devices.bDesktop), login(credentials.b, devices.bMobile),
]);

const api = (session, deviceId, path, options = {}) => request(path, { token: session.accessToken, deviceId, ...options });
await api(aDesktop, devices.aDesktop, "/v1/together/requests", { method: "POST", body: { username: credentials.b.username }, expected: [201] });
const pending = await api(bMobile, devices.bMobile, "/v1/together/requests");
const connectionRequest = pending.requests.find((item) => item.person.username === credentials.a.username);
assert.ok(connectionRequest, "Account B did not receive Account A's request on its mobile device.");
const accepted = await api(bMobile, devices.bMobile, `/v1/together/requests/${connectionRequest.id}/respond`, { method: "POST", body: { decision: "accept" } });
const roomId = accepted.connection.roomId;
assert.ok(roomId, "Accepting the connection did not create a direct room.");

const aInbox = await api(aMobile, devices.aMobile, "/v1/together/inbox");
assert.ok(aInbox.rooms.some((room) => room.id === roomId), "Account A's second device did not receive the accepted room.");
const firstMessageId = crypto.randomUUID();
const firstBody = `Together field message ${new Date().toISOString()}`;
const first = await api(aDesktop, devices.aDesktop, `/v1/together/rooms/${roomId}/messages`, { method: "POST", body: { clientMessageId: firstMessageId, kind: "text", body: firstBody }, expected: [201] });
const duplicate = await api(aMobile, devices.aMobile, `/v1/together/rooms/${roomId}/messages`, { method: "POST", body: { clientMessageId: firstMessageId, kind: "text", body: firstBody } });
assert.equal(duplicate.deduplicated, true, "Retrying the same client message ID was not deduplicated.");
assert.equal(duplicate.message.id, first.message.id, "Deduplication returned a different canonical message.");

const bHistory = await api(bMobile, devices.bMobile, `/v1/together/rooms/${roomId}/messages`);
assert.equal(bHistory.messages.filter((message) => message.clientMessageId === firstMessageId).length, 1, "Account B did not receive exactly one canonical message.");
const bInbox = await api(bDesktop, devices.bDesktop, "/v1/together/inbox");
assert.ok(bInbox.rooms.find((room) => room.id === roomId)?.unreadCount > 0, "Unread state did not reconcile to Account B's desktop device.");
await api(bMobile, devices.bMobile, `/v1/together/rooms/${roomId}/read`, { method: "POST", body: null, expected: [204] });

const replyBody = `Together field reply ${new Date().toISOString()}`;
await api(bMobile, devices.bMobile, `/v1/together/rooms/${roomId}/messages`, { method: "POST", body: { clientMessageId: crypto.randomUUID(), kind: "text", body: replyBody }, expected: [201] });
const aHistory = await api(aDesktop, devices.aDesktop, `/v1/together/rooms/${roomId}/messages`);
assert.ok(aHistory.messages.some((message) => message.body === replyBody), "Account A's desktop did not receive Account B's mobile reply.");

const workoutMessage = await api(aDesktop, devices.aDesktop, `/v1/together/rooms/${roomId}/messages`, { method: "POST", expected: [201], body: {
  clientMessageId: crypto.randomUUID(), kind: "workout", body: "Shared field-test workout",
  sharedPayload: { template: { name: "Together Field Strength", description: "Disposable release proof", focus: "Strength", goal: "Strength", level: "Beginner", duration: 20, equipment: ["Bodyweight"], location: "Anywhere", exercises: [{ exerciseName: "Bodyweight squat", sets: 2, reps: "8", rest: 60 }] } },
} });
const copied = await api(bDesktop, devices.bDesktop, `/v1/together/messages/${workoutMessage.message.id}/workout-copy`, { method: "POST", body: { copyId: crypto.randomUUID() } });
assert.equal(copied.template.name, "Together Field Strength");
assert.equal(copied.template.source, "personal");

await api(bDesktop, devices.bDesktop, `/v1/together/rooms/${roomId}/notifications`, { method: "PATCH", body: { level: "muted" } });
await api(bDesktop, devices.bDesktop, `/v1/together/rooms/${roomId}/notifications`, { method: "PATCH", body: { level: "all" } });
await api(aDesktop, devices.aDesktop, `/v1/together/connections/${accepted.connection.id}`, { method: "DELETE", expected: [204] });
await api(bMobile, devices.bMobile, `/v1/together/rooms/${roomId}/messages`, { method: "POST", body: { clientMessageId: crypto.randomUUID(), kind: "text", body: "Must be rejected after disconnect" }, expected: [404] });
await api(aDesktop, devices.aDesktop, `/v1/together/connections/${accepted.connection.id}/block`, { method: "POST", body: { reason: "Disposable field-test block" }, expected: [204] });
await api(bDesktop, devices.bDesktop, "/v1/together/requests", { method: "POST", body: { username: credentials.a.username }, expected: [404] });

console.log(JSON.stringify({ passed: true, devices: 4, checks: ["request", "accept", "second-device room", "send", "deduplicate", "unread", "read", "mobile reply", "desktop resume", "workout copy", "mute", "disconnect", "block"] }));