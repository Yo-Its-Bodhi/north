import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(String(key), String(value)); }
  removeItem(key) { this.#values.delete(String(key)); }
  clear() { this.#values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const { deleteCurrentNorthDatabase, northRepository, migrateLegacyStorage } = await import("../src/data/northDb.ts");

function useOwner(id) {
  localStorage.setItem("north-account-session-v1", JSON.stringify({ user: { id } }));
}

test("local writes are versioned and queue one current idempotent mutation", async () => {
  useOwner("test-versioning");
  const first = await northRepository.put("workouts", "primary", [{ id: 1 }]);
  const second = await northRepository.put("workouts", "primary", [{ id: 1 }, { id: 2 }]);
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.deepEqual((await northRepository.get("workouts", "primary")).data, [{ id: 1 }, { id: 2 }]);
  const pending = await northRepository.pendingMutations();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].documentKey, "workouts:primary");
  assert.notEqual(pending[0].mutationId, "workouts:primary");
  assert.equal(pending[0].baseVersion, 1);
});

test("each new document revision receives a fresh idempotency key while superseding its unsent predecessor", async () => {
  useOwner("test-idempotency-revisions");
  await northRepository.put("week-plan", "primary", { revision: 1 });
  const first = (await northRepository.pendingMutations())[0];
  await northRepository.put("week-plan", "primary", { revision: 2 });
  const pending = await northRepository.pendingMutations();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].documentKey, "week-plan:primary");
  assert.notEqual(pending[0].mutationId, first.mutationId);
  assert.deepEqual(pending[0].data, { revision: 2 });
});

test("retry preserves a mutation and applies bounded exponential backoff", async () => {
  useOwner("test-retry");
  await northRepository.put("week-plan", "primary", { week: 1 });
  const mutation = (await northRepository.pendingMutations())[0];
  const before = Date.now();
  await northRepository.retry(mutation, "offline");
  const retried = (await northRepository.pendingMutations())[0];
  assert.equal(retried.attempts, 1);
  assert.equal(retried.lastError, "offline");
  assert.ok(new Date(retried.nextAttemptAt).getTime() >= before + 1900);
  assert.ok(new Date(retried.nextAttemptAt).getTime() <= before + 300_000);
});

test("remote acknowledgement replaces local state and clears its outbox entry", async () => {
  useOwner("test-remote");
  await northRepository.put("profile", "primary", { name: "Local" });
  await northRepository.acceptRemote({ key: "profile:primary", collection: "profile", id: "primary", data: { name: "Remote" }, version: 7, updatedAt: new Date().toISOString() });
  assert.deepEqual((await northRepository.get("profile", "primary")).data, { name: "Remote" });
  assert.equal((await northRepository.pendingMutations()).length, 0);
});

test("deletion creates a synchronized tombstone and hides it from collection lists", async () => {
  useOwner("test-delete");
  await northRepository.put("activities", "primary", [{ id: "walk" }], false);
  await northRepository.remove("activities", "primary");
  const tombstone = await northRepository.get("activities", "primary");
  assert.ok(tombstone.deletedAt);
  assert.equal(tombstone.version, 2);
  assert.equal((await northRepository.list("activities")).length, 0);
  assert.equal((await northRepository.pendingMutations())[0].operation, "delete");
});

test("conflicts persist both versions and the member's resolution status", async () => {
  useOwner("test-conflict");
  const now = new Date().toISOString();
  const conflict = {
    conflictId: "conflict-1", documentKey: "week-plan:primary", collection: "week-plan", createdAt: now, status: "open",
    local: { key: "week-plan:primary", collection: "week-plan", id: "primary", data: { source: "local" }, version: 2, updatedAt: now },
    remote: { key: "week-plan:primary", collection: "week-plan", id: "primary", data: { source: "remote" }, version: 3, updatedAt: now },
  };
  await northRepository.addConflict(conflict);
  await northRepository.addConflict({ ...conflict, status: "remote" });
  const saved = await northRepository.conflicts();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].status, "remote");
  assert.deepEqual(saved[0].local.data, { source: "local" });
  assert.deepEqual(saved[0].remote.data, { source: "remote" });
});

test("each account receives an isolated IndexedDB document and outbox namespace", async () => {
  useOwner("owner-a");
  await northRepository.put("profile", "primary", { name: "A" });
  useOwner("owner-b");
  assert.equal(await northRepository.get("profile", "primary"), null);
  await northRepository.put("profile", "primary", { name: "B" });
  useOwner("owner-a");
  assert.deepEqual((await northRepository.get("profile", "primary")).data, { name: "A" });
  useOwner("owner-b");
  assert.deepEqual((await northRepository.get("profile", "primary")).data, { name: "B" });
});

test("erasing a device copy removes both documents and queued writes for only the current account", async () => {
  useOwner("erase-owner-a");
  await northRepository.put("week-plan", "primary", { owner: "A" });
  useOwner("erase-owner-b");
  await northRepository.put("week-plan", "primary", { owner: "B" });
  await deleteCurrentNorthDatabase();
  assert.equal(await northRepository.get("week-plan", "primary"), null);
  assert.equal((await northRepository.pendingMutations()).length, 0);
  useOwner("erase-owner-a");
  assert.deepEqual((await northRepository.get("week-plan", "primary")).data, { owner: "A" });
});

test("legacy local data migrates exactly once without creating upload mutations", async () => {
  useOwner("test-migration");
  localStorage.setItem("north-check-ins-v1", JSON.stringify([{ id: "legacy" }]));
  assert.equal(await migrateLegacyStorage(), true);
  assert.deepEqual((await northRepository.get("check-ins", "primary")).data, [{ id: "legacy" }]);
  assert.equal((await northRepository.pendingMutations()).length, 0);
  assert.equal(await migrateLegacyStorage(), false);
});
