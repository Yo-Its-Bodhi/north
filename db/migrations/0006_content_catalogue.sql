create table content_catalogue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('exercise','workout','program','milestone','announcement')),
  slug text not null,
  title text not null,
  summary text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(kind, slug)
);
create index content_catalogue_kind_status_idx on content_catalogue(kind,status,updated_at desc) where deleted_at is null;

create table content_catalogue_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_catalogue(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid references app_users(id) on delete set null,
  change_reason text not null,
  created_at timestamptz not null default now(),
  unique(content_id,version)
);

insert into system_settings(key,value,description)
values ('registration_requires_code','false'::jsonb,'Require a valid North access code before a new account can be created.')
on conflict(key) do nothing;
