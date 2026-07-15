create table api_request_logs (
  id bigserial primary key,
  request_id text,
  method text not null,
  route text not null,
  status_code integer not null,
  duration_ms numeric(12,3) not null,
  user_id uuid references app_users(id) on delete set null,
  device_id uuid references devices(id) on delete set null,
  user_agent text,
  occurred_at timestamptz not null default now()
);
create index api_request_logs_time_idx on api_request_logs(occurred_at desc);
create index api_request_logs_status_time_idx on api_request_logs(status_code,occurred_at desc);
create index api_request_logs_route_time_idx on api_request_logs(route,occurred_at desc);

create table job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check(status in ('running','complete','failed')),
  details jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index job_runs_name_time_idx on job_runs(job_name,started_at desc);

insert into system_settings(key,value,description) values
('api_log_retention_days','14'::jsonb,'Number of days detailed API request logs are retained.'),
('mutation_receipt_retention_days','30'::jsonb,'Number of days idempotent sync mutation receipts are retained.')
on conflict(key) do nothing;
