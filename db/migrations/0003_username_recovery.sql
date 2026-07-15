alter table local_credentials alter column email drop not null;
alter table local_credentials add column username citext;
alter table local_credentials add column recovery_code_hash text;

update local_credentials set username = split_part(email::text, '@', 1) where username is null;
alter table local_credentials alter column username set not null;
create unique index local_credentials_username_unique on local_credentials(username);

alter table local_credentials add constraint local_credentials_username_format
  check (username::text ~ '^[a-z0-9][a-z0-9_-]{2,29}$');
