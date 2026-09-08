#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ARCHIVE="${NORTH_RELEASE_ARCHIVE:-/tmp/north-release.tar.gz}"
APP_DIR="${NORTH_APP_DIR:-/opt/north}"
DB_NAME="${NORTH_DB_NAME:-north}"
SITE="${NORTH_NGINX_SITE:-/etc/nginx/sites-available/north.bodhix.io}"
ROLLBACK_ROOT="${NORTH_ROLLBACK_ROOT:-/opt/north-rollbacks}"
MIN_FREE_KB="${NORTH_RELEASE_MIN_FREE_KB:-5242880}"
RELEASE_SHA="${1:-}"
EXPECTED_SHA256="${2:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$(mktemp -d /tmp/north-release-stage.XXXXXX)"
ROLLBACK="$ROLLBACK_ROOT/pre-release-$STAMP"
LOCK_FILE="/var/lock/north-release.lock"
ACTIVATION_STARTED=0

cleanup(){ rm -rf "$STAGE"; }
trap cleanup EXIT

exec 9>"$LOCK_FILE"
flock -n 9 || { printf 'Another North release is already running.\n' >&2; exit 1; }

[[ "$RELEASE_SHA" =~ ^[0-9a-f]{7,40}$ ]] || { printf 'Pass the exact Git commit SHA as argument one.\n' >&2; exit 1; }
test -s "$ARCHIVE"
if [[ -n "$EXPECTED_SHA256" ]]; then
  printf '%s  %s\n' "$EXPECTED_SHA256" "$ARCHIVE" | sha256sum --check --status
fi

FREE_KB="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $4}')"
(( FREE_KB >= MIN_FREE_KB )) || { printf 'North release stopped: only %s KB is free.\n' "$FREE_KB" >&2; exit 1; }
curl -fsS http://127.0.0.1:3020/health >/dev/null

tar -xzf "$ARCHIVE" -C "$STAGE"
for required in dist/index.html server/index.mjs package.json package-lock.json deploy/north.nginx deploy/backup-north.sh deploy/verify-north-restore.sh; do
  test -f "$STAGE/$required" || { printf 'Release is missing %s.\n' "$required" >&2; exit 1; }
done
test ! -e "$STAGE/.env"
while IFS= read -r source; do node --check "$source" >/dev/null; done < <(find "$STAGE/server" -type f -name '*.mjs' -print)

install -d -m 700 "$ROLLBACK_ROOT" "$ROLLBACK"
tar -czf "$ROLLBACK/files.tar.gz" -C / \
  opt/north/dist opt/north/server opt/north/deploy opt/north/package.json opt/north/package-lock.json \
  etc/nginx/sites-available/north.bodhix.io
printf '%s\n' "$RELEASE_SHA" > "$ROLLBACK/incoming-commit.txt"

chmod 700 "$STAGE/deploy/"*.sh
"$STAGE/deploy/backup-north.sh"
"$STAGE/deploy/verify-north-restore.sh"

install -d -m 755 "$APP_DIR/db/migrations" "$APP_DIR/db/rollback" "$APP_DIR/deploy"
if [[ -d "$STAGE/db/migrations" ]]; then
  while IFS= read -r migration; do
    filename="$(basename "$migration")"
    if runuser -u postgres -- psql -d "$DB_NAME" -tAc "select 1 from schema_migrations where filename='$filename'" | grep -qx 1; then
      continue
    fi
    if grep -Eiq '\b(drop[[:space:]]+(table|column)|truncate[[:space:]]+table)\b' "$migration"; then
      printf 'Pending migration %s contains a destructive operation and requires a separate reviewed release.\n' "$filename" >&2
      exit 1
    fi
    install -m 644 "$migration" "$APP_DIR/db/migrations/$filename"
    runuser -u postgres -- psql -1 -v ON_ERROR_STOP=1 -d "$DB_NAME" \
      -f "$APP_DIR/db/migrations/$filename" \
      -c "insert into schema_migrations(filename) values('$filename')" >/dev/null
  done < <(find "$STAGE/db/migrations" -maxdepth 1 -type f -name '*.sql' -print | sort)
fi
if [[ -d "$STAGE/db/rollback" ]]; then
  find "$STAGE/db/rollback" -maxdepth 1 -type f -name '*.sql' -exec install -m 644 {} "$APP_DIR/db/rollback/" \;
fi

restore_application(){
  tar -xzf "$ROLLBACK/files.tar.gz" -C /
  cd "$APP_DIR"
  npm ci --omit=dev --ignore-scripts >/dev/null
  nginx -t
  systemctl reload nginx
  pm2 restart north-api --update-env >/dev/null
  pm2 save >/dev/null
}
release_failed(){
  status=$?
  if (( ACTIVATION_STARTED == 1 )); then restore_application || true; fi
  exit "$status"
}
trap release_failed ERR

rm -rf "$APP_DIR/server.next" "$APP_DIR/dist.next"
cp -a "$STAGE/server" "$APP_DIR/server.next"
cp -a "$STAGE/dist" "$APP_DIR/dist.next"
install -m 644 "$STAGE/package.json" "$APP_DIR/package.json"
install -m 644 "$STAGE/package-lock.json" "$APP_DIR/package-lock.json"
cp -a "$STAGE/deploy/." "$APP_DIR/deploy/"
chmod 700 "$APP_DIR/deploy/"*.sh

cd "$APP_DIR"
npm ci --omit=dev --ignore-scripts >/dev/null
ACTIVATION_STARTED=1
rm -rf server.previous
mv server server.previous
mv server.next server
pm2 restart north-api --update-env >/dev/null
pm2 save >/dev/null
curl --retry 30 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3020/health >/dev/null

rm -rf dist.previous
mv dist dist.previous
mv dist.next dist
printf '%s\n' "$RELEASE_SHA" > "$APP_DIR/dist/release-commit.txt"

install -m 644 "$STAGE/deploy/north.nginx" "$SITE"
nginx -t
systemctl reload nginx
curl --retry 15 --retry-delay 1 -fsS https://north.bodhix.io/health >/dev/null
test "$(curl -sS -o /dev/null -w '%{http_code}' https://north.bodhix.io/v1/me)" = 401

rm -rf "$APP_DIR/server.previous" "$APP_DIR/dist.previous"
printf '%s\n' "$RELEASE_SHA" > "$ROLLBACK/release-commit.txt"
trap - ERR
rm -f "$ARCHIVE"
printf 'North release %s deployed. Rollback snapshot: %s\n' "$RELEASE_SHA" "$ROLLBACK"

