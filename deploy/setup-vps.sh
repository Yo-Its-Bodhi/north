#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/north
DB_NAME=north
DB_USER=north_app
API_PORT=3020
OWNER_USERNAME="${NORTH_OWNER_USERNAME:-druwbi}"

cd "$APP_DIR"
npm ci --omit=dev
chmod 755 "$APP_DIR" "$APP_DIR/db" "$APP_DIR/db/migrations" "$APP_DIR/dist"
find "$APP_DIR/db/migrations" -type f -name '*.sql' -exec chmod 644 {} +
find "$APP_DIR/dist" -type d -exec chmod 755 {} +
find "$APP_DIR/dist" -type f -exec chmod 644 {} +

if [[ ! -f .env ]]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 48)"
  if ! runuser -u postgres -- psql -tAc "select 1 from pg_roles where rolname='$DB_USER'" | grep -q 1; then
    runuser -u postgres -- psql -c "create role $DB_USER login password '$DB_PASSWORD'"
  else
    runuser -u postgres -- psql -c "alter role $DB_USER password '$DB_PASSWORD'"
  fi
  if ! runuser -u postgres -- psql -lqt | cut -d '|' -f 1 | tr -d ' ' | grep -qx "$DB_NAME"; then
    runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
  fi
  install -m 600 /dev/null .env
  {
    echo "DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "PORT=$API_PORT"
    echo "HOST=127.0.0.1"
    echo "CORS_ORIGIN=https://north.bodhix.io"
  } > .env
fi

if ! grep -q '^NORTH_OWNER_USERNAME=' .env; then
  echo "NORTH_OWNER_USERNAME=$OWNER_USERNAME" >> .env
fi

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())"
if runuser -u postgres -- psql -d "$DB_NAME" -tAc "select to_regclass('public.app_users') is not null" | grep -q t; then
  runuser -u postgres -- psql -d "$DB_NAME" -c "insert into schema_migrations(filename) values('0001_initial.sql') on conflict do nothing"
fi
if runuser -u postgres -- psql -d "$DB_NAME" -tAc "select to_regclass('public.sync_documents') is not null" | grep -q t; then
  runuser -u postgres -- psql -d "$DB_NAME" -c "insert into schema_migrations(filename) values('0002_auth_and_document_sync.sql') on conflict do nothing"
fi
if runuser -u postgres -- psql -d "$DB_NAME" -tAc "select exists(select 1 from information_schema.columns where table_name='local_credentials' and column_name='username')" | grep -q t; then
  runuser -u postgres -- psql -d "$DB_NAME" -c "insert into schema_migrations(filename) values('0003_username_recovery.sql') on conflict do nothing"
fi
for migration in db/migrations/*.sql; do
  filename="$(basename "$migration")"
  if ! runuser -u postgres -- psql -d "$DB_NAME" -tAc "select 1 from schema_migrations where filename='$filename'" | grep -q 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$migration"
    runuser -u postgres -- psql -d "$DB_NAME" -c "insert into schema_migrations(filename) values('$filename')"
  fi
done

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB_NAME" <<SQL
grant connect on database $DB_NAME to $DB_USER;
grant usage on schema public to $DB_USER;
grant select, insert, update, delete on all tables in schema public to $DB_USER;
grant usage, select, update on all sequences in schema public to $DB_USER;
alter default privileges in schema public grant select, insert, update, delete on tables to $DB_USER;
alter default privileges in schema public grant usage, select, update on sequences to $DB_USER;
SQL

chmod 700 deploy/backup-north.sh deploy/verify-north-restore.sh deploy/maintain-north.sh
if [[ ! -s /root/.north-backup-key ]]; then
  openssl rand -base64 48 > /root/.north-backup-key
  chmod 600 /root/.north-backup-key
fi
install -d -m 700 /var/backups/north
cat > /etc/cron.d/north-operations <<'CRON'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
10 3 * * * root /opt/north/deploy/backup-north.sh >> /var/log/north-backup.log 2>&1
10 4 * * 0 root /opt/north/deploy/verify-north-restore.sh >> /var/log/north-restore-test.log 2>&1
40 3 * * * root /opt/north/deploy/maintain-north.sh >> /var/log/north-maintenance.log 2>&1
CRON
chmod 644 /etc/cron.d/north-operations

set -a
source .env
set +a
pm2 delete north-api >/dev/null 2>&1 || true
pm2 start server/index.mjs --name north-api --time
pm2 save

install -m 644 deploy/north.nginx /etc/nginx/sites-available/north.bodhix.io
ln -sfn /etc/nginx/sites-available/north.bodhix.io /etc/nginx/sites-enabled/north.bodhix.io
nginx -t
systemctl reload nginx

certbot --nginx -d north.bodhix.io --non-interactive --agree-tos --register-unsafely-without-email --redirect
nginx -t
systemctl reload nginx
