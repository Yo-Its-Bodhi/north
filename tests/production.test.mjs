import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production HTML includes installability and viewport foundations", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /name="viewport"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /id="root"/);
});

test("service worker provides an offline shell without caching authenticated API responses", async () => {
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /caches\.open/);
  assert.match(worker, /request\.method/);
  assert.match(worker, /\/v1\//);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.keys/);
});

test("manifest supports standalone installation and useful launch shortcuts", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some((icon) => String(icon.purpose).includes("maskable")));
  assert.ok(manifest.shortcuts.some((shortcut) => shortcut.url.includes("training")));
});

test("member source has no known mojibake markers", async () => {
  const files = ["App.tsx", "Onboarding.tsx", "SyncCentre.tsx", "styles.css"];
  for (const file of files) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.equal(/[ÂÃ]|â€/.test(source), false, `${file} contains a likely encoding artifact`);
  }
});
