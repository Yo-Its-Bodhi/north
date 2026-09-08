-- Manual rollback only. Take a database snapshot first. This drops only the
-- additive canonical library and never touches live user workouts/exercises.
begin;
drop schema if exists exercise_library cascade;
commit;
