#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME="${NORTH_DB_NAME:-north}"
RUN_ID="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "insert into job_runs(job_name,status) values('retention_cleanup','running') returning id")"
fail(){ runuser -u postgres -- psql -d "$DB_NAME" -c "update job_runs set status='failed',error_message='Retention cleanup failed',finished_at=now() where id='$RUN_ID'" >/dev/null || true; }
trap fail ERR

API_DAYS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "select coalesce((value#>>'{}')::int,14) from system_settings where key='api_log_retention_days'")"
EVENT_DAYS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "select coalesce((value#>>'{}')::int,90) from system_settings where key='operational_event_retention_days'")"
MUTATION_DAYS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "select coalesce((value#>>'{}')::int,30) from system_settings where key='mutation_receipt_retention_days'")"

LOGS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from api_request_logs where occurred_at < now()-make_interval(days=>$API_DAYS) returning 1) select count(*) from gone")"
EVENTS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from operational_events where resolved_at is not null and occurred_at < now()-make_interval(days=>$EVENT_DAYS) returning 1) select count(*) from gone")"
MUTATIONS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from document_mutations where created_at < now()-make_interval(days=>$MUTATION_DAYS) returning 1) select count(*) from gone")"

runuser -u postgres -- psql -d "$DB_NAME" -c "update job_runs set status='complete',details=jsonb_build_object('request_logs_deleted',$LOGS,'events_deleted',$EVENTS,'mutation_receipts_deleted',$MUTATIONS),finished_at=now() where id='$RUN_ID'" >/dev/null
