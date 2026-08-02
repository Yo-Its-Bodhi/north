import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveWorkoutCardImage } from "../src/data/workoutCardImage.ts";

test("workout card images follow explicit day and activity names", () => {
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Chest Builder" }), "/png/workoutcards/chestday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Back Builder" }), "/png/workoutcards/backday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Shoulder & Arm Builder" }), "/png/workoutcards/shoulderday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Upper Body Density" }), "/png/workoutcards/upper-body-builder.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Pull Day" }), "/png/workoutcards/pullday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Full Body Strength", equipment: ["Dumbbell", "Dumbbell"] }), "/png/workoutcards/full-body-foundation.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Lower Body Builder", categories: ["Core"] }), "/png/workoutcards/legday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "run", title: "Intervals" }), "/png/workoutcards/runday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "bike", title: "Zone 2" }), "/png/workoutcards/bikeday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "rest", title: "Rest" }), "/png/workoutcards/rest.png");
});

test("workout card images use exercise focus and dominant equipment as evidence", () => {
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Strength", categories: ["Chest", "Chest", "Triceps"] }), "/png/workoutcards/chestday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Strength", equipment: ["Cable", "Cable", "Dumbbell"] }), "/png/workoutcards/cablestationday.png");
  assert.equal(resolveWorkoutCardImage({ kind: "strength", title: "Strength" }), "/png/workoutcards/full-body-foundation.png");
});

test("Today and Training use the same art and overlay implementation", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/destination-reliability.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /src=\{todayWorkoutCardImage\}/);
  assert.match(app, /className="direction-run-art" src=\{selectedWorkoutCardImage\}/);
  assert.match(app, /src=\{selectedWorkoutCardImage\}[^]*className="direction-run-overlay"/);
  assert.match(app, /className=\{`training-hero \$\{selectedPlanDay\.kind\}`\}[^]*src=\{selectedWorkoutCardImage\}/);
  assert.doesNotMatch(app, /training-hero-art/);
  assert.doesNotMatch(css, /training-hero::after|training-hero-art/);
  assert.match(css, /training-hero h2\s*\{[^}]*font-size:\s*clamp\(27px, 4vw, 34px\)/s);
});