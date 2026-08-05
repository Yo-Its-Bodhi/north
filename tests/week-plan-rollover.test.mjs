import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("the planning window retains one historical week and a 12-week block by date", () => {
  assert.match(source, /const PLANNING_BLOCK_WEEKS = 12/);
  assert.match(source, /Array\.from\(\{ length: PLANNING_BLOCK_WEEKS \+ 1 \}/);
  assert.match(source, /createWeekPlan\(addIsoDays\(thisMonday, \(index - 1\) \* 7\)\)/);
  assert.match(source, /saved\.find\(\(candidate\) => candidate\.date === fallback\.date\)/);
  assert.match(source, /showPlanningWeek = \(offset: number\)/);
  assert.match(source, />Last week<.*>This week<.*>Next week</s);
});

test("current-week calculations do not depend on the first seven stored days", () => {
  assert.match(source, /const currentWeekPlan = weeklyPlan\.filter/);
  assert.doesNotMatch(source, /date >= weeklyPlan\[0\]\.date && date <= weeklyPlan\[6\]\.date/);
  assert.doesNotMatch(source, /weekStart === weeklyPlan\[0\]\.date/);
});

test("last week is reconstructed from recorded workouts and activities", () => {
  assert.match(source, /function recordedPlanDay\(/);
  assert.match(source, /fallback\.date < currentWeekStart[\s\S]*return recordedPlanDay\(fallback, history, activities\)/);
  assert.match(source, /title: "No session recorded"/);
  assert.match(source, /status: "unlogged"/);
});

test("week navigation is one contained four-part control", () => {
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(source, /className="planning-week-switcher"/);
  assert.match(source, />12-week block <ArrowRight/);
  assert.match(styles, /\.planning-week-switcher \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(source, /className="planning-block-switcher"/);
  assert.match(source, /Copy to next week/);
  assert.match(source, /Repeat through W12/);
  assert.doesNotMatch(source, /training-rhythm-heading"><div className="choice-row"/);
});

test("recorded rest days remain truthful history and can be completed explicitly", () => {
  assert.match(source, /restRecordedAt\?: string/);
  assert.match(source, /item\?\.kind === "rest" && item\.status === "completed" && item\.restRecordedAt/);
  assert.match(source, /async function setRestDayCompleted\(completed: boolean\)/);
  assert.match(source, /completed && day\.title === "No session recorded" \? "Rest"/);
  assert.match(source, /"Record rest day"/);
  assert.match(source, /<strong>Rest day complete<\/strong><small>Following the plan counts<\/small>/);
  assert.match(source, /setRestDayCompleted\(false\)/);
});

test("completed records reconcile plan status after sync or reload", () => {
  assert.match(source, /function reconcilePlanCompletion\(/);
  assert.match(source, /workoutPlanDayIds\.has\(day\.id\) \|\| workoutDates\.has\(day\.date\)/);
  assert.match(source, /const weeklyPlan = useMemo\(\(\) => reconcilePlanCompletion\(storedWeeklyPlan, history, activities, healthActivities\)/);
  assert.match(source, /\[storedWeeklyPlan, history, activities, healthActivities\]/);
});

test("scheduling a workout persists before an immediate refresh", () => {
  assert.match(source, /function performWorkoutTemplateChange[\s\S]*const nextPlan = weeklyPlan\.map/);
  assert.match(source, /setWeeklyPlan\(nextPlan\);\s*void persistAccountJson\(PLAN_KEY, "week-plan", nextPlan, true\)/);
});