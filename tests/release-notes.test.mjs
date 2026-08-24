import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const releaseNotes = JSON.parse(readFileSync(new URL("../public/release-notes.json", import.meta.url), "utf8"));
const serviceWorkerSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("North 0.8 introduces Together while preserving release history", () => {
  assert.match(appSource, /north-0\.8-together/);
  assert.deepEqual(releaseNotes.map((release) => release.version), ["0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1"]);
  assert.deepEqual(releaseNotes[1].items.map((item) => item.title), [
    "Ask the new AI North Guide.",
    "Charts you can actually read.",
    "Make the record worth sharing.",
    "Journey owns the whole story.",
    "See twelve weeks without pretending they are fixed.",
    "You is personal. Account is operational.",
    "Connected health now explains itself.",
    "Your active workout stays yours.",
    "Timed holds, without timer ceremony.",
    "A major interface pass, everywhere.",
  ]);
  assert.deepEqual(releaseNotes[0].items.map((item) => item.title), [
    "Continue conversations across devices.",
    "Connect by exact username.",
    "Useful rooms, not an endless feed.",
    "Share training work deliberately.",
    "Received workouts stay independent.",
    "Notifications remain under your control.",
    "Privacy boundaries stay explicit.",
    "Safety and ownership are built in.",
  ]);
  for (const release of releaseNotes) {
    assert.equal(typeof release.eyebrow, "string");
    assert.equal(typeof release.title, "string");
    assert.ok(release.items.length > 0);
    assert.ok(release.items.every((item) => item.title && item.detail));
  }
});

test("updates begin as a compact notice and remain available in Settings", () => {
  assert.match(appSource, /const \[releaseHistoryOpen, setReleaseNotesOpen\] = useState\(false\)/);
  assert.match(appSource, /const \[releaseNotes, setReleaseNotes\] = useState<ReleaseNote\[]>\(\[\]\)/);
  assert.match(appSource, /fetch\("\/release-notes\.json"\)/);
  assert.match(appSource, /if \(!Array\.isArray\(payload\)\)/);
  assert.match(appSource, /if \(!release\) return null/);
  assert.match(appSource, /North 0\.8 is here/);
  assert.match(appSource, /className="whats-new-card"/);
  assert.match(appSource, /North 0\.8 · Together/);
  assert.match(appSource, /View updates/);
  assert.match(serviceWorkerSource, /"\/release-notes\.json"/);
});
