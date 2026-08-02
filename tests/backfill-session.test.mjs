import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { backfillSessionTiming } from "../src/data/backfillSession.ts";

test("backfilled sessions preserve performed and recorded dates separately", () => {
  assert.deepEqual(backfillSessionTiming("2026-07-20", "2026-07-27T21:15:00.000Z", "2026-07-27"), {
    performedAt: "2026-07-20T12:00:00",
    recordedAt: "2026-07-27T21:15:00.000Z",
    addedLater: true,
  });
});

test("a session entered for today is not marked as added later", () => {
  assert.equal(backfillSessionTiming("2026-07-27", "2026-07-27T21:15:00.000Z", "2026-07-27").addedLater, false);
});

test("future sessions cannot be backfilled", () => {
  assert.throws(() => backfillSessionTiming("2026-07-28", "2026-07-27T21:15:00.000Z", "2026-07-27"), /not in the future/);
});

test("the training calendar can backfill dated activities as well as strength workouts", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /openActivity\("bike", historyCalendarDate, "workout-history"\)/);
  assert.match(source, /openActivity\("walk", historyCalendarDate, "workout-history"\)/);
  assert.match(source, /openActivity\("run", historyCalendarDate, "workout-history"\)/);
  assert.match(source, /openActivity\("recovery", historyCalendarDate, "workout-history"\)/);
  assert.match(source, /historyCalendarActivities\.map/);
  assert.match(source, /activityReturnScreen === "workout-history" \? "workout-history" : "journey"/);
});