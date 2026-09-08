import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration=await readFile(new URL("../db/migrations/0011_exercise_library_v2.sql",import.meta.url),"utf8");
const rollback=await readFile(new URL("../db/rollback/0011_exercise_library_v2.sql",import.meta.url),"utf8");

test("exercise-library migration is transactional, additive, and preserves existing workout rows",()=>{
  assert.match(migration,/^--[\s\S]*\bbegin;/i);
  assert.match(migration,/\bcommit;\s*$/i);
  assert.match(migration,/create (?:schema|table|index) if not exists/gi);
  assert.match(migration,/alter table public\.exercises add column if not exists/i);
  assert.doesNotMatch(migration,/\b(drop|truncate|delete\s+from)\b/i);
});

test("exercise-library rollback is explicit and never drops public user-data tables",()=>{
  assert.match(rollback,/Manual rollback only/i);
  assert.match(rollback,/drop schema if exists exercise_library cascade/i);
  assert.doesNotMatch(rollback,/drop table\s+(?:if exists\s+)?public\./i);
  assert.doesNotMatch(rollback,/\b(truncate|delete\s+from)\b/i);
});
