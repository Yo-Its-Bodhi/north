import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routes = readFileSync(new URL("../server/community-routes.mjs", import.meta.url), "utf8");
const migration = readFileSync(new URL("../db/migrations/0013_community_workouts.sql", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("community publications are separate immutable-at-use snapshots", () => {
  assert.match(migration, /template_snapshot jsonb not null/);
  assert.match(migration, /owner_user_id uuid not null references app_users/);
  assert.match(migration, /original_workout_id uuid references community_workouts/);
  assert.match(migration, /unique \(owner_user_id, source_template_id\)/);
});

test("only the authenticated creator can update or remove a publication", () => {
  assert.match(routes, /on conflict\(owner_user_id,source_template_id\)/);
  assert.match(routes, /where id=\$1 and owner_user_id=\$2 and status='published'/);
  assert.doesNotMatch(routes, /request\.body\?\.owner/i);
});

test("community reads are bounded and interactions use explicit actions", () => {
  assert.match(routes, /Math\.min\(50/);
  assert.match(routes, /limit \$1 offset \$2/);
  assert.match(routes, /new Set\(\["save", "start"\]\)/);
  assert.match(routes, /const column = action === "save" \? "save_count" : "start_count"/);
  assert.match(routes, /set \$\{column\}=\$\{column\}\+1/);
});

test("saving creates a personal copy with lineage while starting does not claim ownership", () => {
  assert.match(appSource, /sourceCommunityWorkoutId: template\.community\.id/);
  assert.match(appSource, /community: undefined/);
  assert.match(appSource, /Save to My Workouts/);
  assert.match(appSource, /startCommunityTemplate\(selectedTemplate\)/);
  assert.match(appSource, /Only the creator can update this published version/);
});

test("unchanged copies cannot be republished as new Community contributions", () => {
  assert.match(routes, /derivativeFingerprint/);
  assert.match(routes, /Make a meaningful training change before publishing this copy/);
  assert.match(routes, /original_creator_name/);
});