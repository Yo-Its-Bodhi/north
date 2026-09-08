begin;

do $$
declare legacy_constraint text;
begin
  select conname into legacy_constraint
  from pg_constraint
  where conrelid='together_rooms'::regclass
    and contype='c'
    and pg_get_constraintdef(oid) ilike '%connection_id is not null%';
  if legacy_constraint is not null then
    execute format('alter table together_rooms drop constraint %I',legacy_constraint);
  end if;
end $$;

alter table together_rooms
  add constraint together_rooms_shape_check check (
    (kind='direct' and visibility='private') or
    (kind<>'direct' and connection_id is null)
  );

commit;