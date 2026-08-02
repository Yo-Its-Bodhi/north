import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("North 0.5 is the newest release and uses the NORTH: ORIGINALS name", () => {
  assert.match(appSource, /north-0\.5-built-to-train/);
  assert.match(appSource, /version: "0\.5"/);
  assert.match(appSource, /Introducing NORTH: ORIGINALS\./);
});

test("updates begin as a compact notice and remain available in Settings", () => {
  assert.match(appSource, /const \[releaseHistoryOpen, setReleaseNotesOpen\] = useState\(false\)/);
  assert.match(appSource, /North updated to version 0\.5/);
  assert.match(appSource, /className="whats-new-card"/);
  assert.match(appSource, /View updates/);
});
