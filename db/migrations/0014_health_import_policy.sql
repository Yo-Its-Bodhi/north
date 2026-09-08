begin;

alter table health_connections add column if not exists connected_at timestamptz;
alter table health_connections add column if not exists import_from timestamptz;
alter table health_connections add column if not exists preferences jsonb not null default '{"workouts":true,"dailyMovement":true,"sleepRecovery":true,"bodyMeasurements":false}'::jsonb;

update health_connections
set connected_at = coalesce(connected_at, created_at),
    import_from = coalesce(import_from, created_at);

alter table health_connections alter column connected_at set default now();
alter table health_connections alter column connected_at set not null;
alter table health_connections alter column import_from set default now();
alter table health_connections alter column import_from set not null;

create index if not exists health_records_owner_provider_time_idx
  on health_records(owner_user_id, provider, started_at desc);

commit;