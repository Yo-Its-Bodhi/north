import assert from "node:assert/strict";
import test from "node:test";
import { estimatedWorkoutMinutes, fitWorkoutToDuration, workoutTemplates } from "../src/data/workouts.ts";

for (const targetMinutes of [15, 20, 30, 45, 60, 75]) {
  test(`Nova prescriptions fit a ${targetMinutes}-minute workout`, () => {
    const template = workoutTemplates.find((workout) => workout.focus === "Full body" && workout.goal === "General fitness" && workout.duration === targetMinutes);
    assert.ok(template);
    const exercises = fitWorkoutToDuration(template.exercises, targetMinutes);
    const estimated = estimatedWorkoutMinutes({ ...template, exercises });

    assert.ok(Math.abs(estimated - targetMinutes) <= 2, `Expected about ${targetMinutes} minutes, received ${estimated}`);
    assert.ok(Math.max(...exercises.map((exercise) => exercise.sets)) - Math.min(...exercises.map((exercise) => exercise.sets)) <= 1, "Set distribution should stay balanced");
  });
}
