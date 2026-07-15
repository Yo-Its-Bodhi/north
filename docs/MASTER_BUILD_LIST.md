# North — Master Build List

Last updated: 2026-07-14

This is North's authoritative implementation queue. Work proceeds from top to
bottom because later phases depend on the data and interaction loops created by
earlier phases. A checked item must be implemented with persistent real data;
visual placeholders do not count as complete.

## Current build

### 1. Exercise and equipment foundation

- [x] Structured exercise catalogue with hundreds of movements
- [x] Body-area, equipment, alias, and text search
- [x] Normalize common gym terminology through searchable equipment aliases
- [x] Add initial UK/US spelling and common-name aliases
- [x] Add home, gym, outdoor, and no-equipment availability
- [x] Add exercise difficulty and movement-pattern metadata
- [x] Add substitutions and conservative exercise safety notes

### 2. Premade workout library

- [x] Create the reusable workout-template data model
- [x] Create a structured 360-workout starter catalogue from curated training blueprints
- [x] Cover full body, upper, lower, push, pull, legs, core, back, V-taper,
      chest, shoulders, arms, biceps, triceps, glutes, quads, and hamstrings
- [x] Cover dumbbell, barbell, kettlebell, cable, machine, calisthenics,
      bodyweight, home, hotel, and no-equipment workouts
- [x] Cover beginner, intermediate, strength, hypertrophy, general fitness,
      conditioning, mobility, and recovery goals
- [x] Include 15, 20, 30, 45, 60, and 75-minute options
- [x] Search and filter templates by goal, body area, time, level, and equipment text
- [x] Preview every workout before using it
- [x] Save, duplicate, rename, edit, reorder, and delete personal templates
- [x] Add a template to today or any selected day

### 3. Programs and progression

- [x] Create multi-week program and active-program data models
- [x] Add Full Body, Upper/Lower, Push/Pull/Legs, strength, hypertrophy,
      beginner, bodyweight, kettlebell, and glute-priority programs
- [x] Let people choose training days, available equipment, time, and priorities
- [x] Generate a complete editable week from a program
- [x] Track active program, current week, and weekly completion
- [x] Provide exercise substitutions while preparing generated workouts
- [x] Track longer-term program adherence and confirmed program-change history
- [x] Detect personal records and rep/load progression
- [x] Recommend load, reps, rest, substitutions, and lower-stress weeks with explanations
- [x] Let Nova propose changes but require confirmation before applying them

## Experience expansion

### 4. Training destination

- [x] Seven-day plan with distinct editable strength workouts
- [x] Workout preparation, live logging, autosave, review, and history
- [x] Bike, walk, run, recovery, and rest records
- [x] Expanded full-week planner
- [x] Workout duration and intensity estimates
- [x] Set, rep, tonnage, distance, and time summaries
- [x] Weekly training chart and muscle-group distribution
- [x] Rich workout-detail preview and exercise substitutions
- [x] Optional calorie estimates with visible assumptions

### 5. Journey timeline

- [x] Persistent workout, activity, check-in, and reflection records
- [x] Unified chronological timeline
- [x] Timeline filters and calendar/date browsing
- [x] Rich workout, activity, recovery, check-in, photo, and reflection cards
- [x] Weekly completion, time, volume, and distance summaries
- [x] This Day memories based only on earlier real records
- [x] Local-private photo attachments with deletion, backup, and size controls

### 6. Journey insights

- [x] Basic totals, best loads, and evidence-backed observations
- [x] Four-week workout, time, volume, and distance comparisons with trend charts
- [x] Exercise and four-week muscle-group volume trends
- [x] Strength and estimated-rep-max trends
- [x] Activity distance, pace, speed, and time trends
- [x] Recovery and training comparisons with evidence thresholds and limitations
- [x] Personal-record feed and focus-area summaries
- [x] Lower-stress-week and workload suggestions with conservative safety boundaries

### 7. Milestones and identity

- [x] Milestone definitions, progress, unlocks, and achieved-date history
- [x] Workout, strength, consistency, activity, recovery, and personal-best groups
- [x] Milestone filters, progress cards, unlocked history, and upcoming milestones
- [x] Quiet earned identity markers without shame-based streak mechanics
- [x] Journey Mark and chapter progression backed by real records

