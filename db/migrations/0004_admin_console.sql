alter table app_users add column is_admin boolean not null default false;
alter table app_users add column status text not null default 'active'
  check (status in ('active', 'suspended'));
alter table app_users add column last_active_at timestamptz;

create table admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id) on delete set null,
  target_user_id uuid references app_users(id) on delete set null,
  action text not null,
  reason text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_events_created_idx on admin_audit_events(created_at desc);
create index admin_audit_events_target_idx on admin_audit_events(target_user_id, created_at desc);

create table access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_prefix text not null,
  label text not null,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0,
  expires_at timestamptz,
  enabled boolean not null default true,
  notes text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references app_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into system_settings(key,value,description) values
  ('registration.require_access_code','false'::jsonb,'Require an active access code for new registrations'),
  ('system.maintenance_mode','false'::jsonb,'Temporarily prevent normal member writes'),
  ('ui.announcement','null'::jsonb,'Optional global announcement configuration');
