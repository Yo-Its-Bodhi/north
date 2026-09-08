-- Public workout snapshots remain separate from private account-synced templates.
begin;

create table if not exists community_workouts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  source_template_id text not null,
  template_snapshot jsonb not null,
  status text not null default 'published' check (status in ('published','archived')),
  version integer not null default 1 check (version > 0),
  original_workout_id uuid references community_workouts(id) on delete set null,
  save_count integer not null default 0 check (save_count >= 0),
  start_count integer not null default 0 check (start_count >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, source_template_id)
);

create index if not exists community_workouts_published_idx
  on community_workouts(updated_at desc, id) where status='published';
create index if not exists community_workouts_owner_idx
  on community_workouts(owner_user_id, updated_at desc);

commit;