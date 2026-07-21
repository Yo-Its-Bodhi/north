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
  const mutation = (await northRepository.pendingMutations())[0];
  let request;
  globalThis.fetch = async (url, options) => { request = { url, options }; return Response.json({ status: "applied" }); };
  const result = await syncNorth("https://north.example", token);
  assert.deepEqual(result, { sent: 1, conflicts: 0, failed: 0, pending: 0 });
  assert.equal(request.url, "https://north.example/v1/sync/mutations");
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(request.options.headers["Idempotency-Key"], mutation.mutationId);
  assert.notEqual(request.options.headers["Idempotency-Key"], "profile:primary");
  assert.ok(request.options.headers["X-North-Device-ID"]);
  assert.equal((await northRepository.pendingMutations()).length, 0);
});

test("queued account mutations notify the automatic sync scheduler", async () => {
  useOwner("sync-notification");
  const originalWindow = globalThis.window;
  const events = [];
  globalThis.window = new EventTarget();
  window.addEventListener("north:account-change", () => events.push("change"));
  await northRepository.put("week-plan", "primary", { source: "device" });
  globalThis.window = originalWindow;
  assert.deepEqual(events, ["change"]);
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
    { key: "favorite-exercises:primary", collection: "favorite-exercises", id: "primary", data: ["Back squat"], version: 2, updatedAt: new Date().toISOString() },
    { key: "settings:theme", collection: "settings", id: "theme", data: "night", version: 1, updatedAt: new Date().toISOString() },
  ];
  globalThis.fetch = async () => Response.json({ documents, serverTime: "2026-07-14T00:00:00.000Z" });
  const result = await pullNorth("https://north.example", token);
  assert.equal(result.restored, 4);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-profile-v1")), { name: "Restored" });
  assert.deepEqual(JSON.parse(localStorage.getItem("north-favorite-workouts-v1")), ["workout-1"]);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-favorite-exercises-v1")), ["Back squat"]);
  assert.equal(localStorage.getItem("north-theme"), "night");
  assert.deepEqual((await northRepository.get("profile", "primary")).data, { name: "Restored" });
});

test("pull cannot erase a queued local workout plan with a remote deletion", async () => {
  useOwner("sync-queued-plan");
  const plan = [{ id: "monday", title: "My workout", workout: [{ name: "Back squat" }] }];
  await northRepository.put("week-plan", "primary", plan);
  localStorage.setItem("north-week-plan-v1", JSON.stringify(plan));
  globalThis.fetch = async () => Response.json({
    documents: [{ key: "week-plan:primary", collection: "week-plan", id: "primary", data: null, version: 8, updatedAt: new Date().toISOString(), deletedAt: new Date().toISOString() }],
    serverTime: "2026-07-17T00:00:00.000Z",
  });

  const result = await pullNorth("https://north.example", token);

  assert.equal(result.restored, 0);
  assert.deepEqual((await northRepository.get("week-plan", "primary")).data, plan);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-week-plan-v1")), plan);
  assert.equal((await northRepository.pendingMutations()).length, 1);
});

test("first-device hydration replaces queued UI defaults with the real account plan", async () => {
  useOwner("sync-first-hydration");
  const defaultPlan = [{ id: "monday", title: "Default workout" }];
  const accountPlan = [{ id: "monday", title: "PC workout", workout: [{ name: "Back squat" }] }];
  await northRepository.put("week-plan", "primary", defaultPlan);
  localStorage.setItem("north-week-plan-v1", JSON.stringify(defaultPlan));
  globalThis.fetch = async () => Response.json({
    documents: [{ key: "week-plan:primary", collection: "week-plan", id: "primary", data: accountPlan, version: 7, updatedAt: "2026-07-17T12:00:00.000Z" }],
    serverTime: "2026-07-17T12:00:01.000Z",
  });

  const result = await pullNorth("https://north.example", token, "1970-01-01T00:00:00.000Z", true);

  assert.equal(result.restored, 1);
  assert.deepEqual((await northRepository.get("week-plan", "primary")).data, accountPlan);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-week-plan-v1")), accountPlan);
  assert.equal((await northRepository.pendingMutations()).length, 0);
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
