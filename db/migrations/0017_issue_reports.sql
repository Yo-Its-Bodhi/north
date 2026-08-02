create table issue_reports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  category text not null check (category in ('bug','issue','problem')),
  message text not null,
  source_screen text not null,
  page_url text not null,
  viewport jsonb not null default '{}'::jsonb,
  user_agent text,
  status text not null default 'unread' check (status in ('unread','read','resolved')),
  notified_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references app_users(id) on delete set null
);

create index issue_reports_owner_idx on issue_reports(owner_user_id,created_at desc);
create index issue_reports_unread_idx on issue_reports(created_at desc) where status='unread';
