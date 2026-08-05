import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("North 0.7 covers the complete Find Your Way release while preserving release history", () => {
  assert.match(appSource, /north-0\.7-find-your-way/);
  assert.match(appSource, /version: "0\.7"/);
  assert.match(appSource, /version: "0\.6"/);
  assert.match(appSource, /Ask the new AI North Guide\./);
  assert.match(appSource, /Charts you can actually read\./);
  assert.match(appSource, /Make the record worth sharing\./);
  assert.match(appSource, /Journey owns the whole story\./);
  assert.match(appSource, /You is personal\. Account is operational\./);
  assert.match(appSource, /Connected health now explains itself\./);
  assert.match(appSource, /Timed holds, without timer ceremony\./);
  assert.match(appSource, /A major interface pass, everywhere\./);
  assert.ok(appSource.indexOf('version: "0.7"') < appSource.indexOf('version: "0.6"'));
});

test("updates begin as a compact notice and remain available in Settings", () => {
  assert.match(appSource, /const \[releaseHistoryOpen, setReleaseNotesOpen\] = useState\(false\)/);
  assert.match(appSource, /North 0\.7 is here/);
  assert.match(appSource, /className="whats-new-card"/);
  assert.match(appSource, /North 0\.7 · Find Your Way/);
  assert.match(appSource, /View updates/);
});
