import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("Nova suggestion creates the complete routine before opening review", () => {
  const start = source.indexOf("function createNovaWorkout(useSuggestion: boolean)");
  const end = source.indexOf("function patchPersonalTemplate", start);
  const builder = source.slice(start, end);

  assert.match(builder, /const suggestions = useSuggestion \? fitWorkoutToDuration\(match\.exercises, novaWorkoutDraft\.duration\) : \[\]/);
  assert.match(builder, /exercises: suggestions/);
  assert.match(builder, /Nova suggested \$\{suggestions\.length\} exercises/);
  assert.match(builder, /setScreen\("workout-template"\)/);
});

test("blank Nova workout still opens the one-at-a-time routine builder", () => {
  const start = source.indexOf("function createNovaWorkout(useSuggestion: boolean)");
  const end = source.indexOf("function patchPersonalTemplate", start);
  const builder = source.slice(start, end);

  assert.match(builder, /setNovaRoutineStatus\("Choose the first movement for your routine\."\)/);
  assert.match(builder, /setScreen\("nova-routine-builder"\)/);
});
