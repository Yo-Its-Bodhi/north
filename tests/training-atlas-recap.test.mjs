import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const atlasSource = readFileSync(new URL("../src/components/TrainingAtlas.tsx", import.meta.url), "utf8");
const recapSource = readFileSync(new URL("../src/components/TrainingRecap.ts", import.meta.url), "utf8");

test("Create recap reveals and focuses the offscreen composer", () => {
  assert.match(atlasSource, /function openRecap\(\)[\s\S]*setRecapOpen\(true\)/);
  assert.match(atlasSource, /composer\?\.scrollIntoView\(\{ block: "center" \}\)/);
  assert.match(atlasSource, /Close recap composer[\s\S]*focus\(\{ preventScroll: true \}\)/);
  assert.match(atlasSource, /aria-expanded=\{recapOpen\} onClick=\{openRecap\}/);
});

test("exported recaps use the active theme, North footprint, and labeled charts", () => {
  for (const token of ["--surface-solid", "--blue", "--ink", "--muted", "--line"]) {
    assert.ok(recapSource.includes(token), `missing active theme token ${token}`);
  }
  assert.match(recapSource, /footprint-clean-black-transparent\.png/);
  assert.match(recapSource, /globalCompositeOperation = "destination-out"/);
  assert.match(recapSource, /metricLabel\.toUpperCase\(\).*BY PERIOD/);
  assert.match(recapSource, /fillText\(bucket\.label/);
  assert.match(recapSource, /fillText\(String\(Math\.round\(bucket\.value\)\)/);
  assert.doesNotMatch(atlasSource, /fillText\("N"/);
});