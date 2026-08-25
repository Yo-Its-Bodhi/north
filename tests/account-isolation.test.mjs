import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

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

const { loginNorthAccount, logoutNorthAccount, northSessionIsAdmin, readNorthSession, withFreshAccess } = await import("../src/data/account.ts");

test("admin access follows the owner flag returned inside the session user", () => {
  assert.equal(northSessionIsAdmin({ user: { id: "owner", username: "druwbi", displayName: "Dru", timezone: "UTC", isAdmin: true }, accessToken: "access", refreshToken: "refresh" }), true);
  assert.equal(northSessionIsAdmin({ user: { id: "member", username: "member", displayName: "Member", timezone: "UTC", isAdmin: false }, accessToken: "access", refreshToken: "refresh" }), false);
});

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

test("signing out clears unscoped account projections before another member uses the browser", () => {
  localStorage.setItem("north-week-plan-v1", JSON.stringify([{ owner: "bravo" }]));
  logoutNorthAccount();
  assert.equal(readNorthSession(), null);
  assert.equal(localStorage.getItem("north-week-plan-v1"), null);
  assert.equal(localStorage.getItem("north-last-local-owner-v1"), "owner-b");
});

test("a successful non-session response is rejected before account persistence", async () => {
  globalThis.fetch = async () => new Response("<html>North</html>", { status: 200, headers: { "Content-Type": "text/html" } });
  await assert.rejects(() => loginNorthAccount("alpha", "password-one"), /account API is not running/);
  assert.equal(readNorthSession(), null);
});

test("local production previews proxy account routes to the North API", () => {
  assert.match(viteConfig, /preview:\s*\{[\s\S]*"\/v1":\s*\{/);
  assert.match(viteConfig, /env\.NORTH_PREVIEW_API_TARGET\s*\|\|\s*"https:\/\/north\.bodhix\.io"/);
});

test("new-account onboarding starts from clean defaults while synchronization is paused", () => {
  assert.match(appSource, /function completeOnboarding[\s\S]*setAccountDataReady\(false\)/);
  assert.match(appSource, /const nextPlan = initialWeekPlan\(\)\.map/);
  assert.doesNotMatch(appSource, /function completeOnboarding[\s\S]{0,1000}setWeeklyPlan\(\(days\)/);
  assert.match(appSource, /setTourStep\(-1\)/);
  assert.doesNotMatch(appSource, /updateNoticeOpen|release-update-notice/);
});

test("account hydration releases local data before remote restoration", () => {
  assert.match(
    appSource,
    /await migrateLegacyStorage\(\);[\s\S]{0,500}setAccountDataReady\(true\);[\s\S]{0,100}await ensureNorthTimezone\(\)/,
  );
});

test("a failed protected operation is not blindly retried and duplicated", async () => {
  globalThis.fetch = async () => Response.json({ user: { id: "owner-c", username: "charlie", displayName: "Charlie", timezone: "UTC" }, device: { id: "33333333-3333-4333-8333-333333333333", name: "Test" }, accessToken: "not-expiring-test-token", refreshToken: "cr" });
  await loginNorthAccount("charlie", "password-three");
  let attempts = 0;
  await assert.rejects(() => withFreshAccess(async () => { attempts += 1; throw new Error("server write response was lost"); }), /response was lost/);
  assert.equal(attempts, 1);
});

test("an unexpectedly unauthorized operation refreshes once and retries", async () => {
  const refreshedSession = { user: { id: "owner-c", username: "charlie", displayName: "Charlie", timezone: "UTC" }, device: { id: "33333333-3333-4333-8333-333333333333", name: "Test" }, accessToken: "refreshed-access", refreshToken: "refreshed-refresh" };
  let refreshes = 0;
  globalThis.fetch = async () => { refreshes += 1; return Response.json(refreshedSession); };
  const tokens = [];
  const result = await withFreshAccess(async (token) => {
    tokens.push(token);
    if (tokens.length === 1) throw Object.assign(new Error("Unauthorized"), { status: 401 });
    return "restored";
  });

  assert.equal(result, "restored");
  assert.equal(refreshes, 1);
  assert.deepEqual(tokens, ["not-expiring-test-token", "refreshed-access"]);
  assert.equal(readNorthSession().accessToken, "refreshed-access");
});
