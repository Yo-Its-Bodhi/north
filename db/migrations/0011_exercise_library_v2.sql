-- Additive canonical exercise library. Existing public.exercises and workout
-- snapshots remain untouched so live user data keeps its current semantics.
begin;
create schema if not exists exercise_library;

create table if not exists exercise_library.muscles (
  id text primary key check (id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'), display_name text not null, common_name text not null,
  anatomical_name text not null, parent_muscle_group_id text references exercise_library.muscles(id), body_region text not null,
  visibility text[] not null, laterality text[] not null, visual_svg_target_id text not null unique, description text not null,
  aliases text[] not null default '{}', active boolean not null default true
);
create table if not exists exercise_library.equipment (
  id text primary key check (id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'), display_name text not null, equipment_group text not null,
  aliases text[] not null default '{}', suitability text[] not null, resistance_type text not null, image_ref text, icon_ref text, active boolean not null default true
);
create table if not exists exercise_library.movement_patterns (id text primary key, display_name text not null, active boolean not null default true);
create table if not exists exercise_library.exercise_categories (id text primary key, name text not null, exercise_type text not null);
create table if not exists exercise_library.tracking_templates (
  id text primary key, name text not null, fields jsonb not null, required_field_ids text[] not null, optional_field_ids text[] not null,
  supported_units text[] not null, default_units jsonb not null, supports_sides boolean not null, supports_tempo boolean not null,
  supports_assistance_weight boolean not null, supports_added_weight boolean not null, supports_heart_rate boolean not null,
  supports_intervals boolean not null, supports_warmups boolean not null, supports_rounds boolean not null
);
create table if not exists exercise_library.tracking_fields (
  template_id text not null references exercise_library.tracking_templates(id) on delete cascade, id text not null, label text not null,
  value_type text not null, units text[] not null, default_unit text not null, required boolean not null, per_side boolean not null default false,
  minimum numeric, maximum numeric, step numeric, primary key(template_id,id), check(default_unit = any(units))
);
create table if not exists exercise_library.exercises (
  id text primary key check (id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'), canonical_name text not null, display_name text not null, slug text not null unique,
  short_description text not null, instructions jsonb not null, guidance jsonb not null, category_id text not null references exercise_library.exercise_categories(id),
  exercise_type text not null, difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  tracking_template_id text not null references exercise_library.tracking_templates(id), mechanics jsonb not null, demands jsonb not null,
  default_units jsonb not null default '{}'::jsonb, default_tempo jsonb, unilateral boolean not null default false,
  timed_hold boolean not null default false, cardio boolean not null default false, tags text[] not null default '{}',
  source_metadata jsonb not null, review_metadata jsonb not null, status text not null check (status in ('draft','reviewed','published','archived')),
  created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists exercise_library.exercise_aliases (
  id uuid primary key default gen_random_uuid(), exercise_id text not null references exercise_library.exercises(id) on delete cascade,
  alias text not null, normalized_alias text generated always as (lower(regexp_replace(trim(alias),'[[:space:]_-]+',' ','g'))) stored, locale text not null default 'en', unique(normalized_alias,locale)
);
create table if not exists exercise_library.exercise_muscles (
  exercise_id text not null references exercise_library.exercises(id) on delete cascade, muscle_id text not null references exercise_library.muscles(id),
  role text not null check (role in ('primary','secondary','synergist','stabilizer','supporting','antagonist','dynamic_stabilizer')),
  contribution_level text not null check (contribution_level in ('high','moderate','low')),
  contribution_percent numeric(5,2) check (contribution_percent between 0 and 100), visual_region_id text not null, intensity smallint not null check (intensity between 1 and 3), notes text,
  primary key(exercise_id,muscle_id,role)
);
create table if not exists exercise_library.exercise_equipment (
  exercise_id text not null references exercise_library.exercises(id) on delete cascade, equipment_id text not null references exercise_library.equipment(id), required boolean not null, quantity smallint, notes text,
  primary key(exercise_id,equipment_id)
);
create table if not exists exercise_library.exercise_movement_patterns (
  exercise_id text not null references exercise_library.exercises(id) on delete cascade, movement_pattern_id text not null references exercise_library.movement_patterns(id), primary key(exercise_id,movement_pattern_id)
);
create table if not exists exercise_library.exercise_relationships (
  id text primary key, from_exercise_id text not null references exercise_library.exercises(id) on delete cascade,
  to_exercise_id text not null references exercise_library.exercises(id) on delete cascade, relationship_type text not null check (relationship_type in ('regression','progression','substitution','variation')),
  reason text not null, priority integer not null default 1, check(from_exercise_id <> to_exercise_id), unique(from_exercise_id,to_exercise_id,relationship_type)
);
alter table public.exercises add column if not exists canonical_library_id text references exercise_library.exercises(id) on delete set null;
alter table public.session_exercises add column if not exists canonical_library_id text references exercise_library.exercises(id) on delete set null;
create table if not exists exercise_library.workout_set_values (
  workout_set_id uuid not null references public.workout_sets(id) on delete cascade, field_id text not null, numeric_value numeric,
  text_value text, boolean_value boolean, unit text, tempo jsonb, primary key(workout_set_id,field_id),
  check(num_nonnulls(numeric_value,text_value,boolean_value,tempo) <= 1)
);
create table if not exists exercise_library.cardio_performances (
  session_exercise_id uuid primary key references public.session_exercises(id) on delete cascade, duration_seconds integer not null check(duration_seconds >= 0),
  distance numeric, distance_unit text, average_heart_rate numeric, average_watts numeric, cadence_rpm numeric, metadata jsonb not null default '{}'::jsonb
);
create table if not exists exercise_library.timed_hold_performances (
  workout_set_id uuid primary key references public.workout_sets(id) on delete cascade, duration_seconds integer not null check(duration_seconds >= 0), added_load numeric, load_unit text
);
create table if not exists exercise_library.unilateral_performances (
  workout_set_id uuid primary key references public.workout_sets(id) on delete cascade, left_values jsonb not null default '{}'::jsonb,
  right_values jsonb not null default '{}'::jsonb, alternated boolean not null default false
);
create index if not exists exercise_library_exercise_name_idx on exercise_library.exercises(lower(canonical_name));
create index if not exists exercise_library_exercise_tags_idx on exercise_library.exercises using gin(tags);
create index if not exists exercise_library_exercise_filter_idx on exercise_library.exercises(status,category_id,exercise_type,difficulty);
create index if not exists exercise_library_alias_lookup_idx on exercise_library.exercise_aliases(normalized_alias);
create index if not exists exercise_library_muscle_lookup_idx on exercise_library.exercise_muscles(muscle_id,role);
create index if not exists exercise_library_equipment_lookup_idx on exercise_library.exercise_equipment(equipment_id,required);
create index if not exists exercises_canonical_library_idx on public.exercises(canonical_library_id) where canonical_library_id is not null;
create index if not exists session_exercises_canonical_library_idx on public.session_exercises(canonical_library_id) where canonical_library_id is not null;
commit;
