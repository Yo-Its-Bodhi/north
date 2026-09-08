-- Manual rollback only. Take and verify a database snapshot first. This
-- refuses to discard retained direct-message history created after deletion.
begin;

do $$
begin
  if exists (
    select 1 from together_rooms
    where kind='direct' and connection_id is null
  ) then
    raise exception 'Cannot roll back 0023: orphaned direct rooms retain account-deletion history';
  end if;
end $$;

alter table together_rooms drop constraint if exists together_rooms_shape_check;

alter table together_rooms
  add constraint together_rooms_shape_check check (
    (kind='direct' and connection_id is not null and visibility='private') or
    (kind<>'direct' and connection_id is null)
  );

commit;
