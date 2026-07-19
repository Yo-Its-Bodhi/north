import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("server serializes array documents as JSONB instead of PostgreSQL arrays", async () => {
  const source = await readFile(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert.match(source, /\$4::jsonb/);
  assert.match(source, /JSON\.stringify\(mutation\.operation === "delete" \? null : mutation\.data\)/);
});
