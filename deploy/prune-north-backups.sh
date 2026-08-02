#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${NORTH_BACKUP_DIR:-/var/backups/north}"
DAILY_COPIES="${NORTH_BACKUP_DAILY_COPIES:-14}"
WEEKLY_COPIES="${NORTH_BACKUP_WEEKLY_COPIES:-8}"
MONTHLY_COPIES="${NORTH_BACKUP_MONTHLY_COPIES:-6}"
DRY_RUN="${NORTH_BACKUP_PRUNE_DRY_RUN:-0}"

declare -A KEEP=()
declare -A DAYS=()
declare -A WEEKS=()
declare -A MONTHS=()
declare -a BACKUPS=()

mapfile -t BACKUPS < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'north-????????T??????Z.dump.enc' -printf '%p\n' | sort -r)

keep_tier() {
  local tier="$1"
  local limit="$2"
  local kept=0
  local path name stamp key

  (( limit <= 0 )) && return
  for path in "${BACKUPS[@]}"; do
    name="$(basename "$path")"
    stamp="${name#north-}"
    stamp="${stamp%.dump.enc}"
    case "$tier" in
      day) key="${stamp:0:8}" ;;
      week) key="$(date -u -d "${stamp:0:8}" +%G-W%V)" ;;
      month) key="${stamp:0:6}" ;;
      *) printf 'Unknown retention tier: %s\n' "$tier" >&2; return 1 ;;
    esac

    case "$tier" in
      day) [[ -n "${DAYS[$key]:-}" ]] && continue; DAYS[$key]=1 ;;
      week) [[ -n "${WEEKS[$key]:-}" ]] && continue; WEEKS[$key]=1 ;;
      month) [[ -n "${MONTHS[$key]:-}" ]] && continue; MONTHS[$key]=1 ;;
    esac
    KEEP[$path]=1
    kept=$((kept + 1))
    (( kept >= limit )) && break
  done
}

keep_tier day "$DAILY_COPIES"
keep_tier week "$WEEKLY_COPIES"
keep_tier month "$MONTHLY_COPIES"

for path in "${BACKUPS[@]}"; do
  [[ -n "${KEEP[$path]:-}" ]] && continue
  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'Would delete %s\n' "$path"
  else
    rm -f -- "$path"
    printf 'Deleted %s\n' "$path"
  fi
done