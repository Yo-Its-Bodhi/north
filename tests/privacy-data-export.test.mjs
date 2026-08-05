import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("owner data export covers account-scoped product and operational records", async () => {
  const server = await read("../server/index.mjs");
  const exportRoute = server.slice(server.indexOf('app.get("/v1/admin/users/:id/export"'), server.indexOf('app.get("/v1/admin/audit/export"'));

  for (const table of [
    "sync_documents", "workout_sessions", "activities", "check_ins", "devices", "refresh_tokens",
    "health_connections", "health_records", "nova_conversations", "nova_messages", "nova_goals",
    "nova_memory_entries", "nova_action_proposals", "nova_action_events", "nova_usage_events",
    "community_workouts", "support_notes", "issue_reports", "sync_conflicts", "api_request_logs", "admin_audit_events",
  ]) assert.match(exportRoute, new RegExp(`from ${table}\\b`), `${table} is missing from the owner export`);

  assert.match(exportRoute, /preHandler: app\.requireAdmin/);
  assert.match(exportRoute, /auditAdmin\(request, "user\.export"/);
});

test("owner data export excludes reusable credential material", async () => {
  const server = await read("../server/index.mjs");
  const exportRoute = server.slice(server.indexOf('app.get("/v1/admin/users/:id/export"'), server.indexOf('app.get("/v1/admin/audit/export"'));

  assert.doesNotMatch(exportRoute, /password_hash|recovery_code_hash|token_hash/);
  assert.doesNotMatch(exportRoute, /select \* from refresh_tokens/);
});