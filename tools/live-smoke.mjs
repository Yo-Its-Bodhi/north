import assert from "node:assert/strict";

const base = (process.env.NORTH_LIVE_BASE || "https://north.bodhix.io").replace(/\/$/, "");
const checks = [];

async function check(name, operation) {
  const started = performance.now();
  await operation();
  checks.push({ name, milliseconds: Math.round(performance.now() - started) });
}

await check("public application shell", async () => {
  const response = await fetch(base, { redirect: "manual" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="root"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /assets\/index-[^"']+\.js/);
});

await check("API health contract", async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "north-api" });
});

await check("invalid login is rejected without leaking account existence", async () => {
  const response = await fetch(`${base}/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", "X-North-Device-ID": "live-smoke-device", "X-North-Device-Name": "Live smoke" }, body: JSON.stringify({ username: `missing-${Date.now()}`, password: "not-a-valid-password" }) });
  assert.ok([400, 401].includes(response.status), `expected 400/401, received ${response.status}`);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.doesNotMatch(body.error, /sql|postgres|stack|select |relation /i);
});

await check("protected member sync rejects anonymous requests", async () => {
  for (const path of ["/v1/sync/documents", "/v1/me/devices", "/v1/me"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 401, `${path} should require authentication`);
  }
});

await check("owner administration rejects anonymous requests", async () => {
  const response = await fetch(`${base}/v1/admin/overview`);
  assert.equal(response.status, 401);
});

await check("security headers are present on the public shell", async () => {
  const response = await fetch(base);
  assert.match(response.headers.get("strict-transport-security") || "", /max-age=/i);
  assert.ok(response.headers.get("content-security-policy"), "Content-Security-Policy is required");
  assert.match(response.headers.get("x-content-type-options") || "", /nosniff/i);
  assert.ok(response.headers.get("referrer-policy"), "Referrer-Policy is required");
});

await check("install assets are available", async () => {
  for (const path of ["/manifest.webmanifest", "/icon.svg", "/sw.js"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, `${path} is unavailable`);
  }
});

await check("live service worker excludes private routes and authorization-bearing requests", async () => {
  const response = await fetch(`${base}/sw.js`, { headers: { "Cache-Control": "no-cache" } });
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.match(source, /pathname\.startsWith\("\/v1\/"\)/);
  assert.match(source, /pathname\.startsWith\("\/admin"\)/);
  assert.match(source, /headers\.has\("authorization"\)/);
});

console.log(JSON.stringify({ base, passed: checks.length, checks }, null, 2));
