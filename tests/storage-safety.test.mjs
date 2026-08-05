import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { getLatestStorageFailure, reportStorageFailure, storageFailure } = await import("../src/data/storageSafety.ts");

test("quota failures tell the member the latest change was not saved", () => {
  const failure = storageFailure(new DOMException("full", "QuotaExceededError"));
  assert.equal(failure.kind, "quota");
  assert.match(failure.message, /could not save the latest change/i);
  assert.match(failure.message, /free some storage/i);
});

test("blocked or unavailable storage never claims the change is safe", () => {
  const failure = storageFailure(new DOMException("blocked", "SecurityError"));
  assert.equal(failure.kind, "unavailable");
  assert.match(failure.message, /could not confirm the latest change was saved/i);
  assert.doesNotMatch(failure.message, /safely saved/i);
});

test("the member shell exposes an accessible storage warning with a stable dismiss target", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/runtime-05.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /NORTH_STORAGE_FAILURE_EVENT/);
  assert.match(app, /className="storage-warning-banner" role="alert"/);
  assert.match(app, /aria-label="Dismiss storage warning"/);
  assert.match(styles, /\.storage-warning-banner button\{[^}]*min-width:44px[^}]*flex:0 0 44px/);
});

test("a failure remains available when it occurs before the app listener mounts", () => {
  const failure = reportStorageFailure(new DOMException("full", "QuotaExceededError"));
  assert.deepEqual(getLatestStorageFailure(), failure);
});