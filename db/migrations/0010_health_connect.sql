create table health_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  provider text not null check (provider in ('health_connect','apple_health')),
  device_id uuid references devices(id) on delete set null,
  status text not null default 'connected' check (status in ('connected','paused','revoked','error')),
  scopes jsonb not null default '[]'::jsonb,
  source_apps jsonb not null default '[]'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id,provider)
);

create table health_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  provider text not null check (provider in ('health_connect','apple_health')),
  external_record_id text not null,
  record_type text not null check (record_type in ('steps','heart_rate','sleep','exercise','distance','active_calories','weight')),
  source_app text,
  source_device text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  payload jsonb not null,
  content_hash text not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id,provider,external_record_id)
);

create index health_records_owner_time_idx on health_records(owner_user_id,started_at desc);
create index health_records_owner_type_idx on health_records(owner_user_id,record_type,started_at desc);

