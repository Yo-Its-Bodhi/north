import assert from "node:assert/strict";
import test from "node:test";
import { exerciseLibrary } from "../src/data/exercises.ts";
import { getApprovedExerciseDemo, getExerciseMedia, priorityExerciseProfiles } from "../src/data/exerciseMedia.ts";

test("priority exercise media queue covers 15 real catalogue movements", () => {
  assert.equal(priorityExerciseProfiles.length, 15);
  assert.equal(new Set(priorityExerciseProfiles.map((name) => name.toLowerCase())).size, 15);
  for (const name of priorityExerciseProfiles) {
    assert.ok(exerciseLibrary.some((exercise) => exercise.name === name), `${name} must resolve in the exercise catalogue`);
    assert.ok(getExerciseMedia(name), `${name} must have a media review record`);
  }
});

test("only form-approved exercise media can be published", () => {
  for (const name of priorityExerciseProfiles) {
    const record = getExerciseMedia(name);
    assert.equal(Boolean(getApprovedExerciseDemo(name)), record?.status === "approved");
  }
  assert.equal(getApprovedExerciseDemo("Incline dumbbell press"), undefined);
});
