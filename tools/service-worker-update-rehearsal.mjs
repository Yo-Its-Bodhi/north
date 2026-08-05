import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";

const dist = join(process.cwd(), "dist");
const chrome = [
  process.env.NORTH_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((candidate) => candidate && existsSync(candidate));
if (!chrome) throw new Error("Chrome or Chromium was not found. Set NORTH_CHROME_PATH to its executable before running the PWA update rehearsal.");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

await stat(join(dist, "index.html")).catch(() => {
  throw new Error("Production assets are missing. Run `npm run build` before the PWA update rehearsal.");
});
const serviceWorkerSource = await readFile(join(dist, "sw.js"), "utf8");
let revision = "a";

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/sw.js") {
      const body = serviceWorkerSource.replace(/north-shell-v\d+/, `north-shell-update-${revision}`);
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "Service-Worker-Allowed": "/" });
      response.end(body);
      return;
    }
    const relativePath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const filePath = normalize(join(dist, relativePath));
    if (!filePath.startsWith(normalize(dist))) throw new Error("Invalid asset path");
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("Could not start the PWA rehearsal server.");
const base = `http://127.0.0.1:${address.port}`;

const survivalMarker = `survives-update-${crypto.randomUUID()}`;
const activeSession = {
  startedAt: "2026-08-05T12:00:00.000Z",
  finishedAt: null,
  currentId: "update-rehearsal-exercise",
  exercises: [{
    id: "update-rehearsal-exercise",
    name: "Update rehearsal press",
    target: "1 set · 8 reps",
    rest: 60,
    previous: "",
    cue: "Keep the active record intact.",
    sets: [{ weight: "77", reps: "8", complete: false }],
    note: survivalMarker,
    passed: false,
  }],
  energy: 3,
  difficulty: 3,
  reflection: "",
};
const account = { user: { id: "sw-update-owner", username: "sw_update", displayName: "Update Rehearsal", timezone: "America/Toronto" }, accessToken: "test", refreshToken: "test" };
let browser;
try {
  browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  await context.addInitScript(({ account, activeSession }) => {
    const initRuns = Number(sessionStorage.getItem("north-sw-update-init-runs") ?? "0") + 1;
    sessionStorage.setItem("north-sw-update-init-runs", String(initRuns));
    localStorage.setItem("north-account-session-v1", JSON.stringify(account));
    localStorage.setItem(`north-onboarding-complete:${account.user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${account.user.id}`, new Date().toISOString());
    localStorage.setItem("north-release-notes-dismissed", "north-0.7-find-your-way");
    if (!sessionStorage.getItem("north-sw-update-fixture-seeded")) {
      localStorage.setItem("north-active-session-v1", JSON.stringify(activeSession));
      sessionStorage.setItem("north-sw-update-fixture-seeded", "true");
      sessionStorage.setItem("north-sw-update-fixture-seed-count", String(Number(sessionStorage.getItem("north-sw-update-fixture-seed-count") ?? "0") + 1));
    }
  }, { account, activeSession });
  await context.route("**/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/sync/mutations")) return route.fulfill({ status: 503, json: { error: "rehearsal-offline" } });
    if (pathname.endsWith("/sync/documents")) return route.fulfill({ json: { documents: [], serverTime: new Date().toISOString() } });
    if (pathname.endsWith("/me/devices")) return route.fulfill({ json: { devices: [], currentDeviceId: "update-rehearsal" } });
    if (pathname.includes("/health/")) return route.fulfill({ json: { connections: [], activities: [], daily: [], types: [] } });
    if (pathname.endsWith("/nova/status")) return route.fulfill({ json: { available: false, mode: "unavailable" } });
    if (pathname.endsWith("/nova/bootstrap")) return route.fulfill({ json: { conversations: [], goals: [], memories: [], pendingProposals: [] } });
    return route.fulfill({ json: {} });
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const revisionALoaded = page.waitForNavigation({ waitUntil: "load" });
  await page.evaluate(async ({ activeSession }) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("north-local-sw-update-owner", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(["documents", "outbox"], "readwrite");
      const updatedAt = new Date().toISOString();
      transaction.objectStore("documents").put({ key: "active-session:primary", collection: "active-session", id: "primary", data: activeSession, version: 1, updatedAt });
      transaction.objectStore("outbox").put({ mutationId: "update-rehearsal-mutation", documentKey: "active-session:primary", collection: "active-session", operation: "put", data: activeSession, baseVersion: 0, createdAt: updatedAt, attempts: 0, nextAttemptAt: updatedAt });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
    setTimeout(() => location.reload(), 0);
  }, { activeSession });
  await revisionALoaded;
  const beforeUpdate = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("north-local-sw-update-owner", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const mutations = await new Promise((resolve, reject) => {
      const request = database.transaction("outbox", "readonly").objectStore("outbox").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return { fixtureGuard: sessionStorage.getItem("north-sw-update-fixture-seeded"), initRuns: Number(sessionStorage.getItem("north-sw-update-init-runs")), seedCount: Number(sessionStorage.getItem("north-sw-update-fixture-seed-count")), storedSession: JSON.parse(localStorage.getItem("north-active-session-v1") ?? "null"), mutations };
  });
  assert.equal(beforeUpdate.fixtureGuard, "true");
  assert.ok(beforeUpdate.initRuns >= 2, "the init script must run again for the revision-A settling reload");
  assert.equal(beforeUpdate.seedCount, 1, "the active-session fixture must be seeded only once before updating");
  assert.equal(beforeUpdate.storedSession.exercises[0].note, survivalMarker, "revision A must load the uniquely marked active workout before updating");
  const pendingBeforeUpdate = beforeUpdate.mutations.find((mutation) => mutation.documentKey === "active-session:primary");
  assert.ok(pendingBeforeUpdate, "revision A must have an unsynced active-session mutation before updating");
  assert.equal(pendingBeforeUpdate.data.exercises[0].note, survivalMarker);

  revision = "b";
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("North service worker was not registered.");
    const previousController = navigator.serviceWorker.controller;
    const controllerChanged = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Release-candidate worker did not take control.")), 10_000);
      navigator.serviceWorker.addEventListener("controllerchange", () => { clearTimeout(timeout); resolve(); }, { once: true });
    });
    await registration.update();
    if (navigator.serviceWorker.controller === previousController) await controllerChanged;
  });
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    return keys.includes("north-shell-update-b") && !keys.includes("north-shell-update-a");
  });
  await page.reload({ waitUntil: "load" });

  const result = await page.evaluate(async () => {
    const storedSession = JSON.parse(localStorage.getItem("north-active-session-v1") ?? "null");
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("north-local-sw-update-owner", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [document, mutations] = await Promise.all([
      new Promise((resolve, reject) => {
        const request = database.transaction("documents", "readonly").objectStore("documents").get("active-session:primary");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = database.transaction("outbox", "readonly").objectStore("outbox").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
    ]);
    database.close();
    return { controlled: navigator.serviceWorker.controller !== null, cacheKeys: await caches.keys(), fixtureGuard: sessionStorage.getItem("north-sw-update-fixture-seeded"), initRuns: Number(sessionStorage.getItem("north-sw-update-init-runs")), seedCount: Number(sessionStorage.getItem("north-sw-update-fixture-seed-count")), storedSession, document, mutations };
  });

  assert.equal(result.controlled, true, "release-candidate worker must control the reloaded app");
  assert.deepEqual(result.cacheKeys.filter((key) => key.startsWith("north-shell-update-")), ["north-shell-update-b"]);
  assert.equal(result.fixtureGuard, "true", "the one-time fixture guard must remain set across the update reload");
  assert.ok(result.initRuns >= 3, "the init script must run on both pre-update and post-update reloads");
  assert.equal(result.seedCount, 1, "reloads must not reseed the active-session fixture");
  assert.equal(result.storedSession.exercises[0].note, survivalMarker, "the update must not replace the active local workout with its bootstrap fixture");
  assert.equal(result.document.data.exercises[0].sets[0].weight, "77");
  assert.ok(result.mutations.some((mutation) => mutation.mutationId === pendingBeforeUpdate.mutationId && mutation.documentKey === "active-session:primary" && mutation.data.exercises[0].note === survivalMarker), "the pre-update unsynced active-session mutation identity and payload must survive the update");
  console.log("Service-worker update rehearsal passed: active workout and unsynced mutation survived revision A to B.");
  await context.close();
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
