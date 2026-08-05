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

test("Journey owns Trophy Room and Weekly Review navigation", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const trophyShare = readFileSync(new URL("../src/components/TrophyShare.ts", import.meta.url), "utf8");
  assert.match(source, /journey-page-actions destination-header-actions[\s\S]*aria-label="Open Trophy Room"[\s\S]*aria-label="Review this week"/);
  assert.match(source, /training-page-header destination-brand-header destination-brand-training"><div className="destination-header-copy">[\s\S]*?<\/div><\/header>/);
  assert.match(source, /trophy-room-hero destination-brand-header destination-brand-journey/);
  assert.match(source, /className="back-button" onClick=\{\(\) => setScreen\("journey"\)\}><ArrowLeft size=\{17\} \/> Journey/);
  assert.match(source, /journey: \[[\s\S]*\{ id: "trophy-room", label: "Trophy Room" \},[\s\S]*\{ id: "weekly-review", label: "Weekly Review" \},[\s\S]*\],\s*training:/);
  assert.doesNotMatch(source, /training: \[[\s\S]*\{ id: "trophy-room"/);
  assert.match(source, /\["progression", "weekly-review"\]\.includes\(screen\)[\s\S]*\? "journey"/);
  assert.match(source, /trophy-room-actions destination-header-actions[\s\S]*aria-label="Share Trophy Room highlights"[\s\S]*<Share2 size=\{20\}/);
  assert.match(source, /aria-label="Ask Nova about progression"[\s\S]*<Sparkles size=\{20\}/);
  assert.match(source, /aria-label=\{`Share \$\{record\.title\} as PNG`\}/);
  assert.match(source, /shareTrophyPng\(record\)/);
  assert.match(trophyShare, /const width = 1080;[\s\S]*const height = 1350;/);
  assert.match(trophyShare, /footprint-stamp-offwhite\.png/);
  assert.match(trophyShare, /navigator\.canShare/);
  assert.doesNotMatch(source, /className="trophy-room-emblem"/);
});

test("future sessions cannot be backfilled", () => {
  assert.throws(() => backfillSessionTiming("2026-07-28", "2026-07-27T21:15:00.000Z", "2026-07-27"), /not in the future/);
});

test("the training calendar can backfill dated activities as well as strength workouts", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(source, /className="training-performance-panel training-calendar-panel"/);
  assert.match(source, /openActivity\("bike", historyCalendarDate\)/);
  assert.match(source, /openActivity\("walk", historyCalendarDate\)/);
  assert.match(source, /openActivity\("run", historyCalendarDate\)/);
  assert.match(source, /openActivity\("recovery", historyCalendarDate\)/);
  assert.match(source, /historyCalendarActivities\.map/);
  assert.match(source, /setScreen\("training"\);\s*\n  }\s*\n\s*function importCoachWorkout/);
  assert.doesNotMatch(source, /screen === "workout-history"/);
  const themedCalendar = styles.slice(styles.indexOf(".training-calendar-panel :is(.north-history-calendar"), styles.indexOf(".north-calendar-grid > button span", styles.indexOf(".training-calendar-panel :is(.north-history-calendar")));
  assert.match(themedCalendar, /var\(--blue\)/);
  assert.match(themedCalendar, /var\(--surface-solid\)/);
  assert.match(themedCalendar, /var\(--energy-gradient\)/);
  assert.match(themedCalendar, /var\(--north-off-white\)/);
  assert.doesNotMatch(themedCalendar, /#633cff|#7c4dff|#f331b7|rgba\(8,140,255|rgba\(124,77,255/);
});

test("Aurum Training highlights retain readable contrast", () => {
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  const start = styles.indexOf(':root[data-palette="gold"] .member-shell .training-destination');
  const aurumTraining = styles.slice(start, styles.indexOf(".member-shell .training-hero >", start));

  assert.ok(start >= 0);
  assert.match(aurumTraining, /--training-action-gradient:[^;]*#85641f/);
  assert.match(aurumTraining, /\.training-hero-actions \.primary-button/);
  assert.match(aurumTraining, /\.north-calendar-grid > button\.selected/);
  assert.doesNotMatch(aurumTraining, /#fff0ad/);
});

test("Training image cards use theme-aware interaction overlays", () => {
  const styles = readFileSync(new URL("../src/styles/runtime-07.css", import.meta.url), "utf8");
  const start = styles.indexOf(".training-destination .workout-builder-option::after");
  const interactions = styles.slice(start, styles.indexOf(".training-destination .workout-builder-option>svg", start));

  assert.ok(start >= 0);
  assert.match(interactions, /background:var\(--training-tone\)/);
  assert.match(interactions, /@media\(hover:hover\) and \(pointer:fine\)/);
  assert.match(interactions, /:hover::after\{opacity:\.12\}/);
  assert.match(interactions, /:focus-visible::after[\s\S]*opacity:\.12/);
  assert.match(interactions, /:active::after[\s\S]*opacity:\.16/);
});

test("Training Atlas is the primary Journey insights explorer", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const atlas = readFileSync(new URL("../src/components/TrainingAtlas.tsx", import.meta.url), "utf8");
  const recap = readFileSync(new URL("../src/components/TrainingRecap.ts", import.meta.url), "utf8");
  const atlasStyles = readFileSync(new URL("../src/components/TrainingAtlas.css", import.meta.url), "utf8");
  const insightsStart = source.indexOf('journeyTab === "insights"');
  const trainingStart = source.indexOf('screen === "training"');
  const trainingEnd = source.indexOf('screen === "week-plan"');
  assert.ok(insightsStart >= 0 && trainingStart > insightsStart && trainingEnd > trainingStart);
  assert.match(source.slice(insightsStart, trainingStart), /<TrainingAtlas records=\{atlasRecords\}/);
  assert.match(atlas, /Week.*Month.*Quarter.*Year.*All time/s);
  assert.match(atlas, /Sessions.*Minutes.*Reps.*Volume.*Distance/s);
  assert.match(atlas, /PERIOD ACTIVITIES/);
  assert.match(atlas, /Show what your effort added up to/);
  assert.match(atlas, /name, body weight, recovery notes and exact dates stay out of the image/);
  assert.match(recap, /NORTH TRAINING RECAP/);
  assert.match(atlasStyles, /--atlas-accent: var\(--blue\)/);
  assert.match(atlas, /readTrainingRecapTheme/);
  assert.match(recap, /resolveThemeColor\("--blue"/);
  assert.doesNotMatch(`${atlas}\n${atlasStyles}`, /#087f7b|--atlas-teal/);
  assert.doesNotMatch(source.slice(trainingStart, trainingEnd), /TrainingAtlas/);
  assert.doesNotMatch(source, /id: "load", label: "Weekly load"/);
});

test("primary destinations use the shared North-branded header system", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const guideSource = readFileSync(new URL("../src/components/NorthGuide.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  const globalStyles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const runtimeStyles = readFileSync(new URL("../src/styles/runtime-07.css", import.meta.url), "utf8");
  for (const destination of ["today", "journey", "training", "nova", "you", "account", "settings"]) {
    assert.match(source, new RegExp(`destination-brand-header destination-brand-${destination}`));
  }
  assert.match(guideSource, /destination-brand-header destination-brand-guide/);
  assert.match(guideSource, /<h1>Guide<\/h1><p className="destination-subheading">Take your time\.<\/p>/);
  assert.match(source, /destination-brand-account[\s\S]*<h1>Account<\/h1><p className="destination-subheading">Your North\.<\/p>/);
  assert.match(source, /destination-brand-settings[\s\S]*<h1>Account<\/h1><p className="destination-subheading">North, your way\.<\/p>/);
  assert.match(source, /check-in-header destination-brand-header destination-brand-today[\s\S]*<h1>Check-in<\/h1><p className="destination-subheading">How are you arriving\?<\/p>/);
  assert.match(globalStyles, /\.coach-import-screen,\.check-in-screen,\.weekly-review-screen[\s\S]*max-width:980px!important/);
  assert.match(source, /weekly-review-header destination-brand-header destination-brand-journey[\s\S]*<h1>Weekly Review<\/h1><p className="destination-subheading">What did this week teach you\?<\/p>/);
  for (const label of ["Today", "Journey", "Training", "Build workout", "Nova", "You"]) assert.match(source, new RegExp(`<h1>${label}<`));
  assert.match(source, /function BuildWorkoutDestinationHeader\(\)[\s\S]*nova-builder-page-header destination-brand-header destination-brand-builder/);
  for (const screen of ["workout-library", "nova-workout-builder", "nova-routine-builder", "workout-template"]) {
    const start = source.indexOf(`{screen === "${screen}"`);
    const end = source.indexOf('{screen === "', start + 12);
    assert.match(source.slice(start, end), /<BuildWorkoutDestinationHeader \/>/);
  }
  assert.match(source, /\[\s*"nova-routine-builder",\s*"workout-library",\s*"workout-template",?\s*\]\.includes\(screen\)[\s\S]*\? "nova-workout-builder"/);
  assert.doesNotMatch(source, /className="routine-builder-launch"/);
  assert.doesNotMatch(source, /WORKOUT LIBRARY|Find the right session\.|North workouts,.*personal template/);
  const libraryStart = source.indexOf('{screen === "workout-library"');
  const libraryEnd = source.indexOf('{screen === "nova-workout-builder"', libraryStart);
  assert.doesNotMatch(source.slice(libraryStart, libraryEnd), /className="back-button"/);
  const builderStart = source.indexOf('{screen === "nova-workout-builder"');
  const builderEnd = source.indexOf('{screen === "nova-routine-builder"', builderStart);
  assert.doesNotMatch(source.slice(builderStart, builderEnd), /className="back-button"/);
  assert.match(globalStyles, /\.routine-library-switcher\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(globalStyles, /@media\(min-width:1024px\)\{[\s\S]*\.routine-library-switcher\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(runtimeStyles, /\.routine-library-switcher\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(runtimeStyles, /@media\(min-width:1024px\)\{[\s\S]*\.routine-library-switcher\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*\.nova-workout-builder-screen,[\s\S]*\.nova-routine-builder-screen,[\s\S]*\.workout-library-screen,[\s\S]*\.workout-template-screen[\s\S]*> \.back-button \{ display: none; \}/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*\.trophy-room-screen,[\s\S]*\.check-in-screen,[\s\S]*\.weekly-review-screen[\s\S]*> \.back-button \{ display: none; \}/);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*\.destination-brand-header \{[\s\S]*align-items: start;/);
  assert.match(source, /className="primary-nav-brand"[\s\S]*aria-label="North home"[\s\S]*lockup-horizontal-offwhite\.png/);
  assert.match(styles, /\.member-shell \.topbar-actions \{ margin-left: auto; \}/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*\.member-shell \.topbar \.brand \{ display: none !important; \}[\s\S]*\.primary-nav-brand \{/);
  assert.match(source, /className=\{`nova-context-trigger[\s\S]*Open Nova memory and setup[\s\S]*<BrainCircuit size=\{18\}/);
  assert.match(source, /className="nova-clear-chat"[\s\S]*aria-label="Clear Nova conversation"[\s\S]*<Trash2 size=\{17\}/);
  assert.match(styles, /\.destination-brand-nova \.nova-heading-actions \{ position: static !important; \}/);
  assert.doesNotMatch(styles, /\.destination-brand-nova \.nova-context-trigger \{[\s\S]*position: absolute;/);
  assert.match(styles, /@media \(max-width: 700px\) \{[\s\S]*\.nova-screen \.nova-page-heading \{[\s\S]*box-sizing: border-box !important;[\s\S]*min-height: 96px !important;[\s\S]*\.nova-screen \.conversation-surface \{[\s\S]*scroll-padding-bottom: 16px;[\s\S]*\.nova-screen \.nova-input input \{ min-height: 44px; font-size: 16px !important; \}/);
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
  const sections = ['className="daily-check-in"', '{todayDirectionPanel}', 'className="today-muscle-focus"', 'className="today-week-pulse"', 'className="today-health-context"', 'className="week-pulse-milestone"', 'className="today-record"'];
  const positions = sections.map((section) => today.indexOf(section));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  const pulse = today.slice(positions[3], positions[4]);
  assert.doesNotMatch(pulse, /todayDirectionPanel|week-pulse-milestone/);
});

test("completed Training heroes keep their status readable over artwork", () => {
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.match(styles, /\.training-hero \.training-complete-state \{[^}]*color: var\(--training-hero-ink\)/);
  assert.match(styles, /\.training-hero \.training-complete-state small \{[^}]*color: var\(--training-hero-muted\)/);
  assert.doesNotMatch(styles, /\.training-complete-state \{[^}]*color: var\(--surface-solid\)/);
});

test("You separates declaration from current signals and keeps the relevance order", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const header = source.indexOf('className="you-profile-header destination-brand-header destination-brand-you"');
  const declaration = source.indexOf('className="you-declaration"');
  const signals = source.indexOf('className="you-wellbeing"');
  const record = source.indexOf('className="you-training-record"');
  const memory = source.indexOf("WHAT NORTH HAS LEARNED", record);
  assert.ok(header < declaration && declaration < signals && signals < record && record < memory, "You sections should follow relevance order");
  assert.match(source, /className="you-declaration"[\s\S]*YOUR DECLARATION/);
  assert.match(source, /className="you-wellbeing"[\s\S]*CURRENT SIGNALS/);
  assert.match(source, /<button className=\{`topbar-account-button account-avatar-button/);
  assert.doesNotMatch(source, /you-account-menu/);
  assert.doesNotMatch(source, /readNorthSession\(\) && <button className=\{`topbar-account-button/);
  assert.doesNotMatch(source, /\{ id: "account", label: "Account & app" \}/);
});

test("Journey insights omit redundant secondary panels", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /insight-next-step|YOUR NEXT SIGNAL|four-week-chart/);
});

test("Nova gives chat space to visibly distinct theme-aware messages", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /className="nova-line living"/);
  assert.match(styles, /\.nova-screen \.nova-message \{[\s\S]*background: color-mix\(in srgb, var\(--ink\) 5%, var\(--surface-solid\)\)/);
  assert.match(styles, /\.nova-screen \{ --nova-chat-tone: var\(--blue\); \}/);
  assert.match(styles, /\.nova-screen \.user-message \{[\s\S]*background: color-mix\(in srgb, var\(--nova-chat-tone\) 18%, var\(--surface-solid\)\)/);
});