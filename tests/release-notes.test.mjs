import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("North 0.6 leads with Training Atlas and preserves release history", () => {
  assert.match(appSource, /north-0\.6-the-whole-picture/);
  assert.match(appSource, /version: "0\.6"/);
  assert.match(appSource, /Introducing Training Atlas\./);
  assert.match(appSource, /The first seven days of NORTH: ORIGINALS\./);
  assert.ok(appSource.indexOf('version: "0.6"') < appSource.indexOf('version: "0.5"'));
});

test("updates begin as a compact notice and remain available in Settings", () => {
  assert.match(appSource, /const \[releaseHistoryOpen, setReleaseNotesOpen\] = useState\(false\)/);
  assert.match(appSource, /North 0\.6 is here/);
  assert.match(appSource, /className="whats-new-card"/);
  assert.match(appSource, /North 0\.6 · The Whole Picture/);
  assert.match(appSource, /View updates/);
});
