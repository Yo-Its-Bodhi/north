import assert from "node:assert/strict";

const base = "https://north.bodhix.io";
const suffix = `${Date.now()}`.slice(-9);
const username = `synctest${suffix}`;
const password = `North-test-${suffix}!`;
const deviceId = crypto.randomUUID();
const deviceHeaders = { "X-North-Device-ID": deviceId, "X-North-Device-Name": "Automated sync contract" };
async function requireStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label}: ${response.status} ${await response.text()}`);
}

const registration = await fetch(`${base}/v1/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...deviceHeaders },
  body: JSON.stringify({ username, password, displayName: "Sync Test", timezone: "UTC" }),
});
await requireStatus(registration, 201, "registration failed");
const session = await registration.json();
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`, ...deviceHeaders };
const plan = [{ id: "day-1", date: "2026-07-17", title: "Production sync proof", workout: [{ name: "Back squat", sets: 3 }] }];

const mutation = await fetch(`${base}/v1/sync/mutations`, {
  method: "POST",
  headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
  body: JSON.stringify({ mutationId: crypto.randomUUID(), documentKey: "week-plan:primary", collection: "week-plan", operation: "put", data: plan, baseVersion: 0, createdAt: new Date().toISOString(), attempts: 0, nextAttemptAt: new Date().toISOString() }),
});
await requireStatus(mutation, 200, "mutation failed");

const pull = await fetch(`${base}/v1/sync/documents?since=1970-01-01T00%3A00%3A00.000Z`, { headers });
await requireStatus(pull, 200, "pull failed");
const payload = await pull.json();
const saved = payload.documents.find((document) => document.key === "week-plan:primary");
assert.ok(saved, "week plan was not returned");
assert.ok(Array.isArray(saved.data), `week plan came back as ${typeof saved.data}, not an array`);
assert.deepEqual(saved.data, plan);

const removal = await fetch(`${base}/v1/me`, { method: "DELETE", headers: { Authorization: `Bearer ${session.accessToken}`, ...deviceHeaders } });
assert.equal(removal.status, 204, `cleanup failed: ${removal.status}`);
console.log(`LIVE_SYNC_ARRAY_OK ${saved.data[0].title}`);
