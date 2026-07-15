alter table devices add column user_agent text;
alter table devices add column last_ip inet;
alter table devices add column revoked_at timestamptz;

alter table refresh_tokens add column device_id uuid references devices(id) on delete set null;
create index refresh_tokens_device_active_idx on refresh_tokens(device_id, expires_at) where revoked_at is null;

create table sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  document_key text not null,
  collection text not null,
  base_version bigint not null,
  remote_version bigint not null,
  local_data jsonb,
  remote_data jsonb,
  status text not null default 'open' check (status in ('open','kept_local','kept_remote','dismissed')),
  resolved_by uuid references app_users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index sync_conflicts_owner_open_idx on sync_conflicts(owner_user_id, created_at desc) where status='open';
create index sync_conflicts_created_idx on sync_conflicts(created_at desc);
