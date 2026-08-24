import test from "node:test";
import assert from "node:assert/strict";
import { healthExerciseKind, isPurposefulExercise, mergeHealthDay, recordStartsAfterConnection, recordingMethodName } from "../server/health-policy.mjs";

test("health imports never cross the immutable connection boundary", () => {
  const connectedAt = "2026-07-28T15:00:00.000Z";
  assert.equal(recordStartsAfterConnection("2026-07-28T14:59:59.999Z", connectedAt), false);
  assert.equal(recordStartsAfterConnection(connectedAt, connectedAt), true);
  assert.equal(recordStartsAfterConnection("2026-07-29T08:00:00.000Z", connectedAt), true);
});

test("only intentional or manually entered exercises become Journey events", () => {
  assert.equal(isPurposefulExercise({ recordingMethod: 1 }), true);
  assert.equal(isPurposefulExercise({ recordingMethod: "manual_entry" }), true);
  assert.equal(isPurposefulExercise({ recordingMethod: 2 }), false);
  assert.equal(isPurposefulExercise({}), false);
  assert.equal(isPurposefulExercise({ exerciseType: 8, recordingMethod: "unknown" }), true);
  assert.equal(isPurposefulExercise({ exerciseType: 56, recordingMethod: "unknown" }), true);
  assert.equal(isPurposefulExercise({ exerciseType: 79, recordingMethod: "unknown" }), false);
  assert.equal(recordingMethodName(2), "automatically_recorded");
});

test("known Health Connect exercise types retain their North identity", () => {
  assert.equal(healthExerciseKind(8), "bike");
  assert.equal(healthExerciseKind(56), "run");
  assert.equal(healthExerciseKind(79), "walk");
  assert.equal(healthExerciseKind(80), "workout");
});

test("zero daily aggregates fall back to real Health Connect records", () => {
  const day = mergeHealthDay({
    date: "2026-08-23",
    steps: 8200,
    distance_metres: 6100,
    active_calories: 0,
    total_calories: 2140,
    active_milliseconds: 3_600_000,
    sleep_minutes: 430,
    summary: { steps: 8200, distance_metres: 0, active_calories: 0, total_calories: 2140, active_minutes: 0 },
  });
  assert.equal(day.distance_metres, 6100);
  assert.equal(day.active_minutes, 60);
  assert.equal(day.active_calories, 2140);
  assert.equal(day.total_calories, 2140);
  assert.equal(day.calories_kind, "total");
});
