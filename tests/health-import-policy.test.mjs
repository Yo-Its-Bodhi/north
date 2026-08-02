import test from "node:test";
import assert from "node:assert/strict";
import { healthExerciseKind, isPurposefulExercise, recordStartsAfterConnection, recordingMethodName } from "../server/health-policy.mjs";

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