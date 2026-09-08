#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_DIR="${NORTH_BACKUP_DIR:-/var/backups/north}"
CONFIG_FILE="${NORTH_BACKUP_OFFSITE_CONFIG:-/etc/north-backup-offsite.conf}"

if [[ ! -s "$CONFIG_FILE" ]]; then
  printf 'Offsite backup sync is disabled: %s is not configured\n' "$CONFIG_FILE"
  exit 0
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"
: "${NORTH_BACKUP_OFFSITE_REMOTE:?Set NORTH_BACKUP_OFFSITE_REMOTE in $CONFIG_FILE}"
command -v rclone >/dev/null

rclone sync "$BACKUP_DIR" "$NORTH_BACKUP_OFFSITE_REMOTE" \
  --include 'north-*.dump.enc' \
  --checksum \
  --transfers 2 \
  --checkers 4
rclone check "$BACKUP_DIR" "$NORTH_BACKUP_OFFSITE_REMOTE" \
  --include 'north-*.dump.enc' \
  --checksum \
  --one-way