import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("retention settings map to the scheduled cleanup job", async () => {
  const [operations, requestLogs, sessions, maintenance, installer] = await Promise.all([
    read("../db/migrations/0007_operations_and_support.sql"),
    read("../db/migrations/0008_request_logs_and_jobs.sql"),
    read("../db/migrations/0018_expired_session_retention.sql"),
    read("../deploy/maintain-north.sh"),
    read("../deploy/install-north-operations.sh"),
  ]);

  assert.match(operations, /operational_event_retention_days/);
  assert.match(requestLogs, /api_log_retention_days/);
  assert.match(requestLogs, /mutation_receipt_retention_days/);
  assert.match(sessions, /expired_session_retention_days/);
  assert.match(maintenance, /delete from api_request_logs where occurred_at/);
  assert.match(maintenance, /delete from operational_events where resolved_at is not null/);
  assert.match(maintenance, /delete from document_mutations where created_at/);
  assert.match(maintenance, /delete from refresh_tokens where \(expires_at/);
  assert.match(maintenance, /greatest\(1,least\(3650/);
  assert.match(maintenance, /'expired_sessions_deleted',\$SESSIONS/);
  assert.match(installer, /40 3 \* \* \* root \/opt\/north\/deploy\/maintain-north\.sh/);
});

test("retention cleanup preserves unresolved security events and active sessions", async () => {
  const maintenance = await read("../deploy/maintain-north.sh");

  assert.doesNotMatch(maintenance, /delete from operational_events(?! where resolved_at is not null)/);
  assert.doesNotMatch(maintenance, /delete from refresh_tokens where created_at/);
  assert.doesNotMatch(maintenance, /delete from (?:admin_audit_events|support_notes|health_records)/);
});