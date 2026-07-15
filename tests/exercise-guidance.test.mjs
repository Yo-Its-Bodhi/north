import assert from "node:assert/strict";
import test from "node:test";
import { exerciseLibrary } from "../src/data/exercises.ts";
import { getExerciseGuidance } from "../src/data/exerciseGuidance.ts";

test("every catalogue exercise receives complete technique guidance", () => {
  for (const exercise of exerciseLibrary) {
    const guide = getExerciseGuidance(exercise);
    assert.ok(guide.setup.length >= 2, `${exercise.name} needs setup guidance`);
    assert.ok(guide.execution.length >= 3, `${exercise.name} needs execution guidance`);
    assert.ok(guide.mistakes.length >= 3, `${exercise.name} needs common mistakes`);
    assert.ok(guide.breathing.length > 20, `${exercise.name} needs a breathing cue`);
  }
});

test("major movement families receive distinct guidance", () => {
  assert.notDeepEqual(getExerciseGuidance({ name: "Back squat", movementPattern: "Squat" }), getExerciseGuidance({ name: "Barbell bench press", movementPattern: "Horizontal push" }));
  assert.match(getExerciseGuidance({ name: "Romanian deadlift", movementPattern: "Hinge" }).execution.join(" "), /hips/i);
});
