#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
DB_NAME="${NORTH_DB_NAME:-north}"
BACKUP_DIR="${NORTH_BACKUP_DIR:-/var/backups/north}"
KEY_FILE="${NORTH_BACKUP_KEY_FILE:-/root/.north-backup-key}"
RESTORE_DB="north_restore_test"
LATEST="$(find "$BACKUP_DIR" -type f -name 'north-*.dump.enc' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
PLAIN="$(mktemp /tmp/north-restore.XXXXXX.dump)"
cleanup(){ runuser -u postgres -- dropdb --if-exists "$RESTORE_DB" >/dev/null 2>&1 || true; rm -f "$PLAIN"; }
trap cleanup EXIT
test -n "$LATEST"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$LATEST" -out "$PLAIN" -pass "file:$KEY_FILE"
chown postgres:postgres "$PLAIN"
runuser -u postgres -- dropdb --if-exists "$RESTORE_DB"
runuser -u postgres -- createdb "$RESTORE_DB"
runuser -u postgres -- pg_restore --no-owner --no-privileges -d "$RESTORE_DB" "$PLAIN"
runuser -u postgres -- psql -d "$RESTORE_DB" -Atc "select count(*) from schema_migrations" | grep -Eq '^[1-9][0-9]*$'
FILENAME="$(basename "$LATEST")"
runuser -u postgres -- psql -d "$DB_NAME" -c "update backup_runs set verified_at=now() where filename='$FILENAME' and status='complete'" >/dev/null
