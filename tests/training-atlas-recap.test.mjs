import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const atlasSource = readFileSync(new URL("../src/components/TrainingAtlas.tsx", import.meta.url), "utf8");
const recapSource = readFileSync(new URL("../src/components/TrainingRecap.ts", import.meta.url), "utf8");
const atlasStyles = readFileSync(new URL("../src/components/TrainingAtlas.css", import.meta.url), "utf8");

test("Create recap reveals and focuses the offscreen composer", () => {
  assert.match(atlasSource, /function openRecap\(\)[\s\S]*setRecapOpen\(true\)/);
  assert.match(atlasSource, /composer\?\.scrollIntoView\(\{ block: "center" \}\)/);
  assert.match(atlasSource, /Close recap composer[\s\S]*focus\(\{ preventScroll: true \}\)/);
  assert.match(atlasSource, /Share your effort/);
  assert.match(atlasSource, /Show what your effort added up to/);
  assert.match(atlasSource, /sessions, reps, minutes and weight moved/);
  assert.match(atlasSource, /body weight, recovery notes and exact dates stay out/);
});

test("Atlas offers explicit controls and gradient comparison lines", () => {
  assert.match(atlasSource, /type ChartMode = "bars" \| "lines"/);
  assert.match(atlasSource, /Sets every total and comparison below/);
  assert.match(atlasSource, /Changes the chart and comparison/);
  assert.match(atlasSource, /Same evidence, different shape/);
  assert.match(atlasSource, /ChartColumn[\s\S]*ChartSpline/);
  assert.match(atlasSource, /atlas-line-stroke/);
  assert.match(atlasSource, /atlas-line-fill/);
  assert.match(atlasSource, /atlas-line-previous/);
  assert.match(atlasStyles, /\.atlas-line-current-glow\{fill:none\}/);
  assert.match(atlasSource, /aria-pressed=\{chartMode === item\.id\}/);
  assert.match(atlasSource, /aria-pressed=\{item === metric\}/);
  assert.match(atlasSource, /Current: \$\{metricAmount\(bucket\[metric\]\)\}/);
  assert.match(atlasSource, /Previous: \$\{metricAmount\(previous\)\}/);
  assert.match(atlasSource, /more" : "less"\} than the previous period/);
});

test("exported recaps use the Trophy Room frame, active theme, and labeled charts", () => {
  for (const token of ["--surface-solid", "--blue", "--navy", "--ink", "--muted", "--line"]) {
    assert.ok(recapSource.includes(token), `missing active theme token ${token}`);
  }
  assert.match(recapSource, /footprint-stamp-offwhite\.png/);
  assert.match(recapSource, /createLinearGradient\(0, 0, width, headerHeight\)/);
  assert.match(recapSource, /header\.addColorStop\(\.62, model\.theme\.navy\)/);
  assert.match(recapSource, /rgba\(255,255,255,\.32\)/);
  assert.match(recapSource, /NORTH JOURNEY/);
  assert.match(recapSource, /TRAINING RECAP/);
  assert.match(recapSource, /"Barlow Condensed", sans-serif/);
  assert.match(recapSource, /metricLabel\.toUpperCase\(\).*BY PERIOD/);
  assert.match(recapSource, /fillText\(bucket\.label/);
  assert.match(recapSource, /fillText\(String\(Math\.round\(bucket\.value\)\)/);
  assert.doesNotMatch(atlasSource, /fillText\("N"/);
});