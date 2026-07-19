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
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "North account isolation test", platform: "Test" } });
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { loginNorthAccount, logoutNorthAccount, readNorthSession, withFreshAccess } = await import("../src/data/account.ts");

test("switching accounts clears the previous account projections and adopts the server-issued device identity", async () => {
  const sessions = [
    { user: { id: "owner-a", username: "alpha", displayName: "Alpha", timezone: "UTC" }, device: { id: "11111111-1111-4111-8111-111111111111", name: "Test" }, accessToken: "a", refreshToken: "ar" },
    { user: { id: "owner-b", username: "bravo", displayName: "Bravo", timezone: "UTC" }, device: { id: "22222222-2222-4222-8222-222222222222", name: "Test" }, accessToken: "b", refreshToken: "br" },
  ];
  let call = 0;
  globalThis.fetch = async () => Response.json(sessions[call++]);
  await loginNorthAccount("alpha", "password-one");
  localStorage.setItem("north-week-plan-v1", JSON.stringify([{ owner: "alpha" }]));
  await loginNorthAccount("bravo", "password-two");
  assert.equal(readNorthSession().user.id, "owner-b");
  assert.equal(localStorage.getItem("north-week-plan-v1"), null);
  assert.equal(localStorage.getItem("north-device-id-v1"), sessions[1].device.id);
  assert.equal(localStorage.getItem("north-last-local-owner-v1"), "owner-b");
});

test("signing out removes credentials without deleting the signed-out account's local records", () => {
  localStorage.setItem("north-week-plan-v1", JSON.stringify([{ owner: "bravo" }]));
  logoutNorthAccount();
  assert.equal(readNorthSession(), null);
  assert.deepEqual(JSON.parse(localStorage.getItem("north-week-plan-v1")), [{ owner: "bravo" }]);
});

test("a failed protected operation is not blindly retried and duplicated", async () => {
  globalThis.fetch = async () => Response.json({ user: { id: "owner-c", username: "charlie", displayName: "Charlie", timezone: "UTC" }, device: { id: "33333333-3333-4333-8333-333333333333", name: "Test" }, accessToken: "not-expiring-test-token", refreshToken: "cr" });
  await loginNorthAccount("charlie", "password-three");
  let attempts = 0;
  await assert.rejects(() => withFreshAccess(async () => { attempts += 1; throw new Error("server write response was lost"); }), /response was lost/);
  assert.equal(attempts, 1);
});
