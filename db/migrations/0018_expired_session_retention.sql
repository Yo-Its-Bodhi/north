insert into system_settings(key,value,description) values
('expired_session_retention_days','30'::jsonb,'Number of days expired or revoked refresh-token hashes are retained for security investigation.')
on conflict(key) do nothing;