begin;

create table if not exists together_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 2000),
  p256dh text not null check (char_length(p256dh) <= 500),
  auth text not null check (char_length(auth) <= 500),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists together_push_subscriptions_owner_idx
  on together_push_subscriptions(owner_user_id,device_id) where revoked_at is null;

commit;