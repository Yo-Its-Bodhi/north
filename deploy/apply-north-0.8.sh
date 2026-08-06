#!/usr/bin/env bash
set -euo pipefail

archive=/tmp/north-0.8-release.tar.gz
stage=/tmp/north-0.8-stage
app=/opt/north
rollback_root=/opt/north-rollbacks
site=/etc/nginx/sites-available/north.bodhix.io
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
rollback="$rollback_root/pre-0.8-$timestamp"
database_dump="/tmp/north-0.8-$timestamp.dump"
commit_sha=${1:-unknown}

test -s "$archive"
curl -fsS http://127.0.0.1:3020/health >/dev/null
install -d -m 700 "$stage" "$rollback_root" "$rollback"
rm -rf "$stage"/*
tar -xzf "$archive" -C "$stage"
test -f "$stage/dist/index.html"
test -f "$stage/server/index.mjs"
test -f "$stage/server/together-routes.mjs"
test -f "$stage/deploy/north.nginx"
test -f "$stage/package-lock.json"

while IFS= read -r source; do node --check "$source" >/dev/null; done < <(find "$stage/server" -type f -name '*.mjs' -print)
tar -czf "$rollback/files.tar.gz" -C / opt/north/dist opt/north/server opt/north/package.json opt/north/package-lock.json etc/nginx/sites-available/north.bodhix.io
runuser -u postgres -- pg_dump -Fc -d north -f "$database_dump"
install -m 600 "$database_dump" "$rollback/database.dump"
rm -f "$database_dump"
printf '%s\n' "$commit_sha" > "$rollback/commit.txt"

restore_files() {
  tar -xzf "$rollback/files.tar.gz" -C /
  cd "$app"
  npm ci --omit=dev --ignore-scripts >/dev/null
  nginx -t
  systemctl reload nginx
  pm2 restart north-api --update-env >/dev/null
  pm2 save >/dev/null
}
trap 'status=$?; if (( status != 0 )); then restore_files || true; fi; exit $status' EXIT

rm -rf "$app/dist.next" "$app/server.next"
cp -a "$stage/dist" "$app/dist.next"
cp -a "$stage/server" "$app/server.next"
install -m 644 "$stage/package.json" "$app/package.json"
install -m 644 "$stage/package-lock.json" "$app/package-lock.json"
install -d -m 755 "$app/db/migrations" "$app/db/rollback" "$app/deploy"
install -m 644 "$stage"/db/migrations/002{0,1,2,3}_*.sql "$app/db/migrations/"
install -m 644 "$stage/db/rollback/0023_together_account_deletion.sql" "$app/db/rollback/"
install -m 644 "$stage/deploy/north.nginx" "$app/deploy/north.nginx"

cd "$app"
npm ci --omit=dev --ignore-scripts >/dev/null
rm -rf dist.previous server.previous
mv dist dist.previous
mv dist.next dist
mv server server.previous
mv server.next server

for migration in 0020_together_foundation.sql 0021_together_moderation.sql 0022_together_push.sql 0023_together_account_deletion.sql; do
  if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='$migration'" | grep -qx 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f "$app/db/migrations/$migration" >/dev/null
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -c "insert into schema_migrations(filename) values('$migration')" >/dev/null
  fi
done
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north <<'SQL' >/dev/null
grant select,insert,update,delete on all tables in schema public to north_app;
grant usage,select on all sequences in schema public to north_app;
SQL

install -m 644 "$stage/deploy/north.nginx" "$site"
nginx -t
systemctl reload nginx
pm2 restart north-api --update-env >/dev/null
pm2 save >/dev/null
curl --retry 30 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3020/health >/dev/null
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3020/v1/together/inbox)" = 401
test "$(runuser -u postgres -- psql -d north -tAc "select count(*) from schema_migrations where filename in ('0020_together_foundation.sql','0021_together_moderation.sql','0022_together_push.sql','0023_together_account_deletion.sql')")" = 4
test "$(runuser -u postgres -- psql -d north -tAc "select count(*) from together_rooms where slug in ('general','help','north-updates')")" = 3

printf '%s\n' "$commit_sha" > "$app/dist/release-commit.txt"
rm -rf "$app/dist.previous" "$app/server.previous" "$stage" "$archive"
trap - EXIT
printf 'North 0.8 deployed. Rollback snapshot: %s\n' "$rollback"