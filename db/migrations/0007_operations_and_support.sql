create table backup_runs (
  id uuid primary key default gen_random_uuid(),
  filename text,
  status text not null check (status in ('running','complete','failed')),
  size_bytes bigint,
  encrypted boolean not null default true,
  verified_at timestamptz,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index backup_runs_started_idx on backup_runs(started_at desc);

create table operational_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info','warning','error','critical')),
  source text not null,
  category text not null,
  message text not null,
  request_id text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references app_users(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index operational_events_open_idx on operational_events(severity,occurred_at desc) where resolved_at is null;

create table support_notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  author_user_id uuid references app_users(id) on delete set null,
  note text not null,
  visibility text not null default 'admin' check (visibility='admin'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index support_notes_user_idx on support_notes(owner_user_id,created_at desc) where deleted_at is null;

create table duplicate_merge_reviews (
  id uuid primary key default gen_random_uuid(),
  primary_user_id uuid not null references app_users(id) on delete cascade,
  duplicate_user_id uuid not null references app_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  evidence jsonb not null default '{}'::jsonb,
  requested_by uuid references app_users(id) on delete set null,
  reviewed_by uuid references app_users(id) on delete set null,
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check(primary_user_id<>duplicate_user_id),
  unique(primary_user_id,duplicate_user_id)
);

insert into system_settings(key,value,description) values
('backup_retention_days','30'::jsonb,'Number of days encrypted North database backups are retained.'),
('operational_event_retention_days','90'::jsonb,'Number of days resolved operational events are retained.')
on conflict(key) do nothing;
