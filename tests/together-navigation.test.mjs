import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const runtimeStyles = await readFile(new URL("../src/styles/runtime-07.css", import.meta.url), "utf8");

test("Together uses the mobile topbar and remains in the desktop rail", () => {
  assert.match(appSource, /topbar-account-button chat/);
  assert.match(appSource, /id: "together"[^\n]+desktopOnly: true/);
  assert.match(appSource, /style=\{\{ borderRadius: 12, color: "var\(--blue\)" \}\}/);
  assert.match(runtimeStyles, /@media\(min-width:1024px\)\{\s*button\.chat\{display:none\}/);
  assert.match(runtimeStyles, /\.primary-nav \.desktop-only-nav-item\{display:flex\}/);
  assert.doesNotMatch(runtimeStyles, /grid-template-columns:repeat\(6/);
});
