import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workouts = readFileSync(new URL("../src/data/workouts.ts", import.meta.url), "utf8");
const browserSmoke = readFileSync(new URL("../tools/browser-smoke.mjs", import.meta.url), "utf8");

test("weekly review converts canonical distance into the member's selected unit", () => {
  assert.match(app, /displayDistance\(activities\.filter[\s\S]*?<span>\{distanceUnit\} moved<\/span>/);
  assert.doesNotMatch(app, /<span>kilometres<\/span>/);
});

test("active-day milestones require recorded movement rather than a check-in alone", () => {
  const activeDates = app.match(/const activeDates = \[\.\.\.new Set\(\[([\s\S]*?)\]\.filter/)?.[1] ?? "";
  assert.match(activeDates, /history\.map/);
  assert.match(activeDates, /activities\.filter/);
  assert.match(activeDates, /meaningfulHealthActivities/);
  assert.doesNotMatch(activeDates, /checkIns/);
});

test("personal workout duplicates carry safe optional provenance metadata", () => {
  assert.match(workouts, /createdAt\?: string/);
  assert.match(workouts, /duplicatedFromId\?: string/);
  assert.match(app, /Exact duplicate \{duplicate\.position\} of \{duplicate\.count\}/);
});

test("Today browser coverage accepts every supported state-aware welcome", () => {
  assert.match(browserSmoke, /state-aware welcome messages/);
  assert.match(browserSmoke, /There’s room to slow down today/);
  assert.match(browserSmoke, /You showed up for yourself today/);
  assert.match(browserSmoke, /It’s good to see you/);
});
