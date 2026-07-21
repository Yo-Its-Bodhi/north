-- Additive, account-scoped storage for North 0.4 Nova. No existing member data is rewritten.
begin;

create table if not exists nova_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  title text not null default 'New conversation',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table if not exists nova_messages (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  conversation_id uuid not null, role text not null check (role in ('user','assistant','tool','system')),
  content text not null, evidence jsonb not null default '[]'::jsonb, confidence text check (confidence in ('high','moderate','limited')),
  provider_message_id text, model text, created_at timestamptz not null default now(), unique (id,owner_user_id),
  foreign key (conversation_id,owner_user_id) references nova_conversations(id,owner_user_id) on delete cascade
);

create table if not exists nova_goals (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  title text not null, description text not null default '', category text not null default 'direction',
  priority smallint not null default 1 check (priority between 1 and 5), status text not null default 'active' check (status in ('draft','active','paused','completed','abandoned')),
  target_date date, source_type text not null default 'user' check (source_type in ('user','nova_proposal','onboarding','import')),
  source_message_id uuid, confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id,owner_user_id), foreign key (source_message_id,owner_user_id) references nova_messages(id,owner_user_id) on delete set null
);

create table if not exists nova_memory_entries (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  kind text not null check (kind in ('preference','constraint','schedule','event','identity','coaching','equipment','temporary_context')),
  label text not null, value jsonb not null, status text not null default 'active' check (status in ('proposed','active','rejected','archived')),
  source_type text not null check (source_type in ('user_statement','record','onboarding','nova_inference')),
  source_reference jsonb not null default '{}'::jsonb, confidence numeric(4,3) not null check (confidence between 0 and 1),
  confirmed_at timestamptz, last_reviewed_at timestamptz, expires_at timestamptz, influence_enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id,owner_user_id)
);

create table if not exists nova_action_proposals (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  conversation_id uuid, source_message_id uuid, action_type text not null, risk_level text not null check (risk_level in ('low','meaningful','destructive')),
  summary text not null, reason text not null, payload jsonb not null, before_snapshot jsonb, after_snapshot jsonb,
  expected_version text, status text not null default 'pending' check (status in ('pending','approved','rejected','applied','failed','undone','expired')),
  approved_at timestamptz, applied_at timestamptz, undone_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id,owner_user_id),
  foreign key (conversation_id,owner_user_id) references nova_conversations(id,owner_user_id) on delete set null,
  foreign key (source_message_id,owner_user_id) references nova_messages(id,owner_user_id) on delete set null
);

create table if not exists nova_action_events (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  proposal_id uuid, action_type text not null, status text not null check (status in ('applied','failed','undone')),
  target_collection text, target_key text, receipt jsonb not null default '{}'::jsonb, undo_payload jsonb,
  error_message text, created_at timestamptz not null default now(),
  foreign key (proposal_id,owner_user_id) references nova_action_proposals(id,owner_user_id) on delete set null
);

alter table nova_goals add column if not exists source_proposal_id uuid;
create unique index if not exists nova_goals_owner_source_proposal_idx on nova_goals(owner_user_id,source_proposal_id) where source_proposal_id is not null;
alter table nova_memory_entries add column if not exists source_proposal_id uuid;
create unique index if not exists nova_memory_owner_source_proposal_idx on nova_memory_entries(owner_user_id,source_proposal_id) where source_proposal_id is not null;

create table if not exists nova_usage_events (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references app_users(id) on delete cascade,
  conversation_id uuid, provider text not null, model text not null, request_id text, input_tokens integer not null default 0,
  output_tokens integer not null default 0, cached_input_tokens integer not null default 0, estimated_cost_micros bigint,
  latency_ms integer, status text not null check (status in ('complete','failed','cancelled','limited')), created_at timestamptz not null default now(),
  foreign key (conversation_id,owner_user_id) references nova_conversations(id,owner_user_id) on delete set null
);

create index if not exists nova_conversations_owner_updated_idx on nova_conversations(owner_user_id,updated_at desc);
create index if not exists nova_messages_owner_conversation_idx on nova_messages(owner_user_id,conversation_id,created_at);
create index if not exists nova_goals_owner_status_idx on nova_goals(owner_user_id,status,priority);
create index if not exists nova_memory_owner_status_idx on nova_memory_entries(owner_user_id,status,kind);
create index if not exists nova_proposals_owner_status_idx on nova_action_proposals(owner_user_id,status,created_at desc);
create index if not exists nova_events_owner_created_idx on nova_action_events(owner_user_id,created_at desc);
create index if not exists nova_usage_owner_created_idx on nova_usage_events(owner_user_id,created_at desc);

commit;
