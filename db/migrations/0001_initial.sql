-- North initial PostgreSQL schema.
-- Authentication-provider mapping and row-level policies are added when the
-- provider is selected. API access must scope every query by owner_user_id.

create extension if not exists pgcrypto;

create type plan_kind as enum ('strength', 'bike', 'walk', 'run', 'recovery', 'rest');
create type plan_status as enum ('planned', 'completed', 'skipped');
create type activity_kind as enum ('bike', 'walk', 'run', 'recovery');
create type conversation_role as enum ('user', 'nova', 'system');

create table app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table auth_identities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create table devices (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key,
  owner_user_id uuid references app_users(id) on delete cascade,
  canonical_key text,
  name text not null,
  category text,
  cue text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index exercises_owner_canonical_unique
  on exercises(owner_user_id, canonical_key)
  where canonical_key is not null and deleted_at is null;

create table weekly_plans (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  week_start date not null,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_user_id, week_start)
);

create table plan_days (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  planned_date date not null,
  kind plan_kind not null,
  status plan_status not null default 'planned',
  title text not null,
  note text not null default '',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (weekly_plan_id, planned_date)
);

create table workout_sessions (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  plan_day_id uuid references plan_days(id) on delete set null,
  session_date date not null,
  started_at timestamptz,
  finished_at timestamptz,
  energy smallint check (energy between 1 and 5),
  difficulty smallint check (difficulty between 1 and 5),
  reflection text not null default '',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table session_exercises (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  position integer not null check (position >= 0),
  exercise_name_snapshot text not null,
  target_snapshot text not null default '',
  rest_seconds integer not null default 0 check (rest_seconds between 0 and 3600),
  note text not null default '',
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_session_id, position)
);

create table workout_sets (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  position integer not null check (position >= 0),
  weight numeric(8,2),
  reps numeric(8,2),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, position)
);

create table activities (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  plan_day_id uuid references plan_days(id) on delete set null,
  activity_date date not null,
  kind activity_kind not null,
  duration_minutes numeric(8,2),
  distance_km numeric(10,3),
  effort smallint check (effort between 1 and 5),
  note text not null default '',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table check_ins (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  check_in_date date not null,
  bodyweight_lb numeric(7,2),
  sleep_hours numeric(4,2),
  energy smallint not null check (energy between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table weekly_reviews (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  week_start date not null,
  proud text not null default '',
  learned text not null default '',
  next_direction text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_user_id, week_start)
);

create table conversations (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table conversation_messages (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role conversation_role not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table learned_observations (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  observation_key text not null,
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  generated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (owner_user_id, observation_key)
);

create table gym_test_notes (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  source text not null,
  category text not null check (category in ('confusing', 'slow', 'missing', 'bug')),
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table sync_mutations (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  base_revision bigint,
  applied_revision bigint,
  applied_at timestamptz not null default now(),
  unique (owner_user_id, device_id, id)
);

create index workout_sessions_owner_date_idx on workout_sessions(owner_user_id, session_date desc) where deleted_at is null;
create index activities_owner_date_idx on activities(owner_user_id, activity_date desc) where deleted_at is null;
create index check_ins_owner_date_idx on check_ins(owner_user_id, check_in_date desc) where deleted_at is null;
create index messages_conversation_created_idx on conversation_messages(conversation_id, created_at);
create index test_notes_owner_open_idx on gym_test_notes(owner_user_id, resolved, created_at desc);

