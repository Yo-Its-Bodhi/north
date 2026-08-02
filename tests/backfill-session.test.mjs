import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { backfillSessionTiming } from "../src/data/backfillSession.ts";

test("backfilled sessions preserve performed and recorded dates separately", () => {
  assert.deepEqual(backfillSessionTiming("2026-07-20", "2026-07-27T21:15:00.000Z", "2026-07-27"), {
    performedAt: "2026-07-20T12:00:00",
    recordedAt: "2026-07-27T21:15:00.000Z",
    addedLater: true,
  });
});

test("a session entered for today is not marked as added later", () => {
  assert.equal(backfillSessionTiming("2026-07-27", "2026-07-27T21:15:00.000Z", "2026-07-27").addedLater, false);
});

test("future sessions cannot be backfilled", () => {
  assert.throws(() => backfillSessionTiming("2026-07-28", "2026-07-27T21:15:00.000Z", "2026-07-27"), /not in the future/);
});

test("the training calendar can backfill dated activities as well as strength workouts", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /className="training-performance-panel training-calendar-panel"/);
  assert.match(source, /openActivity\("bike", historyCalendarDate\)/);
  assert.match(source, /openActivity\("walk", historyCalendarDate\)/);
  assert.match(source, /openActivity\("run", historyCalendarDate\)/);
  assert.match(source, /openActivity\("recovery", historyCalendarDate\)/);
  assert.match(source, /historyCalendarActivities\.map/);
  assert.match(source, /setScreen\("training"\);\s*\n  }\s*\n\s*function importCoachWorkout/);
  assert.doesNotMatch(source, /screen === "workout-history"/);
});

test("weekly load belongs to Journey insights rather than Training", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const insightsStart = source.indexOf('journeyTab === "insights"');
  const trainingStart = source.indexOf('screen === "training"');
  const trainingEnd = source.indexOf('screen === "week-plan"');
  assert.ok(insightsStart >= 0 && trainingStart > insightsStart && trainingEnd > trainingStart);
  assert.match(source.slice(insightsStart, trainingStart), /className="insights-weekly-load"/);
  assert.match(source.slice(insightsStart, trainingStart), /What actually happened/);
  assert.doesNotMatch(source.slice(trainingStart, trainingEnd), /What actually happened/);
  assert.doesNotMatch(source, /id: "load", label: "Weekly load"/);
});

test("primary destinations use the shared North-branded header system", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const destination of ["today", "journey", "training", "nova", "you"]) {
    assert.match(source, new RegExp(`destination-brand-header destination-brand-${destination}`));
  }
  for (const label of ["Today", "Journey", "Training", "Nova", "You"]) assert.match(source, new RegExp(`<h1>${label}<`));
});

test("completed Journey milestones use a filled trophy badge", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(appSource, /milestone\.unlocked \? <Trophy size=\{17\} fill="currentColor"/);
  assert.match(styleSource, /chapter-milestone-list article\.unlocked > span[\s\S]*color: var\(--surface-solid\);[\s\S]*background: var\(--blue\);/);
});

test("Today places direction between the week days and next milestone", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const pulseStart = source.indexOf('<section className="today-week-pulse">');
  const pulseEnd = source.indexOf('</section>', pulseStart);
  const pulse = source.slice(pulseStart, pulseEnd);
  assert.ok(pulseStart >= 0 && pulseEnd > pulseStart);
  assert.ok(pulse.indexOf('className="week-pulse-days"') < pulse.indexOf('{todayDirectionPanel}'));
  assert.ok(pulse.indexOf('{todayDirectionPanel}') < pulse.indexOf('className="week-pulse-milestone"'));
});

test("You separates declaration from current signals and keeps the relevance order", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const header = source.indexOf('className="you-profile-header destination-brand-header destination-brand-you"');
  const declaration = source.indexOf('className="you-declaration"');
  const signals = source.indexOf('className="you-wellbeing"');
  const record = source.indexOf('className="you-training-record"');
  const memory = source.indexOf("WHAT NORTH HAS LEARNED", record);
  const account = source.indexOf("ACCOUNT & APP", memory);
  assert.ok(header < declaration && declaration < signals && signals < record && record < memory && memory < account, "You sections should follow relevance order");
  assert.match(source, /className="you-declaration"[\s\S]*YOUR DECLARATION/);
  assert.match(source, /className="you-wellbeing"[\s\S]*CURRENT SIGNALS/);
});

test("Journey insights omit redundant secondary panels", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /insight-next-step|YOUR NEXT SIGNAL|four-week-chart/);
});