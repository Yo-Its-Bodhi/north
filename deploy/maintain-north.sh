#!/usr/bin/env bash
set -Eeuo pipefail
DB_NAME="${NORTH_DB_NAME:-north}"
RUN_ID="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "insert into job_runs(job_name,status) values('retention_cleanup','running') returning id")"
fail(){ runuser -u postgres -- psql -d "$DB_NAME" -c "update job_runs set status='failed',error_message='Retention cleanup failed',finished_at=now() where id='$RUN_ID'" >/dev/null || true; }
trap fail ERR

retention_days(){
	local key="$1"
	local fallback="$2"
	runuser -u postgres -- psql -d "$DB_NAME" -Atq -v fallback="$fallback" -v key="$key" -c "select greatest(1,least(3650,coalesce((select (value#>>'{}')::int from system_settings where system_settings.key=:'key'),:fallback::int)))"
}

API_DAYS="$(retention_days api_log_retention_days 14)"
EVENT_DAYS="$(retention_days operational_event_retention_days 90)"
MUTATION_DAYS="$(retention_days mutation_receipt_retention_days 30)"
SESSION_DAYS="$(retention_days expired_session_retention_days 30)"

LOGS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from api_request_logs where occurred_at < now()-make_interval(days=>$API_DAYS) returning 1) select count(*) from gone")"
EVENTS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from operational_events where resolved_at is not null and occurred_at < now()-make_interval(days=>$EVENT_DAYS) returning 1) select count(*) from gone")"
MUTATIONS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from document_mutations where created_at < now()-make_interval(days=>$MUTATION_DAYS) returning 1) select count(*) from gone")"
SESSIONS="$(runuser -u postgres -- psql -d "$DB_NAME" -Atq -c "with gone as (delete from refresh_tokens where (expires_at < now()-make_interval(days=>$SESSION_DAYS)) or (revoked_at is not null and revoked_at < now()-make_interval(days=>$SESSION_DAYS)) returning 1) select count(*) from gone")"

runuser -u postgres -- psql -d "$DB_NAME" -c "update job_runs set status='complete',details=jsonb_build_object('request_logs_deleted',$LOGS,'events_deleted',$EVENTS,'mutation_receipts_deleted',$MUTATIONS,'expired_sessions_deleted',$SESSIONS),finished_at=now() where id='$RUN_ID'" >/dev/null
