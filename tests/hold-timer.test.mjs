import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { advanceHoldTimer, completedHoldSeconds, holdImprovementSeconds } from "../src/data/holdTimer.ts";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

const state = (patch = {}) => ({ exerciseId: "plank", setIndex: 0, phase: "ready", remaining: 0, goal: 30, previous: 24, elapsed: 0, startedAt: null, ...patch });

test("a preparation countdown transitions into a timestamped count-up hold", () => {
  const lastPrepSecond = state({ phase: "preparing", remaining: 1 });
  assert.deepEqual(advanceHoldTimer(lastPrepSecond, 10_000), state({ phase: "holding", startedAt: 10_000 }));
});

test("a hold counts from its start timestamp without a duration cutoff", () => {
  const holding = state({ phase: "holding", startedAt: 10_000 });
  assert.deepEqual(advanceHoldTimer(holding, 37_900), state({ phase: "holding", startedAt: 10_000, elapsed: 27 }));
  assert.equal(completedHoldSeconds(holding, 37_900), 27);
});

test("improvement begins only after elapsed time exceeds the previous result", () => {
  assert.equal(holdImprovementSeconds(state({ phase: "holding", elapsed: 24 })), 0);
  assert.equal(holdImprovementSeconds(state({ phase: "holding", elapsed: 27 })), 3);
});

test("assisted hold timing is an off-by-default account preference", () => {
  assert.match(appSource, /assistedHoldTimer: false/);
  assert.match(appSource, /<strong>Assisted hold timer<\/strong>/);
  assert.match(appSource, /if \(profile\.assistedHoldTimer && !holdTimerDismissed\)/);
  assert.match(appSource, /if\(!profile\.assistedHoldTimer\|\|holdTimerDismissed\)\{completeTimedSetManually\(index\);return;\}/);
  assert.match(appSource, /Enter the duration for set \$\{index \+ 1\} before completing it\./);
  assert.match(appSource, /aria-label="Dismiss assisted hold timer for this workout"/);
  assert.match(appSource, /setHoldTimerDismissed\(true\); setRecorderStatus\("Assisted hold timer dismissed for this workout/);
});