### 8. Today

- [x] Daily destination, Nova context, planned direction, and quick logs
- [x] Rich Journey snapshot and next milestone
- [x] Evidence-only This Day memory card
- [x] Complete current-week and daily activity summary
- [x] Optional permission-based weather-aware direction
- [x] Conversational plan adjustments through Nova with exact preview and confirmation

### 9. You, preferences, and trust

- [x] Direction prototype, learned evidence, theme, backup, restore, and erase
- [x] Editable name, direction, target date, and training rhythm
- [x] Metric/imperial units for entry, stored conversion, history, trends, and summaries
- [x] Appearance, notification, language, and coaching-tone preferences
- [x] Memory review, correction, deletion, restoration, and permission controls
- [x] Privacy centre and explicit connected-service state controls
- [x] Help, support, reduced-motion, larger-text, and high-contrast settings

## Durable product

### 10. Accounts, offline data, and sync

- [x] Target architecture, PostgreSQL schema, and conflict rules documented
- [x] IndexedDB repositories and schema migration
- [x] Username/password authentication with separate owner-scoped accounts
- [x] One-time recovery-code handoff, hashed storage, recovery, and rotation
- [x] Secure access/refresh sessions, sign-out, and session expiry handling
- [x] Account area for identity, devices, sync status, recovery-code rotation, and deletion
- [x] Server API for versioned workouts, plans, activities, programs, Journey, settings, and companion documents
- [x] Offline IndexedDB outbox, exponential retries, account sync, multi-device restoration, and local/remote conflict resolution
- [x] Multi-device restoration and account deletion

### 10A. First-run onboarding

- [x] Beautiful public welcome and returning-member sign-in
- [x] Account creation with username rules and password guidance
- [x] Mandatory save-your-recovery-code step with explicit acknowledgement
- [x] Guided name, direction, experience, schedule, and available-time setup
- [x] Equipment, activity, and movement-preference setup
- [x] Units, coaching tone, privacy, and memory permissions
- [x] Review the generated first week before applying it
- [x] Resume incomplete onboarding safely across refreshes on the current device
- [x] Helpful evidence-safe empty states and an account-scoped, skippable, replayable five-destination product tour

### 10B. Hosted production at north.bodhix.io

- [x] Reproducible web/API/PostgreSQL deployment package
- [x] HTTPS reverse-proxy configuration and environment template
- [x] Database migration and encrypted backup/restore procedure
- [x] Health checks, structured request/error logs, uptime/latency monitoring, and retention rules
- [x] Content Security Policy, secure headers, rate limits, and request-size limits
- [ ] Staging smoke test followed by production release checklist

### 10C. Owner administration

- [x] Server-enforced owner role and active/suspended account status
- [x] Responsive `/admin` dashboard with operational and adoption metrics
- [x] User search, detail, session revocation, suspension, recovery rotation, and deletion
- [x] Hashed one-time access-code generation and management
- [x] System settings and immutable sensitive-action audit events
- [x] Device registration/revocation and complete sync-conflict operations
- [x] Versioned content catalogue and exercise/workout/program/milestone/announcement publishing foundation
- [x] Job and searchable privacy-limited API log observability, encrypted backups/restores, runtime, database, migrations, storage, sessions, devices, content, conflicts, errors, auth denials, and rate limits
- [x] Admin support notes, user export, audit export, duplicate-candidate detection, and explicit non-destructive merge review

### 11. Nova companion

- [x] Persistent per-account conversations with local backup, restore, and multi-device sync
- [x] Permissioned, reviewable, correctable, forgettable memory sourced from North records
- [x] Check-in routing, transactional planning, guided reflection, and reversible active-program schedule tools
- [x] Transactional Today-plan proposals for shorter, lower-stress, and recovery sessions with stale-plan protection
- [x] Exact before/after confirmation, correction prompt, persistent application audit, and safe undo for Nova plan proposals
- [x] Explanation, evidence, confidence, correction, stale-state protection, confirmation audit, and undo for every plan-changing recommendation
- [x] Initial health-guidance safety boundaries and urgent-symptom escalation language

### 12. Validation and release

