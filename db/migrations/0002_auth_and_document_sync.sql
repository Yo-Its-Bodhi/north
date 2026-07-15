create extension if not exists citext;

create table local_credentials (
  owner_user_id uuid primary key references app_users(id) on delete cascade,
  email citext not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index refresh_tokens_owner_active_idx
  on refresh_tokens(owner_user_id, expires_at)
  where revoked_at is null;

create table sync_documents (
  owner_user_id uuid not null references app_users(id) on delete cascade,
  document_key text not null,
  collection text not null,
  data jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_user_id, document_key)
);

create index sync_documents_owner_updated_idx
  on sync_documents(owner_user_id, updated_at);

create table document_mutations (
  owner_user_id uuid not null references app_users(id) on delete cascade,
  idempotency_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, idempotency_key)
);

create index document_mutations_created_idx on document_mutations(created_at);
