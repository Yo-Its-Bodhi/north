-- North Together keeps social correspondence separate from private account documents.
begin;

create table if not exists together_connections (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references app_users(id) on delete cascade,
  recipient_user_id uuid not null references app_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','disconnected')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  disconnected_at timestamptz,
  updated_at timestamptz not null default now(),
  check (requester_user_id <> recipient_user_id)
);

create unique index if not exists together_connections_pair_idx
  on together_connections(least(requester_user_id,recipient_user_id),greatest(requester_user_id,recipient_user_id));
create index if not exists together_connections_recipient_idx
  on together_connections(recipient_user_id,status,updated_at desc);

create table if not exists together_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  kind text not null check (kind in ('direct','general','help','updates','trainer')),
  visibility text not null check (visibility in ('private','members','system')),
  connection_id uuid unique references together_connections(id) on delete set null,
  created_by_user_id uuid references app_users(id) on delete set null,
  posting_policy text not null default 'members' check (posting_policy in ('members','staff','read_only')),
  status text not null default 'active' check (status in ('active','archived')),
  slow_mode_seconds integer not null default 0 check (slow_mode_seconds between 0 and 86400),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind='direct' and connection_id is not null and visibility='private') or (kind<>'direct' and connection_id is null))
);

create index if not exists together_rooms_activity_idx
  on together_rooms(last_message_at desc nulls last,id) where status='active';

create table if not exists together_room_members (
  room_id uuid not null references together_rooms(id) on delete cascade,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','trainer','member','moderator')),
  status text not null default 'active' check (status in ('invited','active','left','removed')),
  muted_until timestamptz,
  notification_level text not null default 'all' check (notification_level in ('all','mentions','muted')),
  hidden_before timestamptz,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id,owner_user_id)
);

create index if not exists together_room_members_inbox_idx
  on together_room_members(owner_user_id,status,updated_at desc);

create table if not exists together_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references together_rooms(id) on delete cascade,
  sender_user_id uuid references app_users(id) on delete set null,
  client_message_id uuid not null,
  kind text not null default 'text' check (kind in ('text','workout','milestone','recap','photo','progress','encouragement','invitation','system')),
  body text not null default '' check (char_length(body) <= 4000),
  shared_payload jsonb,
  reply_to_message_id uuid references together_messages(id) on delete set null,
  removed_at timestamptz,
  removed_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  check (body<>'' or shared_payload is not null or kind='system'),
  unique (sender_user_id,client_message_id)
);

create index if not exists together_messages_history_idx
  on together_messages(room_id,created_at desc,id desc);

create table if not exists together_message_receipts (
  message_id uuid not null references together_messages(id) on delete cascade,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id,owner_user_id)
);

create index if not exists together_message_receipts_unread_idx
  on together_message_receipts(owner_user_id,message_id) where read_at is null;

create table if not exists together_blocks (
  blocker_user_id uuid not null references app_users(id) on delete cascade,
  blocked_user_id uuid not null references app_users(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  primary key (blocker_user_id,blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table if not exists together_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references app_users(id) on delete set null,
  reported_user_id uuid references app_users(id) on delete set null,
  room_id uuid references together_rooms(id) on delete set null,
  message_id uuid references together_messages(id) on delete set null,
  category text not null check (category in ('spam','harassment','unsafe','impersonation','privacy','other')),
  submitted_context text not null default '' check (char_length(submitted_context) <= 4000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists together_reports_status_idx
  on together_reports(status,created_at desc);

create table if not exists together_announcements (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references app_users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 8000),
  category text not null check (category in ('feature','release','incident','service','security')),
  audience jsonb not null default '{"kind":"all"}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','published','corrected','archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  correction_of_id uuid references together_announcements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists together_announcements_delivery_idx
  on together_announcements(status,published_at desc,scheduled_at) where status in ('scheduled','published','corrected');

create table if not exists together_announcement_receipts (
  announcement_id uuid not null references together_announcements(id) on delete cascade,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  primary key (announcement_id,owner_user_id)
);

create table if not exists together_notification_preferences (
  owner_user_id uuid primary key references app_users(id) on delete cascade,
  direct_messages boolean not null default true,
  room_messages boolean not null default true,
  trainer_messages boolean not null default true,
  feature_announcements boolean not null default true,
  release_announcements boolean not null default true,
  incident_notices boolean not null default true,
  service_notices boolean not null default true,
  security_notices boolean not null default true,
  preview_message_text boolean not null default false,
  sounds boolean not null default false,
  read_receipts boolean not null default false,
  typing_indicators boolean not null default false,
  presence boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists together_announcement_audit (
  id bigserial primary key,
  announcement_id uuid not null references together_announcements(id) on delete cascade,
  actor_user_id uuid references app_users(id) on delete set null,
  action text not null check (action in ('created','scheduled','published','corrected','audience_changed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into together_rooms(slug,name,description,kind,visibility,posting_policy)
values
  ('general','General','Training conversation, encouragement, and the everyday life around the work.','general','members','members'),
  ('help','Help','Questions about North and practical training discussion. Not medical support.','help','members','members'),
  ('north-updates','North Updates','Signed product, release, incident, and service announcements from North.','updates','system','staff')
on conflict(slug) do nothing;

commit;