import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("production releases require traceability, capacity, locking, backup and restore proof", async () => {
  const release = await read("../deploy/apply-north-release.sh");
  assert.match(release, /exact Git commit SHA/);
  assert.match(release, /sha256sum --check/);
  assert.match(release, /flock -n/);
  assert.match(release, /MIN_FREE_KB/);
  assert.match(release, /backup-north\.sh/);
  assert.match(release, /verify-north-restore\.sh/);
});

test("database migrations are atomic and destructive pending migrations are rejected", async () => {
  const release = await read("../deploy/apply-north-release.sh");
  assert.match(release, /psql -1 -v ON_ERROR_STOP=1/);
  assert.match(release, /insert into schema_migrations/);
  assert.match(release, /drop\[\[:space:\]\]\+\(table\|column\)/);
  assert.doesNotMatch(release, /dropdb[^\n]+\$DB_NAME/);
});

test("the API activates and passes health before the browser distribution changes", async () => {
  const release = await read("../deploy/apply-north-release.sh");
  const api = release.indexOf("mv server.next server");
  const health = release.indexOf("curl --retry 30");
  const browser = release.indexOf("mv dist.next dist");
  assert.ok(api > 0 && health > api && browser > health);
  assert.match(release, /restore_application/);
});

test("backup verification records only a completed isolated restore", async () => {
  const [backup, restore] = await Promise.all([
    read("../deploy/backup-north.sh"),
    read("../deploy/verify-north-restore.sh"),
  ]);
  assert.match(backup, /verified_at=null/);
  assert.doesNotMatch(backup, /status='complete'[^\n]+verified_at=now\(\)/);
  assert.match(restore, /north_restore_test_/);
  assert.match(restore, /pg_restore --exit-on-error/);
  assert.match(restore, /to_regclass\('public\.app_users'\)/);
  assert.match(restore, /to_regclass\('public\.sync_documents'\)/);
  assert.match(restore, /verified_at=now\(\)/);
});
