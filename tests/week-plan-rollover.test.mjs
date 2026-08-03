import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("the planning window retains last, current, and next week by date", () => {
  assert.match(source, /createWeekPlan\(addIsoDays\(thisMonday, -7\)\)/);
  assert.match(source, /saved\.find\(\(candidate\) => candidate\.date === fallback\.date\)/);
  assert.match(source, /showPlanningWeek = \(offset: -1 \| 0 \| 1\)/);
  assert.match(source, />Last week<.*>This week<.*>Next week</s);
});

test("current-week calculations do not depend on the first seven stored days", () => {
  assert.match(source, /const currentWeekPlan = weeklyPlan\.filter/);
  assert.doesNotMatch(source, /date >= weeklyPlan\[0\]\.date && date <= weeklyPlan\[6\]\.date/);
  assert.doesNotMatch(source, /weekStart === weeklyPlan\[0\]\.date/);
});