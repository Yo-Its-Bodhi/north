# North exercise database v2

## Boundaries

`src/exerciseDatabase/raw` holds untouched, untrusted imports. `stageExerciseImports` normalizes names and reports possible duplicates but cannot publish. `reviewedExercises.ts` is the approved, typed editorial layer. Runtime search, relationship resolution and the legacy adapter consume only reviewed data. PostgreSQL stores the same model in the additive `exercise_library` schema.

The existing `src/data/exercises.ts`, workout snapshots, user-created exercises and sync documents remain unchanged. Nullable canonical IDs link legacy exercise/session rows only when a match has been reviewed. Generic set values plus dedicated cardio, timed-hold and unilateral performance tables extend recording without changing old weight/reps columns. `toLegacyExerciseDefinition` provides an incremental read-only bridge while screens migrate to stable IDs.

## Import and review flow

1. Put source JSON in a temporary/raw location and preserve its provenance.
2. Run `npm run exercises:stage -- file.json`.
3. Resolve possible duplicates and map all taxonomy references.
4. Add normalized content with stable snake-case IDs.
5. Complete technique, safety, source and muscle review; mark it approved.
6. Run `npm run validate:exercises` and tests.
7. Seed using deterministic natural keys from `buildExerciseSeedRecords`.

Generated or imported content is never treated as reviewed merely because it satisfies TypeScript.

## Migration and rollback

Migration 0011 creates only `exercise_library.*` tables and indexes. It does not rename, rewrite, lock-step convert, or delete existing data. Apply it in staging after a snapshot, seed reference tables before exercises, then aliases/junctions/relationships in one transaction. On failure, roll back the seed transaction. If the feature must be removed, stop v2 readers and manually run `db/rollback/0011_exercise_library_v2.sql`; legacy screens and records continue to work throughout. Rollback SQL is deliberately outside the auto-run migration directory.

## Scale and search

Canonical names, aliases, tags, category, type, difficulty, muscle, and equipment have dedicated indexes or junction indexes. Application search currently provides deterministic weighted matching; PostgreSQL trigram/full-text indexes can be added once the real catalogue size and query logs justify them.

## Reference taxonomy and anatomy contract

The reviewed reference layer contains 90 hierarchical muscle records, 124 equipment records, 32 movement patterns, 19 exercise types, 17 body positions, 20 accessibility tags and 21 tracking templates. Broad muscle records such as `chest`, `shoulders`, `quadriceps` and `hamstrings` allow simple member-facing summaries. Their precise descendants support coaching, review and anatomy overlays.

Every muscle owns a stable SVG target such as `muscle-pectoralis_major_clavicular`. The eventual front/back/side artwork must use these exact element IDs. A broad-group selection can illuminate all descendants using `getMuscleDescendants`; precise exercise mappings illuminate only their reviewed targets. Visibility and laterality declare which view and side can render each target. The taxonomy validates the target format and parent references, but final artwork registration must additionally verify that every active visible target exists in the shipped SVG.

Equipment records carry a stable group, aliases, home/gym/outdoor suitability, resistance type and optional asset references. `searchEquipment` searches IDs, display names and aliases without coupling search terms to exercise records.

Tracking templates explicitly separate required and optional fields, constrain units per field, and declare support for sides, tempo, assistance, added load, heart rate and intervals. This lets the recorder choose controls from data instead of exercise-name heuristics.

## Production catalogue

`productionExerciseLibrary` is the publishable v2 catalogue. The 20 hand-reviewed foundation records retain precedence. North's existing useful exercise catalogue is normalized into canonical taxonomy IDs, then explicit curated additions fill missing push-up, hanging, dumbbell, barbell, kettlebell, band, cable, machine, cardio, conditioning and mobility families. Canonical-name deduplication occurs before relationships are attached.

Each record includes original North-authored guidance, three coaching cues, mistakes, safety language, realistic primary/secondary/supporting muscle roles, equipment requirements, tracking capabilities, accessibility tags, provenance and approved review metadata. No commercial exercise copy or unlicensed media is included.

Progression/regression chains are editorially defined for key learning paths. Substitutions require a compatible movement pattern and muscle intent and explicitly avoid medical-suitability claims. Same-equipment alternatives are marked as variations. `findDuplicateCandidates` reviews normalized names together with equipment, movement patterns and primary muscles; known distinct variations remain separate.

Operational commands:

- `npm run validate:exercises` validates the complete publishable catalogue.
- `npm run exercises:duplicates` fails if a duplicate candidate remains unresolved.
- `npm run exercises:review` reports missing editorial content and review queues.
- `npm run exercises:stats` reports counts by equipment, category and difficulty plus relationship and alias totals.
