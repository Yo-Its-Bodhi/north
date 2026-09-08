begin;

alter table together_reports
  add column if not exists reviewed_by_user_id uuid references app_users(id) on delete set null,
  add column if not exists resolution_note text not null default '' check (char_length(resolution_note) <= 4000),
  add column if not exists appeal_note text not null default '' check (char_length(appeal_note) <= 4000),
  add column if not exists updated_at timestamptz not null default now();

alter table together_rooms
  add column if not exists slow_mode_seconds integer not null default 0 check (slow_mode_seconds between 0 and 3600);

alter table together_room_members
  add column if not exists last_posted_at timestamptz,
  add column if not exists removal_reason text not null default '' check (char_length(removal_reason) <= 1000);

commit;