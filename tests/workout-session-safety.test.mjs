import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeWorkoutConflictsWithTemplate, activeWorkoutSecondsAt, pauseWorkoutTiming, resumeWorkoutTiming } from "../src/data/workoutSessionSafety.ts";

const active = { startedAt: "2026-07-24T18:00:00.000Z", finishedAt: null, activePlanDayId: "fri", activeDate: "2026-07-24" };

test("an active workout blocks starting any replacement workout", () => {
  assert.equal(activeWorkoutConflictsWithTemplate({ ...active, targetPlanDayId: "sat", targetDate: "2026-07-25", startsImmediately: true }), true);
});

test("an active workout blocks scheduling over its claimed day but allows another day", () => {
  assert.equal(activeWorkoutConflictsWithTemplate({ ...active, targetPlanDayId: "fri", targetDate: "2026-07-24", startsImmediately: false }), true);
  assert.equal(activeWorkoutConflictsWithTemplate({ ...active, targetPlanDayId: "sat", targetDate: "2026-07-25", startsImmediately: false }), false);
});

test("an ad-hoc active workout claims its performed date", () => {
  assert.equal(activeWorkoutConflictsWithTemplate({ ...active, activePlanDayId: undefined, targetPlanDayId: "fri", targetDate: "2026-07-24", startsImmediately: false }), true);
});

test("finished sessions never block planning", () => {
  assert.equal(activeWorkoutConflictsWithTemplate({ ...active, finishedAt: "2026-07-24T19:00:00.000Z", targetPlanDayId: "fri", targetDate: "2026-07-24", startsImmediately: true }), false);
});

test("the recorder exposes intentional cancellation and never silently replaces an active session", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /Cancel workout/);
  assert.match(source, /activeWorkoutConflictsWithTemplate/);
  assert.match(source, /Cancel current &amp;/);
  assert.match(source, /No workout record will be created/);
});

test("paused time is excluded from active workout duration", () => {
  const started = { startedAt: "2026-07-24T10:00:00.000Z", finishedAt: null, pausedDurationMs: 30 * 60_000 };
  assert.equal(activeWorkoutSecondsAt(started, new Date("2026-07-24T11:00:00.000Z").getTime()), 30 * 60);
});

test("pause and resume accumulate multiple persisted pauses", () => {
  const started = { startedAt: "2026-07-24T10:00:00.000Z", finishedAt: null };
  const firstPause = pauseWorkoutTiming(started, "2026-07-24T10:15:00.000Z");
  const firstResume = resumeWorkoutTiming(firstPause, "2026-07-24T10:25:00.000Z");
  const secondPause = pauseWorkoutTiming(firstResume, "2026-07-24T10:40:00.000Z");
  const secondResume = resumeWorkoutTiming(secondPause, "2026-07-24T10:45:00.000Z");
  assert.equal(secondResume.pausedDurationMs, 15 * 60_000);
  assert.equal(activeWorkoutSecondsAt(secondResume, new Date("2026-07-24T11:00:00.000Z").getTime()), 45 * 60);
});

test("the workout flow renders a desktop rail, compact mobile sets, and pause review", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const mobileStyles = readFileSync(new URL("../src/styles/runtime-05.css", import.meta.url), "utf8");
  const signatureStyles = readFileSync(new URL("../src/styles/runtime-08.css", import.meta.url), "utf8");
  assert.match(source, /desktopOnly=\{screen === "workout"\}/);
  assert.match(source, /screen === "workout" \? " workout-topbar" : ""/);
  assert.doesNotMatch(source, /workoutTopbarHidden|setWorkoutTopbarHidden/);
  assert.match(signatureStyles, /\.member-shell\.workout-shell \.topbar\.workout-topbar\{position:static!important\}/);
  assert.match(mobileStyles, /grid-template-areas:"num weight reps done"/);
  assert.doesNotMatch(mobileStyles, /grid-template-areas:"num weight done" "num reps done"/);
  assert.match(source, /className="exercise-header-metrics"/);
  assert.doesNotMatch(source, /<p className="lead">\{current\.target\}<\/p>/);
  assert.ok(source.indexOf('<section className="cue"') < source.indexOf('className="sets-table"'));
  assert.ok(source.indexOf('className="sets-table"') < source.indexOf('<section className="workout-movement-hero"'));
  assert.match(styles, /\.workout-actions \{ display: flex; gap: 8px;/);
  assert.match(styles, /\.workout-actions \.exercise-nav-btn \{ position: static;/);
  assert.doesNotMatch(source, /workout-done/);
  assert.match(source, /setScreen\("workout-review"\)/);
  assert.match(source, /"Next exercise" : "Review workout"/);
  assert.match(styles, /\.exercise-header-metrics\{display:block\}/);
  assert.match(styles, /@media\(max-width:640px\).*\.exercise-header-info\{display:grid;grid-template-columns:auto minmax\(0,1fr\) auto/s);
  assert.match(styles, /\.workout-progress-bar\{margin:0 -10px -150px;padding:8px 10px/);
  assert.match(source, /screen === "workout" && session\.pausedAt/);
  assert.match(source, /Workout time and the rest countdown are stopped/);
  assert.match(source, /crossed a day or lasted more than six hours/);
  assert.match(source, /setWeeklyPlan[\s\S]*setWorkoutSubmitOpen\(false\);\s*setScreen\("today"\);/);
});

test("mobile workout actions use the real safe-area bottom and deliberate swipes", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(source, /closest\("button, input, textarea, select, label, a, \[role='button'\]/);
  assert.match(source, /const minSwipeDistance = 110/);
  assert.match(source, /Math\.abs\(swipeDistance\) > Math\.abs\(verticalDistance\) \* 1\.5/);
  assert.match(styles, /\.workout-mobile-dock \{[\s\S]*?bottom: 0;[\s\S]*?env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(styles, /\.workout-mobile-dock \{[\s\S]*?bottom: calc\(76px/);
  const signatureStyles = readFileSync(new URL("../src/styles/runtime-08.css", import.meta.url), "utf8");
  assert.match(signatureStyles, /\.member-shell\.workout-shell \.workout-mobile-dock\{position:fixed!important;z-index:100!important;right:0!important;bottom:0!important;left:0!important/);
  assert.match(signatureStyles, /workout-shell:has\(\.note-field textarea:focus\) \.workout-mobile-dock\{transform:translateY/);
  assert.match(signatureStyles, /\.member-shell\.workout-shell\{backdrop-filter:none!important\}/);
  assert.match(styles, /@media \(max-width: 640px\) \{[\s\S]*?\.workout-screen \.set-row \{ grid-template-columns: 24px minmax\(90px, 1\.2fr\) minmax\(74px, 1fr\) 44px; gap: 4px;[\s\S]*?\.set-check \{ width: 44px; min-width: 44px; height: 44px; min-height: 44px; \}/);
});

test("the active workout keeps the phone awake and reacquires after returning", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /wakeLock\.request\("screen"\)/);
  assert.match(source, /document\.visibilityState !== "visible"/);
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibility\)/);
  assert.match(source, /if \(cancelled\) \{ await requestedLock\.release\(\); return; \}/);
  assert.match(source, /if \(lock && !lock\.released\) void lock\.release\(\)/);
});
