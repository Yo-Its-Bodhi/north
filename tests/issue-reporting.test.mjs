import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("issue reports are durable, authenticated, and visible to the owner", async () => {
  const [server, migration] = await Promise.all([
    read("../server/index.mjs"),
    read("../db/migrations/0017_issue_reports.sql"),
  ]);

  assert.match(server, /app\.post\("\/v1\/issues", \{ preHandler: app\.authenticate/);
  assert.match(server, /app\.get\("\/v1\/admin\/issues", \{ preHandler: app\.requireAdmin/);
  assert.match(server, /app\.patch\("\/v1\/admin\/issues\/:id", \{ preHandler: app\.requireAdmin/);
  assert.match(server, /NORTH_ISSUE_WEBHOOK_URL/);
  assert.match(migration, /create table issue_reports/);
  assert.match(migration, /status text not null default 'unread'/);
});

test("the member app exposes one shared report action and submits page context", async () => {
  const app = await read("../src/App.tsx");

  assert.match(app, /screen !== "workout" && <footer className="global-report-footer">/);
  assert.match(app, /Report a bug \/ issue \/ problem/);
  assert.match(app, /fetch\(`\$\{NORTH_API_BASE\}\/v1\/issues`/);
  assert.match(app, /sourceScreen: testReturnScreen/);
  assert.doesNotMatch(app, /Something got in the way/);
  assert.doesNotMatch(app, /Gym test notes/);
});
