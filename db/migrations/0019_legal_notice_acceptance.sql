alter table app_users
  add column if not exists legal_notice_version text,
  add column if not exists legal_accepted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_users_legal_acceptance_pair') then
    alter table app_users
      add constraint app_users_legal_acceptance_pair
      check ((legal_notice_version is null) = (legal_accepted_at is null));
  end if;
end $$;