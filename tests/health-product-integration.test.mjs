import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
const androidReaderSource = readFileSync(new URL("../mobile/android/app/src/main/java/io/bodhix/north/health/HealthReader.kt", import.meta.url), "utf8");

test("health context is separated across Today, You, Journey, Training and Settings", () => {
  assert.match(appSource, /className="today-health-context"/);
  assert.match(appSource, /todayHealth\?\.total_calories.*<small>KCAL<\/small>/);
  assert.match(appSource, /todayHealth\?\.distance_metres.*<small>DISTANCE<\/small>/);
  assert.match(appSource, /className="you-health-hub"/);
  assert.match(appSource, /RECORDED MINUTES/);
  assert.match(appSource, /TOTAL CALORIES/);
  assert.match(appSource, /const meaningfulHealthActivities = healthActivities/);
  assert.match(appSource, /weekHealthActivities\.reduce/);
  assert.match(appSource, /className="health-permission-controls"/);
  assert.match(appSource, /const historyCalendarHealthActivities = healthActivities\.filter/);
  assert.match(appSource, /dayHealthActivities = healthActivities\.filter/);
  assert.match(appSource, /Samsung Health<\/small>/);
});

test("the client requests context and exposes the immutable import boundary", () => {
  assert.match(appSource, /\/v1\/health\/context\?days=365/);
  assert.match(appSource, /samsungConnection\.import_from/);
  assert.match(appSource, /Nothing recorded before the connection date is imported/);
});

test("Today exposes quick health sync and Settings owns connection details", () => {
  assert.match(appSource, /function openHealthSync\(\)/);
  assert.match(appSource, /destination-brand-today[\s\S]*aria-label="Sync Samsung Health"[\s\S]*onClick=\{openHealthSync\}/);
  assert.match(appSource, /Connected services[\s\S]*Samsung Health · Health Connect[\s\S]*Last synced/);
  assert.doesNotMatch(appSource, /className="settings-health-sync"/);
  assert.doesNotMatch(appSource, /<b>Your account<\/b><small>\{accountDevices\.length\}/);
});

test("the server filters Journey exercises by connection and recording policy", () => {
  assert.match(serverSource, /e\.started_at>=c\.import_from/);
  assert.match(serverSource, /filter\(\([^)]*\) => isPurposefulExercise\([^)]*\.payload\)\)/);
  assert.match(serverSource, /record_type='sleep' then r\.ended_at/);
  assert.match(serverSource, /'active_calories','total_calories'/);
  assert.match(serverSource, /map\(mergeHealthDay\)/);
  assert.match(serverSource, /row\.record_type === "exercise".*active_milliseconds/);
  assert.match(serverSource, /mergeHealthDay/);
  assert.match(serverSource, /row\.record_type === "daily_summary"/);
  assert.match(androidReaderSource, /StepsRecord\.COUNT_TOTAL/);
  assert.match(androidReaderSource, /ExerciseSessionRecord\.EXERCISE_DURATION_TOTAL/);
  assert.match(androidReaderSource, /"daily_summary"/);
  assert.match(serverSource, /Math\.min\(365, Math\.max\(1, Number\(request\.query\?\.days/);
});

test("completed Health Connect days become contextual Journey reports without changing workout totals", () => {
  assert.match(appSource, /completedHealthDays.*day\.date < isoDate/);
  assert.match(appSource, /title: "Health Connect daily report"/);
  assert.match(appSource, /distance not shared/);
  assert.match(appSource, /Samsung dashboard estimates can differ/);
  assert.match(appSource, /item\.type === "Daily reports".*return "moment-daily-report"/);
  assert.match(appSource, /purposeful workouts remain separate and are not added again/);
  assert.match(appSource, /title: "Health Connect movement distance"/);
  assert.match(appSource, /title: "Health Connect recorded time"/);
  assert.match(appSource, /title: "Health Connect energy"/);
});

test("the latest completed day is interpreted against earlier evidence", () => {
  assert.match(appSource, /const latestCompletedHealthDay = completedHealthDays\[0\]/);
  assert.match(appSource, /const healthBaselineDays = completedHealthDays\.slice\(1, 8\)/);
  assert.match(appSource, /Today is excluded until it is complete/);
  assert.match(appSource, /className="you-health-report"/);
  assert.match(appSource, /Building your baseline/);
  assert.match(appSource, /includes resting energy/);
  assert.match(appSource, /completedHealthWeekTotals\.calories/);
  assert.match(appSource, /Sleep available for/);
  assert.match(appSource, /Ask Nova about this day/);
  assert.match(appSource, /without double counting workouts/);
});

test("You logs the newest synced sleep and a transparent recorded-night average", () => {
  assert.match(appSource, /const syncedSleepDays = .*filter\(\(day\) => day\.sleep_minutes > 0\)/);
  assert.match(appSource, /const latestSleepDay = syncedSleepDays\[0\]/);
  assert.match(appSource, /const recentSleepDays = syncedSleepDays\.slice\(0, 7\)/);
  assert.match(appSource, /average · \$\{recentSleepDays\.length\} recorded night/);
  assert.match(appSource, /latestSleepDay\?\.sleep_minutes.*toFixed\(1\)/);
});

test("Account identity exposes an explicit device sign-out action", () => {
  assert.match(appSource, /settings-account-session-actions[\s\S]*onClick=\{signOutAccount\}[\s\S]*Log out/);
  assert.match(appSource, /synced workouts, health records, and account data will remain safe/);
});
