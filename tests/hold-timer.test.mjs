import assert from "node:assert/strict";
import test from "node:test";
import { advanceHoldTimer, completedHoldSeconds, holdImprovementSeconds } from "../src/data/holdTimer.ts";

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
