#!/usr/bin/env bash
set -euo pipefail
tar -xzf /tmp/north-health-release.tar.gz -C /opt/north
if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='0010_health_connect.sql'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f /opt/north/db/migrations/0010_health_connect.sql
  runuser -u postgres -- psql -d north -c "insert into schema_migrations(filename) values('0010_health_connect.sql')"
fi
if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='0014_health_import_policy.sql'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f /opt/north/db/migrations/0014_health_import_policy.sql
  runuser -u postgres -- psql -d north -c "insert into schema_migrations(filename) values('0014_health_import_policy.sql')"
fi
if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='0015_total_calories.sql'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f /opt/north/db/migrations/0015_total_calories.sql
  runuser -u postgres -- psql -d north -c "insert into schema_migrations(filename) values('0015_total_calories.sql')"
fi
if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='0016_health_daily_summary.sql'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f /opt/north/db/migrations/0016_health_daily_summary.sql
  runuser -u postgres -- psql -d north -c "insert into schema_migrations(filename) values('0016_health_daily_summary.sql')"
fi
runuser -u postgres -- psql -d north -c "grant select,insert,update,delete on health_connections,health_records to north_app"
chown -R root:root /opt/north/dist /opt/north/server /opt/north/db /opt/north/deploy
chmod 700 /opt/north/deploy/*.sh
/opt/north/deploy/install-north-operations.sh
cd /opt/north
pm2 restart north-api --update-env >/dev/null
pm2 save >/dev/null
rm -f /tmp/north-health-release.tar.gz /tmp/apply-health-release.sh
curl --retry 30 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3020/health
