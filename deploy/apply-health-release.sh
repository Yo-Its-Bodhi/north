#!/usr/bin/env bash
set -euo pipefail
tar -xzf /tmp/north-health-release.tar.gz -C /opt/north
if ! runuser -u postgres -- psql -d north -tAc "select 1 from schema_migrations where filename='0010_health_connect.sql'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d north -f /opt/north/db/migrations/0010_health_connect.sql
  runuser -u postgres -- psql -d north -c "insert into schema_migrations(filename) values('0010_health_connect.sql')"
fi
runuser -u postgres -- psql -d north -c "grant select,insert,update,delete on health_connections,health_records to north_app"
chown -R root:root /opt/north/dist /opt/north/server /opt/north/db /opt/north/deploy
cd /opt/north
pm2 restart north-api --update-env >/dev/null
pm2 save >/dev/null
rm -f /tmp/north-health-release.tar.gz /tmp/apply-health-release.sh
sleep 2
curl -fsS http://127.0.0.1:3020/health
