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
  assert.match(css, /data-theme="morning"[^}]*training-hero \.direction-run-art[^}]*opacity: \.82[^}]*brightness\(1\.08\)/s);
  assert.match(css, /data-theme="morning"[^}]*training-hero \.direction-run-overlay[^}]*surface-solid[^}]*mix-blend-mode: normal/s);
  assert.match(css, /today-screen > \.direction-panel \.direction-run-art \{[^}]*opacity: \.88;[^}]*brightness\(1\.04\)/s);
  assert.match(css, /data-theme="morning"[^}]*today-screen > \.direction-panel \.direction-run-overlay[^}]*surface-solid[^}]*mix-blend-mode: normal/s);
  assert.match(css, /data-theme="morning"[^}]*today-screen > \.direction-panel :is\(\.eyebrow, h2, p\)[^}]*color: var\(--ink\)[^}]*text-shadow: none/s);
  assert.match(css, /data-theme="morning"[^}]*workout-builder-option[^}]*rgba\(255, 255, 255, \.1\)[^}]*var\(--workout-card-image\)/s);
  assert.match(css, /data-theme="morning"[^}]*quick-log-section \.activity-shortcuts button[^}]*rgba\(255, 255, 255, \.1\)[^}]*var\(--quick-log-image\)/s);
  assert.match(app, /className="quick-log-label">Bike<\/span>/);
  assert.match(css, /theme-picker::before \{ content: "LIGHT THEMES"; order: 0/);
  assert.match(css, /theme-picker::after \{ content: "DARK THEMES"; order: 2/);
  assert.match(css, /settings-screen \.privacy-panel \{ border: 0 !important; \}/);
  assert.match(css, /settings-screen \.privacy-panel > div:first-child,[^}]*div:last-child \{ display: none; \}/s);
});