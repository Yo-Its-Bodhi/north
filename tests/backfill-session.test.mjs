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

test("Training Atlas is the primary Journey insights explorer", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const atlas = readFileSync(new URL("../src/components/TrainingAtlas.tsx", import.meta.url), "utf8");
  const atlasStyles = readFileSync(new URL("../src/components/TrainingAtlas.css", import.meta.url), "utf8");
  const insightsStart = source.indexOf('journeyTab === "insights"');
  const trainingStart = source.indexOf('screen === "training"');
  const trainingEnd = source.indexOf('screen === "week-plan"');
  assert.ok(insightsStart >= 0 && trainingStart > insightsStart && trainingEnd > trainingStart);
  assert.match(source.slice(insightsStart, trainingStart), /<TrainingAtlas records=\{atlasRecords\}/);
  assert.match(atlas, /Week.*Month.*Quarter.*Year.*All time/s);
  assert.match(atlas, /Sessions.*Minutes.*Reps.*Volume.*Distance/s);
  assert.match(atlas, /PERIOD ACTIVITIES/);
  assert.match(atlas, /Export private-safe PNG/);
  assert.match(atlas, /bodyweight, recovery and exact activity dates are always excluded/);
  assert.match(atlasStyles, /--atlas-accent: var\(--blue\)/);
  assert.match(atlas, /getPropertyValue\("--blue"\)/);
  assert.doesNotMatch(`${atlas}\n${atlasStyles}`, /#087f7b|--atlas-teal/);
  assert.doesNotMatch(source.slice(trainingStart, trainingEnd), /TrainingAtlas/);
  assert.doesNotMatch(source, /id: "load", label: "Weekly load"/);
});

test("primary destinations use the shared North-branded header system", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  for (const destination of ["today", "journey", "training", "nova", "you"]) {
    assert.match(source, new RegExp(`destination-brand-header destination-brand-${destination}`));
  }
  for (const label of ["Today", "Journey", "Training", "Nova", "You"]) assert.match(source, new RegExp(`<h1>${label}<`));
  assert.match(source, /className="primary-nav-brand"[\s\S]*aria-label="North home"[\s\S]*lockup-horizontal-offwhite\.png/);
  assert.match(styles, /\.member-shell \.topbar-actions \{ margin-left: auto; \}/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*\.member-shell \.topbar \.brand \{ display: none !important; \}[\s\S]*\.primary-nav-brand \{/);
  assert.match(source, /className=\{`nova-context-trigger[\s\S]*Open Nova memory and setup[\s\S]*<BrainCircuit size=\{18\}/);
  assert.match(styles, /\.destination-brand-nova \.nova-context-trigger \{[\s\S]*position: absolute;[\s\S]*width: 38px;[\s\S]*height: 38px;/);
});

test("member workspaces use theme-aware desktop depth and a quieter mobile wash", () => {
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(styles, /:root\[data-palette\] \.member-shell \{[\s\S]*repeating-linear-gradient[\s\S]*var\(--north-workspace\) !important;/);
  assert.match(styles, /:root\[data-theme="night"\]\[data-palette\] \.member-shell \{[\s\S]*var\(--blue\) 5%/);
  assert.doesNotMatch(styles.slice(styles.indexOf("Give the shared workspace")), /repeating-radial-gradient/);
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*linear-gradient\(180deg[\s\S]*background-attachment: scroll !important;/);
});

test("completed Journey milestones use a filled trophy badge", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(appSource, /milestone\.unlocked \? <Trophy size=\{17\} fill="currentColor"/);
  assert.match(styleSource, /chapter-milestone-list article\.unlocked > span[\s\S]*color: var\(--surface-solid\);[\s\S]*background: var\(--blue\);/);
});

test("Today follows the decision-first section order", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const todayStart = source.indexOf('<section className="screen today-screen"');
  const today = source.slice(todayStart, source.indexOf('{screen === "journey"', todayStart));
  const sections = ['className="daily-check-in"', '{todayDirectionPanel}', 'className="today-muscle-focus"', 'className="today-health-context"', 'className="today-week-pulse"', 'className="week-pulse-milestone"', 'className="today-record"'];
  const positions = sections.map((section) => today.indexOf(section));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  const pulse = today.slice(positions[4], positions[5]);
  assert.doesNotMatch(pulse, /todayDirectionPanel|week-pulse-milestone/);
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