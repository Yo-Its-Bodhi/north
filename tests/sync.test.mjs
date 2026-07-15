import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(String(key), String(value)); }
  removeItem(key) { this.#values.delete(String(key)); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.location = { hostname: "localhost", origin: "http://localhost" };
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "North automated test", platform: "Test" } });
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { northRepository } = await import("../src/data/northDb.ts");
const { syncNorth, pullNorth, resolveConflict } = await import("../src/data/sync.ts");
const token = "test-access-token";

function useOwner(id) {
  localStorage.setItem("north-account-session-v1", JSON.stringify({ user: { id }, accessToken: token, refreshToken: "refresh" }));
}

test("successful sync sends idempotency and device headers then acknowledges the mutation", async () => {
  useOwner("sync-success");
  await northRepository.put("profile", "primary", { name: "Bodhi" });
  let request;
  globalThis.fetch = async (url, options) => { request = { url, options }; return Response.json({ status: "applied" }); };
  const result = await syncNorth("https://north.example", token);
  assert.deepEqual(result, { sent: 1, conflicts: 0, failed: 0, pending: 0 });
  assert.equal(request.url, "https://north.example/v1/sync/mutations");
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(request.options.headers["Idempotency-Key"], "profile:primary");
  assert.ok(request.options.headers["X-North-Device-ID"]);
  assert.equal((await northRepository.pendingMutations()).length, 0);
});

test("409 creates a durable conflict with the server id and removes the stale mutation", async () => {
  useOwner("sync-conflict");
  const local = await northRepository.put("week-plan", "primary", { source: "local" });
  const remote = { ...local, data: { source: "remote" }, version: 4, updatedAt: new Date().toISOString() };
  globalThis.fetch = async () => Response.json({ status: "conflict", conflictId: "server-conflict", remote }, { status: 409 });
  const result = await syncNorth("https://north.example", token);
  assert.equal(result.conflicts, 1);
  assert.equal(result.pending, 0);
  const conflicts = await northRepository.conflicts();
  assert.equal(conflicts[0].conflictId, "server-conflict");
  assert.deepEqual(conflicts[0].local.data, { source: "local" });
  assert.deepEqual(conflicts[0].remote.data, { source: "remote" });
});

test("network failure leaves the mutation queued with retry evidence", async () => {
  useOwner("sync-retry");
  await northRepository.put("activities", "primary", [{ id: "run" }]);
  globalThis.fetch = async () => { throw new Error("network down"); };
  const result = await syncNorth("https://north.example", token);
  assert.equal(result.failed, 1);
  assert.equal(result.pending, 1);
  const pending = (await northRepository.pendingMutations())[0];
  assert.equal(pending.attempts, 1);
  assert.equal(pending.lastError, "network down");
});

test("pull restores repository documents and their legacy UI storage projections", async () => {
  useOwner("sync-pull");
  const documents = [
    { key: "profile:primary", collection: "profile", id: "primary", data: { name: "Restored" }, version: 3, updatedAt: new Date().toISOString() },
    { key: "favorite-workouts:primary", collection: "favorite-workouts", id: "primary", data: ["workout-1"], version: 2, updatedAt: new Date().toISOString() },
    { key: "settings:theme", collection: "settings", id: "theme", data: "night", version: 1, updatedAt: new Date().toISOString() },
  ];
  globalThis.fetch = async () => Response.json({ documents, serverTime: "2026-07-14T00:00:00.000Z" });
  const result = await pullNorth("https://north.example", token);
  assert.equal(result.restored, 3);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-profile-v1")), { name: "Restored" });
  assert.deepEqual(JSON.parse(localStorage.getItem("north-favorite-workouts-v1")), ["workout-1"]);
  assert.equal(localStorage.getItem("north-theme"), "night");
  assert.deepEqual((await northRepository.get("profile", "primary")).data, { name: "Restored" });
});

test("choosing local conflict content first accepts the remote version then queues a valid replacement", async () => {
  useOwner("sync-resolve-local");
  const now = new Date().toISOString();
  await northRepository.addConflict({
    conflictId: "resolve-1", documentKey: "profile:primary", collection: "profile", createdAt: now, status: "open",
    local: { key: "profile:primary", collection: "profile", id: "primary", data: { name: "Local choice" }, version: 2, updatedAt: now },
    remote: { key: "profile:primary", collection: "profile", id: "primary", data: { name: "Remote choice" }, version: 5, updatedAt: now },
  });
  await resolveConflict("resolve-1", "local");
  const saved = await northRepository.get("profile", "primary");
  assert.deepEqual(saved.data, { name: "Local choice" });
  assert.equal(saved.version, 6);
  const pending = (await northRepository.pendingMutations())[0];
  assert.equal(pending.baseVersion, 5);
  assert.equal((await northRepository.conflicts())[0].status, "local");
});
