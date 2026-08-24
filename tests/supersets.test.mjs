import test from "node:test";
import assert from "node:assert/strict";
import { getSupersetAdvance, groupExercises, normalizeSupersets, supersetSequenceLabel, ungroupExercises } from "../src/data/supersets.ts";

const exercise = (id, sets = 3) => ({ id, sets: Array.from({ length: sets }, () => ({ complete: false })) });

test("groups 2–4 selected exercises as an adjacent ordered block", () => {
  const grouped = groupExercises([exercise("one"), exercise("two"), exercise("three"), exercise("four")], ["three", "one"], "group-a", 75);
  assert.deepEqual(grouped.map((item) => item.id), ["three", "one", "two", "four"]);
  assert.deepEqual(grouped.slice(0, 2).map((item) => item.supersetOrder), [0, 1]);
  assert.equal(grouped[0].supersetRest, 75);
  assert.equal(supersetSequenceLabel(grouped, grouped[0]), "A1");
  assert.equal(supersetSequenceLabel(grouped, grouped[1]), "A2");
});

test("rejects mismatched rounds and existing groups", () => {
  assert.throws(() => groupExercises([exercise("one", 3), exercise("two", 4)], ["one", "two"], "bad", 90), /same number of sets/);
  const grouped = groupExercises([exercise("one"), exercise("two")], ["one", "two"], "group-a", 90);
  assert.throws(() => groupExercises([...grouped, exercise("three")], ["one", "three"], "group-b", 90), /existing superset/);
});

test("advances A1 to A2 without rest, then begins rest after the round", () => {
  let grouped = groupExercises([exercise("one"), exercise("two")], ["one", "two"], "group-a", 90);
  grouped = grouped.map((item) => item.id === "one" ? { ...item, sets: item.sets.map((set, index) => index === 0 ? { complete: true } : set) } : item);
  assert.deepEqual(getSupersetAdvance(grouped, "one", 0), { kind: "next-member", nextExerciseId: "two", round: 1, restSeconds: 0 });
  grouped = grouped.map((item) => item.id === "two" ? { ...item, sets: item.sets.map((set, index) => index === 0 ? { complete: true } : set) } : item);
  assert.deepEqual(getSupersetAdvance(grouped, "two", 0), { kind: "round-complete", nextExerciseId: "one", round: 1, restSeconds: 90 });
});

test("final member of the final round completes the whole group", () => {
  let grouped = groupExercises([exercise("one", 1), exercise("two", 1)], ["one", "two"], "group-a", 60);
  grouped = grouped.map((item) => ({ ...item, sets: [{ complete: true }] }));
  assert.deepEqual(getSupersetAdvance(grouped, "two", 0), { kind: "group-complete", round: 1, restSeconds: 60 });
  assert.ok(ungroupExercises(grouped, "group-a").every((item) => !item.supersetId));
  assert.ok(normalizeSupersets([{ ...exercise("one", 1), supersetId: "orphan" }]).every((item) => !item.supersetId));
});
