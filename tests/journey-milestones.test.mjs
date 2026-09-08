import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const journeyStyles = readFileSync(new URL("../src/styles/runtime-06.css", import.meta.url), "utf8");
const reliabilityStyles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");

test("the Milestones view keeps the Journey footprint and removes only the misplaced ring", () => {
  assert.match(appSource, /journey-destination journey-\$\{journeyTab\}/);
  assert.match(reliabilityStyles, /destination-brand-header::after[\s\S]*footprint-stamp-black\.svg/);
  assert.doesNotMatch(reliabilityStyles, /\.journey-milestones \.destination-brand-journey::after \{ display: none; \}/);
  assert.match(reliabilityStyles, /\.journey-milestones \.milestone-summary::after \{ display: none; \}/);
});

test("milestone filters can return to All and remain reachable on mobile", () => {
  assert.match(appSource, /current === category && category !== "All" \? "All" : category/);
  assert.match(appSource, /aria-pressed=\{milestoneFilter === category\}/);
  assert.match(journeyStyles, /\.chapter-filters\{justify-content:flex-start;/);
  assert.match(journeyStyles, /touch-action:pan-x/);
  assert.match(journeyStyles, /\.chapter-filters button\{flex:0 0 auto;/);
});

test("milestones disclose plain progress details by tap, long press, and keyboard", () => {
  for (const marker of [
    "expandedMilestoneId",
    'role="button"',
    'aria-expanded={expanded}',
    "onContextMenu",
    "event.key === \"Enter\"",
    "milestone.description",
    "to go.",
    "milestone-explanation",
  ]) assert.ok(appSource.includes(marker), `missing milestone disclosure contract: ${marker}`);
});