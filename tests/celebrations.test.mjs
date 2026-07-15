import assert from "node:assert/strict";
import test from "node:test";
import { deriveEarnedMoments } from "../src/data/celebrations.ts";

const record = (date) => ({ finishedAt: `${date}T12:00:00.000Z` });

test("recognises a first completed workout", () => {
  assert.deepEqual(deriveEarnedMoments([], "2026-07-15T12:00:00.000Z").map((item) => item.kind), ["first"]);
});

test("recognises a return after fourteen days without shaming the gap", () => {
  const moments = deriveEarnedMoments([record("2026-06-20")], "2026-07-15T12:00:00.000Z");
  assert.equal(moments.some((item) => item.kind === "comeback"), true);
  assert.match(moments.find((item) => item.kind === "comeback").detail, /remembers the return/);
});

test("recognises evidence-backed consecutive training weeks", () => {
  const moments = deriveEarnedMoments([record("2026-07-08")], "2026-07-15T12:00:00.000Z");
  assert.equal(moments.find((item) => item.kind === "rhythm")?.title, "2 weeks of showing up.");
});

test("only announces a program week when completion is explicit", () => {
  assert.equal(deriveEarnedMoments([record("2026-07-14")], "2026-07-15T12:00:00.000Z", false).some((item) => item.kind === "program"), false);
  assert.equal(deriveEarnedMoments([record("2026-07-14")], "2026-07-15T12:00:00.000Z", true).some((item) => item.kind === "program"), true);
});

test("uses the performed date for a workout entered later", () => {
  const moments = deriveEarnedMoments([{ performedAt: "2026-07-08T12:00:00.000Z", finishedAt: "2026-07-14T12:00:00.000Z" }], "2026-07-15T12:00:00.000Z");
  assert.equal(moments.find((item) => item.kind === "rhythm")?.title, "2 weeks of showing up.");
});
