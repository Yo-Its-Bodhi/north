#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DB_NAME="${NORTH_DB_NAME:-north}"
BACKUP_DIR="${NORTH_BACKUP_DIR:-/var/backups/north}"
KEY_FILE="${NORTH_BACKUP_KEY_FILE:-/root/.north-backup-key}"
RETENTION_DAYS="${NORTH_BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="north-${STAMP}.dump.enc"
TARGET="${BACKUP_DIR}/${NAME}"
PLAIN="$(mktemp /tmp/north-backup.XXXXXX.dump)"
VERIFY="$(mktemp /tmp/north-verify.XXXXXX.dump)"
RUN_ID="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "insert into backup_runs(status,filename) values('running','$NAME') returning id")"

finish() { rm -f "$PLAIN" "$VERIFY"; }
fail() {
  local message="Backup failed at line $1"
  runuser -u postgres -- psql -d "$DB_NAME" -c "update backup_runs set status='failed',error_message='Backup script failed',finished_at=now() where id='$RUN_ID'" >/dev/null || true
  finish
}
trap 'fail $LINENO' ERR
trap finish EXIT

install -d -m 700 "$BACKUP_DIR"
test -s "$KEY_FILE"
chown postgres:postgres "$PLAIN"
runuser -u postgres -- pg_dump -Fc -d "$DB_NAME" -f "$PLAIN"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -in "$PLAIN" -out "$TARGET" -pass "file:$KEY_FILE"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$TARGET" -out "$VERIFY" -pass "file:$KEY_FILE"
pg_restore --list "$VERIFY" >/dev/null
SIZE="$(stat -c %s "$TARGET")"
runuser -u postgres -- psql -d "$DB_NAME" -c "update backup_runs set status='complete',size_bytes=$SIZE,verified_at=now(),finished_at=now() where id='$RUN_ID'" >/dev/null
find "$BACKUP_DIR" -type f -name 'north-*.dump.enc' -mtime "+$RETENTION_DAYS" -delete
