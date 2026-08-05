import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { uniquePngName } from "../src/components/ExportFileName.ts";

const trophySource = readFileSync(new URL("../src/components/TrophyShare.ts", import.meta.url), "utf8");
const atlasSource = readFileSync(new URL("../src/components/TrainingAtlas.tsx", import.meta.url), "utf8");

test("PNG export names are readable, filesystem-safe, and timestamped", () => {
  assert.equal(
    uniquePngName(
      ["North", "PR", "Dumbbell Romanian Deadlift", "225.5", "lb", "earned-2026-07-14"],
      new Date(2026, 7, 5, 14, 38, 27, 123),
    ),
    "north-pr-dumbbell-romanian-deadlift-225-5-lb-earned-2026-07-14-exported-2026-08-05-143827-123.png",
  );
});

test("repeat PNG exports receive different names", () => {
  const first = uniquePngName(["north", "atlas", "August 2026", "sessions", "square"], new Date(2026, 7, 5, 14, 38, 29, 441));
  const second = uniquePngName(["north", "atlas", "August 2026", "sessions", "square"], new Date(2026, 7, 5, 14, 38, 29, 442));
  assert.notEqual(first, second);
  assert.equal(first, "north-atlas-august-2026-sessions-square-exported-2026-08-05-143829-441.png");
});

test("every member PNG pipeline uses contextual unique names", () => {
  assert.match(trophySource, /uniquePngName\(\[[\s\S]*record\.title[\s\S]*record\.value[\s\S]*record\.date/);
  assert.match(atlasSource, /uniquePngName\(\["north", "atlas", bounds\.label, metric, recapFormat\]\)/);
  assert.doesNotMatch(atlasSource, /north-training-recap-\$\{recapFormat\}\.png/);
});
