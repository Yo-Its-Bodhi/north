# North — Build Roadmap

Last updated: 2026-07-14

This is the operational roadmap for building North. The product-stage roadmap
remains in `CODEX/05_Roadmap.md`.

## Build rule

Finish the dependency in front of us before opening a later stage. A screen is
not complete because it looks finished; it is complete when its data survives
the full user loop.

## Milestone 1 — Usable workout loop

Goal: take North into a real gym session without Notes or a PDF.

### Complete

- [x] Mobile-first Morning and Night shell
- [x] Today destination and clear route into training
- [x] Five-destination navigation
- [x] Searchable 373-movement exercise library with body-area and equipment filters
- [x] Searchable 360-workout starter library with preview and plan-day assignment
- [x] Custom exercises, removal, and ordering
- [x] Previous performance and coaching cues
- [x] Fast weight and rep logging
- [x] Rest timer
- [x] Pass for now and Return to queue
- [x] Constant local autosave and safe resume
- [x] Workout review with energy, difficulty, notes, and reflection
- [x] Saved sessions feed real Training and Journey history
- [x] Edit the prescription before training: sets, target reps, rest, and load
- [x] Open a completed workout and inspect every exercise and set
- [x] Correct or delete a completed workout
- [x] Export a clean coach-readable workout record
- [x] Capture gym-test friction without leaving the active workout
- [x] Search and browse the complete workout history

### Active — real-world validation

- [ ] Test the complete loop during a real gym session
- [ ] Fix every friction point found on the gym floor

## Milestone 2 — Plan the week

Goal: North knows what is intended, what actually happened, and what moved.

- [x] Seven-day training plan
- [x] Move, replace, or defer a planned session
- [x] Prepare today from the weekly plan
- [x] Give every planned strength day its own editable workout prescription
- [x] Import a coach-provided workout
- [x] Add ad-hoc bike, walk, run, mobility, recovery, and rest entries
- [x] Distinguish planned, completed, passed, and skipped work

## Milestone 3 — Understand progress

Goal: turn stored work into useful understanding.

- [x] Exercise history and previous-performance lookup
- [x] Best recorded loads with quiet recognition
- [x] Bodyweight and recovery check-ins
- [x] Basic strength, consistency, and activity trends
- [x] Weekly review
- [x] Evidence-backed local Nova observations with visible reasoning

## Milestone 4 — Real accounts and durable data

Goal: move beyond one browser without losing trust.

- [x] Choose and document the target application architecture
- [x] Create the initial normalized PostgreSQL schema and migration
- [ ] Authentication and user ownership
- [ ] Server-backed workouts, plans, activities, and history
- [x] Document offline-first synchronisation and conflict rules
- [ ] Implement IndexedDB repositories, outbox, API, and conflict handling
- [x] Local data export, restoration, and deletion

## Milestone 5 — Nova companion loop

Goal: Nova can prepare, observe, explain, and reflect with permission and context.

- [ ] Conversational check-in
- [ ] Prepare or adjust workouts through conversation
- [ ] Explain recommendations and confidence
- [ ] Continue saved conversations
- [ ] Memory controls and evidence for learned traits
- [ ] Safety boundaries for health guidance

## Milestone 6 — You and the wider North experience

Goal: make the relationship and the traveller’s direction visible.

- [x] Journey Mark prototype
- [x] Your Direction prototype
- [x] What North has learned, with evidence on demand
- [ ] Quiet earned identity markers
- [ ] Personalisation, privacy, appearance, and account controls
- [ ] Full Journey, Milestones, Insights, and reflection system

## Parked until earned

- Health and wearable integrations
- Weather-aware direction
- Nutrition and cookbook systems
- The Trail/community
- Coach and family modes
- Public launch mechanics
