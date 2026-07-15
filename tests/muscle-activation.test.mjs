import assert from "node:assert/strict";
import test from "node:test";
import { combineMuscleActivations, getMuscleActivation } from "../src/data/muscleActivations.ts";
import { exerciseLibrary } from "../src/data/exercises.ts";

test("common movement families receive exercise-specific muscle roles", () => {
  const bench = getMuscleActivation({ name: "Barbell bench press", category: "Chest" });
  assert.deepEqual(bench.primary, ["chest"]);
  assert.ok(bench.secondary.includes("triceps"));
  assert.ok(bench.secondary.includes("front-delts"));

  const deadlift = getMuscleActivation({ name: "Conventional deadlift", category: "Back" });
  assert.ok(deadlift.primary.includes("glutes"));
  assert.ok(deadlift.primary.includes("hamstrings"));
  assert.ok(deadlift.supporting.includes("forearms"));

  const squat = getMuscleActivation({ name: "Back squat", category: "Quads" });
  assert.ok(squat.primary.includes("quads"));
  assert.ok(squat.secondary.includes("glutes"));
});

test("combined workout activation keeps each muscle in its strongest role", () => {
  const combined = combineMuscleActivations([
    { primary: ["chest"], secondary: ["triceps"], supporting: ["abs"] },
    { primary: ["triceps"], secondary: ["front-delts"], supporting: ["chest"] },
  ]);
  assert.ok(combined.primary.includes("chest"));
  assert.ok(combined.primary.includes("triceps"));
  assert.ok(!combined.secondary.includes("triceps"));
  assert.ok(!combined.supporting.includes("chest"));
});

test("specific shoulder and lower-leg movements do not fall back to generic regions", () => {
  const lateralRaise = getMuscleActivation({ name: "Dumbbell lateral raise", category: "Shoulders" });
  assert.deepEqual(lateralRaise.primary, ["side-delts"]);

  const tibialisRaise = getMuscleActivation({ name: "Tibialis raise", category: "Calves" });
  assert.deepEqual(tibialisRaise.primary, ["tibialis"]);

  const adduction = getMuscleActivation({ name: "Hip adduction machine", category: "Glutes" });
  assert.deepEqual(adduction.primary, ["adductors"]);
});

test("leg curls resolve as hamstrings before the generic arm-curl rule", () => {
  for (const name of ["Seated leg curl", "Lying leg curl", "Standing single-leg curl", "Nordic hamstring curl"]) {
    const activation = getMuscleActivation({ name, category: "Hamstrings" });
    assert.deepEqual(activation.primary, ["hamstrings"], `${name} must highlight the back thighs`);
    assert.ok(!activation.primary.includes("biceps") && !activation.secondary.includes("biceps"), `${name} must never highlight the arms`);
  }
});

test("every catalogue movement resolves to valid non-conflicting muscle regions", () => {
  const known = new Set(["chest", "front-delts", "side-delts", "rear-delts", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats", "lower-back", "glutes", "quads", "adductors", "hamstrings", "calves", "tibialis"]);
  const allowedPrimary = {
    Chest: new Set(["chest"]), Back: new Set(["lats", "glutes", "hamstrings", "lower-back"]), Shoulders: new Set(["front-delts", "side-delts", "rear-delts"]),
    Biceps: new Set(["biceps"]), Triceps: new Set(["triceps"]), Quads: new Set(["quads"]), Hamstrings: new Set(["hamstrings", "glutes"]),
    Glutes: new Set(["glutes", "adductors", "hamstrings"]), Calves: new Set(["calves", "tibialis"]), Core: new Set(["abs", "obliques"]),
    Conditioning: new Set(["quads", "hamstrings", "calves"]), Mobility: new Set(),
  };
  for (const exercise of exerciseLibrary) {
    const activation = getMuscleActivation(exercise);
    const all = [...activation.primary, ...activation.secondary, ...activation.supporting];
    assert.equal(new Set(all).size, all.length, `${exercise.name} repeats a muscle across roles`);
    for (const region of all) assert.ok(known.has(region), `${exercise.name} returned unknown region ${region}`);
    if (exercise.category !== "Mobility") assert.ok(activation.primary.length > 0, `${exercise.name} needs a primary muscle`);
    const allowed = allowedPrimary[exercise.category];
    if (allowed) for (const region of activation.primary) assert.ok(allowed.has(region), `${exercise.name} has implausible primary ${region} for ${exercise.category}`);
  }
});
