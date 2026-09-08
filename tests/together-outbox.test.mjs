import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
localStorage.setItem("north-account-session-v1", JSON.stringify({ user: { id: "outbox-owner" } }));
const { northRepository } = await import("../src/data/northDb.ts");
const collection = "together-outbox";

test("Together outbox persists one non-synced message per client ID", async () => {
  const message = { clientMessageId: "11111111-1111-4111-8111-111111111111", roomId: "room-a", body: "Still there?", createdAt: new Date().toISOString() };
  await northRepository.put(collection, message.clientMessageId, message, false);
  await northRepository.put(collection, message.clientMessageId, { ...message, body: "Updated before delivery" }, false);
  const queued = await northRepository.list(collection);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].data.body, "Updated before delivery");
  assert.deepEqual(await northRepository.pendingMutations(), []);
});

test("Together outbox removes only the locally acknowledged message", async () => {
  await northRepository.remove(collection, "11111111-1111-4111-8111-111111111111", false);
  assert.deepEqual(await northRepository.list(collection), []);
});