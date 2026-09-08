import test from "node:test";
import assert from "node:assert/strict";
import { exerciseLibrary } from "../src/data/exercises.ts";
import { migrateWorkoutTemplate, resolveWorkoutTemplateExercise } from "../src/data/workoutExerciseIdentity.ts";
import { productionExerciseLibrary } from "../src/exerciseDatabase/libraryExercises.ts";

test("a V2 exercise keeps its canonical identity through save, schedule, edit, prepare, and completion", () => {
  const legacyNames = new Set(exerciseLibrary.map((exercise) => exercise.name.toLocaleLowerCase()));
  const v2Exercise = productionExerciseLibrary.find((exercise) => !legacyNames.has(exercise.displayName.toLocaleLowerCase()));
  assert.ok(v2Exercise, "the production catalogue should contain a V2-only exercise");

  const built = {
    id: "identity-regression",
    name: "Identity regression",
    description: "Created through Build Workout or Nova",
    focus: "Full body",
    goal: "General fitness",
    level: "Intermediate",
    duration: 45,
    equipment: ["Any equipment"],
    location: "Gym",
    source: "personal",
    exercises: [{ exerciseName: v2Exercise.displayName, canonicalExerciseId: v2Exercise.id, sets: 3, reps: "8–12", rest: 75 }],
  };

  const saved = JSON.parse(JSON.stringify(built));
  const scheduled = JSON.parse(JSON.stringify(migrateWorkoutTemplate(saved)));
  const reloaded = migrateWorkoutTemplate(JSON.parse(JSON.stringify(scheduled)));
  const edited = resolveWorkoutTemplateExercise(reloaded.exercises[0]);
  const prepared = { ...edited, sets: reloaded.exercises[0].sets, reps: reloaded.exercises[0].reps };
  const completed = JSON.parse(JSON.stringify(prepared));

  for (const step of [scheduled.exercises[0], reloaded.exercises[0], edited, prepared, completed]) {
    assert.equal(step.canonicalExerciseId, v2Exercise.id);
    assert.equal(step.exerciseName, v2Exercise.displayName);
  }
});

test("an unknown legacy exercise remains unresolved and is never replaced", () => {
  const originalName = "Unknown legacy movement — preserve me";
  const unresolved = resolveWorkoutTemplateExercise({ exerciseName: originalName });
  assert.equal(unresolved.status, "unresolved");
  assert.equal(unresolved.exerciseName, originalName);
  assert.equal(unresolved.canonicalExerciseId, undefined);
  assert.notEqual(unresolved.exerciseName, exerciseLibrary[0].name);

  const migrated = migrateWorkoutTemplate({
    id: "legacy-unresolved",
    name: "Legacy unresolved",
    description: "",
    focus: "Other",
    goal: "General fitness",
    level: "Beginner",
    duration: 30,
    equipment: ["Unknown"],
    location: "Anywhere",
    exercises: [{ exerciseName: originalName, sets: 3, reps: "10", rest: 60 }],
  });
  assert.deepEqual(migrated.exercises[0], { exerciseName: originalName, canonicalExerciseId: undefined, sets: 3, reps: "10", rest: 60 });
});