- [x] Automated product-data invariant suite covering exercise uniqueness/metadata, workout references/prescriptions, program rhythms, milestones, installability, encoding, and authenticated-cache boundaries
- [x] IndexedDB and sync unit coverage for versioning, account isolation, outbox idempotency, retry backoff, tombstones, migrations, remote pulls, conflict creation, and local conflict resolution
- [x] Non-destructive live production contract suite for health, auth rejection, protected member/admin routes, install assets, private-cache exclusions, and security headers
- [x] Chrome navigation suite covering onboarding, five primary destinations, weekly-plan editing, workout preparation, library actions, transactional Nova, keyboard focus, accessible button names, and 320–1440px overflow
- [ ] Accessibility and keyboard/screen-reader audit
- [ ] Responsive browser/device coverage
- [x] Automated unit, integration, persistence, sync, production-contract, and primary-navigation tests
- [ ] Gym-floor one-hand workout test
- [ ] Walking, running, biking, and offline field tests
- [ ] Performance, installability, update, and recovery checks
- [ ] Privacy/security review
- [ ] Release checklist, deployment, monitoring, and feedback intake

### 13. Health platforms and wearables

- [x] Choose the supported Samsung route: Galaxy Watch → Samsung Health → Health Connect → North
- [x] Add private, account-scoped health connection and idempotent record storage
- [x] Add authenticated connection, import, revocation, and summary APIs
- [x] Scaffold the Android Health Connect companion for steps, heart rate, sleep, exercise, distance, calories, and weight
- [x] Show real server connection and last-sync state in You instead of a decorative toggle
- [ ] Build and sign the Android APK on an Android SDK workstation
- [ ] Install on Bodhi's Samsung phone, grant categories, and complete the first real Galaxy Watch sync
- [ ] Add incremental/background sync after foreground testing proves data attribution and duplicate handling
- [ ] Add per-category pause, delete imported health history, and source-attribution views
- [ ] Complete Google Play Health Apps declaration, privacy rationale, and production review
- [ ] Build the equivalent iPhone HealthKit bridge

### 14. North visual transformation — fun, fit, and loud

- [x] Define the energetic North palette, glow, depth, orbit, activity-colour, and motion foundations
- [x] Begin the Today command-centre treatment with a bolder direction hero, activity tiles, and visual KPI modules
- [x] Begin the live recorder treatment with stronger progress, set states, target feedback, and rest-timer energy
- [x] Begin the signature results treatment with set receipts, target outcomes, and Nova/Records submission
- [ ] Add activity-specific hero artwork and muscle-area illustrations
- [ ] Build circular KPI, progress-orbit, milestone, and consistency visual components
- [ ] Add premade/My Workouts/body-area selection directly to daily-workout editing
- [ ] Add an unobtrusive live-workout Alternatives sheet for busy equipment and movement substitutions
- [x] Add meaningful personal-best, streak, return, and program-week celebration moments
- [ ] Carry the new visual language through Training, Journey, Nova, You, onboarding, and admin
- [ ] Complete responsive, reduced-motion, contrast, keyboard, and gym-floor visual QA

### 15. Premium exercise and workout experience

- [x] Introduce the athletic Barlow Condensed display system while preserving readable body copy
- [x] Build the first reusable exercise-profile screen with demonstration, muscle activation, personal history, prescription, Nova coaching, and alternatives
- [x] Generate and locally retain the first bright instructional movement asset with a manual form/accuracy gate
- [x] Convert workout preparation rows into visual movement cards with muscle, prescription, history, completion, and alternative states
- [x] Carry the exercise identity and muscle system into the live one-hand set recorder
- [x] Add accurate reusable front/rear anatomical SVG layers and data-driven primary, secondary, and stabiliser mappings
- [ ] Add validated start/finish demonstrations for the most-used movement families before expanding the full catalogue
- [x] Add technique, common-error, breathing, setup, safety, and accessibility content to every published exercise
- [x] Build PR, streak, return, and completed-set celebration treatments without obstructing gym-floor use
- [x] Complete exercise-card, profile, recorder, result, light/dark, 320px, and reduced-motion visual QA

## Parked until the core is earned

- Nutrition and cookbook systems
- Community/The Trail
- Coach, family, and team modes
- Public social profiles and launch mechanics
