import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/destination-reliability.css", import.meta.url), "utf8");

test("This Day uses a calm milestone-like summary panel", () => {
  assert.match(styles, /\.journey-this-day \.momentum-panel \{[\s\S]*border: 1px solid var\(--north-divider\)/);
  assert.match(styles, /\.journey-this-day \.momentum-panel \{[\s\S]*var\(--surface-solid\) 70%\)[\s\S]*var\(--north-shadow-panel\)/);
  assert.match(styles, /\.journey-this-day \.momentum-panel::after \{ display: none; \}/);
  assert.match(styles, /\.journey-this-day \.momentum-panel > svg \{[\s\S]*box-shadow: none !important/);
});