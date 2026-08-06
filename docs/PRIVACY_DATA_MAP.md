# North Privacy Data Map

Status: technical inventory for North 0.8 pre-release, reviewed 2026-08-04

Owner: Dru

This document records personal-data processing visible in the current North codebase and deployment materials. It supports, but does not replace, a counsel-approved privacy notice, record of processing, data-protection impact assessment, processor review, or territory-specific legal analysis.

## Decisions still required

The following cannot be settled from code and remain launch blockers:

- operating entity, registered address, privacy contact, launch territories, and governing jurisdiction;
- controller/processor roles and lawful basis for each purpose;
- whether health, recovery, Nova, or other records receive special-category treatment in each territory;
- age threshold and any parental-consent or exclusion requirements;
- final retention periods for records, logs, support, audit history, health data, Nova data, and backups;
- production subprocessors, regions, contracts, transfer mechanisms, provider training/retention settings, and deletion commitments;
- cookie/device-storage consent requirements and whether optional analytics will exist;
- regulator, member, insurer, and contractual incident-notification requirements.

No public privacy notice should present the provisional entries below as legally approved until these decisions are recorded.

## Scope and data subjects

Current data subjects are:

- members and people creating or recovering a North account;
- owner/admin users operating North;
- people submitting issue reports or receiving support;
- community-workout authors whose public template attribution is displayed;
- Together participants, connection requesters, room members, message senders, and people named in deliberately submitted safety reports;
- people represented in imported health records, Journey photos, free-text notes, or Nova messages submitted by a member.

The initial web product does not require an email address. Coach, family, team, referral-payment, public-social, Apple Health, and marketplace processing are outside current launch scope unless deliberately added later.

## System boundary

North currently processes data across:

1. the member's browser, using localStorage, IndexedDB, browser permissions, memory, and downloaded exports;
2. the North web/API host and PostgreSQL database;
3. encrypted local and optional offsite database backups;
4. the configured Nova AI provider;
5. optional Android Health Connect import from member-authorized sources such as Samsung Health;
6. Open-Meteo for optional current weather context;
7. an optional private issue-alert webhook;
8. the member's browser Push service when Together notifications are enabled on that device;
9. member-controlled files and destinations after backup, recap, or image export.

## Data inventory

### Account and authentication

| Data | Source | Current purpose | Storage and recipients | Current lifecycle |
|---|---|---|---|---|
| Username, display name, timezone, account ID, status, owner role | Member and server | Create, identify, administer, and display the account | Browser session; North PostgreSQL | Retained while account exists; account deletion removes the user row and cascading member records |
| Password hash | Member password, transformed with bcrypt | Authenticate without storing the password | North PostgreSQL only | Retained until credential replacement or account deletion |
| Recovery-code hash | Server-generated code, transformed with SHA-256 | Recover account access | North PostgreSQL; full code is shown once to the member | Rotated on recovery/manual replacement; deleted with account |
| Access token and refresh token | North API | Maintain signed-in access | Browser localStorage; refresh-token hash and expiry in PostgreSQL | Access token expires after 15 minutes; refresh token expires after 30 days or is revoked; local copy clears on sign-out/local erase |
| Device ID/name, user agent, IP, last seen, revocation state | Browser headers and network request | Bind sessions, show devices, detect/revoke access, investigate operations | Browser localStorage and North PostgreSQL | Device and sessions are member/admin revocable; device rows delete with account; final inactive-device retention is not approved |
| Access/invite code hash, label, expiry, usage | Owner/admin and registration | Control limited registration | North PostgreSQL and owner console | Retention after expiry/revocation is not approved |

Provisional purpose class: contract/service delivery and account security. Exact lawful basis and required notices are unresolved.

### Profile, preferences, and onboarding

| Data | Examples | Current purpose | Storage | Current lifecycle |
|---|---|---|---|---|
| Profile and direction | Name, direction, experience, target date, training rhythm | Personalize planning and member-facing identity | Browser records and account-scoped sync documents | Until edited/deleted or account deletion |
| Preferences | Units, theme, language, accessibility, notifications, coaching controls, timer preference | Render and operate the selected experience | localStorage and/or account-scoped sync documents | Until changed/local erase/account deletion |
| Equipment and activity preferences | Available equipment, gym access, preferred activities/times | Filter workouts and improve planning/Nova context | Browser and account-scoped server data | Until changed/deleted/account deletion |
| Onboarding progress | Completion, current step, generated first week | Resume setup and avoid repeating onboarding | Browser and account-scoped sync document | Until completion/reset/account deletion; final post-completion retention is not approved |

Provisional purpose class: requested service and member-controlled personalization. Optional processing must be reviewed separately from core account processing.

### Training, activity, recovery, and Journey

| Data | Examples | Current purpose | Storage and sharing | Current lifecycle |
|---|---|---|---|---|
| Plans and programs | Weekly/12-week plans, scheduled sessions, program state, targets | Plan and adjust future training | Browser and account-scoped PostgreSQL records | Member editable; tombstones may sync; account deletion cascades server copies |
| Workout records | Exercises, sets, repetitions, load, duration, distance, notes, dates, completion, ratings | Record sessions, history, progression, summaries, and recovery from interruption | Browser and account-scoped PostgreSQL records | Until member deletion/account deletion; completed-record correction rules apply |
| Activities | Walk/run/ride/mobility type, duration, distance, date, note, source | Maintain activity history and summaries | Browser and account-scoped PostgreSQL records | Until member deletion/account deletion |
| Check-ins and reviews | Energy, soreness, sleep, body weight, difficulty, reflections, free text | Give member context and produce evidence-based summaries | Browser and account-scoped PostgreSQL records; selected context may be sent to Nova | Until member deletion/account deletion; approved retention unresolved |
| Milestones and derived summaries | PRs, streaks, totals, comparisons, earned moments | Explain progress from member records | Primarily computed in the product; relevant state may sync | Changes when source evidence changes; account deletion removes account-scoped state |
| Journey photos and captions | Member-selected image up to product limits, date, caption | Private visual record and backup/restore | Browser storage and account sync/backup according to current document behavior; never published by the Community action | Newest-20 product limit; member deletion/local erase/account deletion; copies in downloaded or server backups follow their own lifecycle |
| Training recap image | Rendered summary selected by member | Create a private export | Generated in browser, then downloaded/shared through member-controlled destination | North does not control copies after export |

This category can reveal health, habits, location context, and physical condition even when North does not diagnose. Counsel must classify it for each launch territory.

### Health Connect and connected health

| Data | Source | Current purpose | Storage and recipients | Current lifecycle |
|---|---|---|---|---|
| Connection status, provider, scopes, category preferences, connection/import dates, last sync | Member authorization and Android companion | Control and explain import | North PostgreSQL and member UI | Connection can be paused/revoked; final connection-history retention unresolved |
| Imported records | Steps, heart rate, sleep sessions, exercise, distance, active/total calories, weight, timestamps, source app/device, external ID | Show authorized context, purposeful activities, summaries, and duplicate-safe imports | Android Health Connect to North API/PostgreSQL; account owner; selected summaries may be used in Nova context | Import starts at the configured boundary; account deletion cascades records; per-category history deletion is not yet complete |
| Record hashes and source IDs | Derived from imported records | Idempotency, attribution, and duplicate prevention | North PostgreSQL | Deletes with health records/account; separate retention unresolved |

Health access is category-based and member-authorized. Disconnecting currently stops future access but must not be described as deleting retained imports. A production Android launch requires real-device validation and Google Play health declarations.

### Nova

| Data | Source | Current purpose | Storage and recipients | Current lifecycle |
|---|---|---|---|---|
| Conversation titles and messages | Member and Nova responses | Provide account-scoped conversation and explanation | North PostgreSQL; configured AI provider receives prompts/context | Conversations may be archived; full deletion controls and approved retention require review; account deletion cascades North copies |
| Evidence and confidence | North-generated references to owned records | Explain the basis and limits of replies | North PostgreSQL and member UI | Stored with messages until deletion/account deletion |
| Goals and memory | Member statements, records, onboarding, or proposed inference | Personalize planning with reviewable controls | North PostgreSQL; approved entries may enter later provider context | Member can review/change status/delete memory; optional expiry field exists; account deletion cascades |
| Action proposals/events | Before/after snapshots, reason, payload, approval, receipt, undo data | Prevent silent plan changes and preserve an audit trail | North PostgreSQL | Pending proposals may expire after 24 hours; events remain until account deletion unless a final schedule is approved |
| Usage metadata | Provider/model/message ID, token counts, latency, estimated cost, status | Operate, limit, and cost the service | North PostgreSQL; provider separately processes request metadata | Account deletion cascades North usage events; provider retention is unresolved |

Provider prompts may include a member message and allow-listed recent records, goals, and active memory. The provider must never receive a caller-supplied owner ID as authorization. Provider contract, data use/training, region, retention, and deletion must be approved before production use.

### Community workout publication

| Data | Source | Current purpose | Storage and audience | Current lifecycle |
|---|---|---|---|---|
| Template, title, description, exercises, attribution, publication state | Member publication action | Let members discover and copy shared templates | North PostgreSQL; visible to North members while published | Author may unpublish; copied templates are independent; account deletion removes author-owned publication records |

Performance results, private notes, photos, health records, and Nova conversations are not part of the community template. Public/legal basis, moderation, attribution after deletion, and acceptable-use rules require final review before broad community availability.

### Together correspondence and rooms

| Data | Source | Current purpose | Storage and audience | Current lifecycle |
|---|---|---|---|---|
| Connections and room membership | Explicit request, acceptance, invitation, join, disconnect, block, or moderation action | Authorize direct, curated, and trainer-room access | North PostgreSQL; visible only to relevant participants, with public rooms exposing a count rather than a directory | Memberships and connections cascade on account deletion; a surviving participant may retain anonymized direct-message history, but cannot send after the connection disappears |
| Messages and shared cards | Member-authored text or deliberately reviewed workout, milestone, recap, selected photo, progress, encouragement, or invitation | Continue conversations and share bounded snapshots | North PostgreSQL; active room participants only | Retained until room/message removal policy or account lifecycle requires otherwise; sender identity becomes null on account deletion; final message retention period is not approved |
| Delivery and read state | Server delivery plus member read action | Unread counts and optional receipts | North PostgreSQL; participant scoped | Receipt rows cascade with the account or message; final inactive-room retention is not approved |
| Blocks, reports, and submitted report context | Member safety actions | Stop contact and permit narrow abuse review | North PostgreSQL; blocks are member scoped; deliberately submitted report context is available to authorized owner review | Blocks cascade with either account; report identities become null on deletion while submitted context may remain for safety review; final report retention is not approved |
| Notification preferences and Push subscription credentials | Member settings and browser Push subscription | Deliver opt-in device notifications with privacy-controlled previews | North PostgreSQL and the browser Push service; private message text is omitted unless separately enabled | Preferences and subscriptions cascade with account/device deletion; subscriptions are revocable and invalid endpoints are retired; provider retention is unresolved |
| North Updates and delivery receipts | Owner-authored signed announcement and targeted audience | Product, release, incident, service, and security communication | North PostgreSQL; delivered only to the selected audience | Member receipts cascade with account deletion; announcement and immutable publication-audit retention is not approved |

Together does not grant access to Journey, Training, health, Nova, recommendations, or analytics. Nova does not receive Together content by default. The admin product has no private-conversation browser, and operational request logs do not intentionally store message bodies or shared payloads. Together tables are included in encrypted whole-database backups and isolated restore verification; backup copies follow the backup retention and deletion schedule rather than immediate row-level deletion.

### Support, issue reports, and administration

| Data | Source | Current purpose | Storage and recipients | Current lifecycle |
|---|---|---|---|---|
| Issue report | Category, message, source screen, page URL, viewport, user agent, member/account association | Reproduce, prioritize, and resolve product problems | North PostgreSQL; owner console; optional private webhook receives summary and report metadata | Deletes with account under current schema; support retention and webhook retention unresolved |
| Support note | Admin-authored note linked to account | Track support actions without reading private training/reflection content | North PostgreSQL and owner console | Soft deletion exists; account deletion cascades; final schedule unresolved |
| Admin audit event | Actor/target references, action, reason, IP, metadata, timestamp | Accountability for sensitive owner actions | North PostgreSQL and owner console | User references become null after account deletion, leaving operational history; retention unresolved |
| Duplicate review | Candidate account IDs, evidence, reviewer, reason, state | Avoid unsafe automatic account merging | North PostgreSQL and owner console | Cascades when a candidate account is deleted; final schedule unresolved |

Members are instructed not to put passwords, recovery codes, payment data, or unnecessary private/medical details in issue reports. The optional webhook must be assessed as a subprocessor before activation.

### Operational and security records

| Data | Current fields | Current purpose | Storage | Current lifecycle |
|---|---|---|---|---|
| API request log | Request ID, method, route without query string, status, duration, account/device references, user agent, timestamp | Reliability, abuse/security review, and performance | North PostgreSQL and owner console | Scheduled cleanup uses the configured 14-day default; account/device references become null on deletion before cleanup |
| Operational event | Severity, source, category, message, request ID, IP, metadata, resolution | Detect and resolve errors, auth denials, rate limits, and incidents | North PostgreSQL and owner console | Scheduled cleanup uses the configured 90-day default only after resolution; unresolved events are preserved |
| Job and backup metadata | Job status/details/error; backup filename, size, verification and times | Verify scheduled operations and recovery | North PostgreSQL | Final retention enforcement unresolved |
| Application/proxy/system logs | Structured server and infrastructure output | Operate and secure hosting | Production host and configured monitoring/log destinations | Production destinations and schedules require operator verification |

Request bodies and response bodies are not intentionally stored in `api_request_logs`. Error messages and operational metadata still require review because accidental sensitive content can enter logs if exceptions include it.

### Weather and location

With explicit browser permission, North receives precise coordinates from the browser, rounds latitude/longitude to four decimal places, and sends them to Open-Meteo to request current weather. North stores the returned temperature, apparent temperature, precipitation, weather code, and cache time in localStorage; it does not intentionally store coordinates in North account data or send them to the North server.

Open-Meteo and the network provider can receive the request's coordinates and network metadata. The legal basis, disclosure, provider terms, and whether four-decimal precision is necessary must be reviewed.

### Exports and member-controlled copies

North can create a downloadable JSON backup and rendered recap/image exports. These files may contain sensitive profile, training, recovery, photo, and planning data. Once downloaded, copied, shared, imported elsewhere, or included in device/cloud backups, the member or destination controls those copies. Product copy must state that exports should be protected.

## Browser storage and device technologies

North uses first-party browser storage needed for account and product operation:

- localStorage for the persistent session, device ID, owner-switch protection, selected UI/preferences, weather cache, and some locally persisted product documents;
- owner-scoped IndexedDB for versioned documents, pending sync mutations, Together's offline outbox, conflicts, and migration metadata;
- service-worker caches for the application shell and offline navigation;
- browser permission APIs for optional geolocation, notifications, Wake Lock, and installed-app behavior.

No third-party advertising cookie or analytics SDK was identified in the current code. That fact must be rechecked against the exact production artifact and hosting configuration before publication. Adding analytics, advertising, crash reporting, or session replay requires updating this map and completing consent/legal review first.

## Storage, access, and protection

- API transport is intended to use HTTPS through the production reverse proxy.
- Member server queries are scoped by the authenticated account; revoked devices and suspended accounts are rejected.
- Passwords use bcrypt hashes; recovery and refresh tokens are stored server-side as hashes.
- Access tokens are short-lived and refresh tokens rotate.
- Expired or revoked refresh-token hashes are scheduled for deletion after the configured 30-day investigation window; active sessions are preserved.
- Admin access is server-enforced and sensitive actions create audit events.
- Database backups are encrypted with a separately held key, integrity checked, retained in daily/weekly/monthly tiers, and eligible for optional offsite replication.
- The browser's local records and downloaded exports depend on device/browser security and are not encrypted by North independently of the platform.
- Automated scanning checks tracked files and production build output for high-confidence credentials; provider revocation is still required for any exposed secret.

These controls reduce risk but do not establish legal compliance or guarantee confidentiality.

## Export and deletion effects

### Member export

The member-created North backup is a product backup, not a data-subject-access package. The owner export covers account, document, training, check-in, device/session metadata, health, Nova, community, support, issue, conflict, request-log, and related admin-audit records while excluding password, recovery-code, and refresh-token hashes. It still requires counsel review and end-to-end staging verification through a secure delivery path.

### Account deletion

`DELETE /v1/me` hard-deletes the `app_users` row. Foreign-key cascades remove credentials, sessions, devices, member documents, training/activity/check-in records, health connections/records, Nova records, support notes, issue reports, and community records associated with that owner.

The current schema intentionally or structurally retains some operational rows after setting deleted account references to null, including API request logs and admin audit events. Operational events can contain IP/request metadata without a direct account foreign key. Encrypted backups can retain pre-deletion data until pruned under the backup schedule. The final privacy notice and deletion response must explain these bounded residual copies accurately.

Local browser data must also be erased on the requesting device. Other devices may retain local data until they sync, sign out, are revoked, or are locally erased; this behavior requires end-to-end staging verification.

## Backup retention

Current backup scripts retain at most the newest qualifying copies across:

- 14 daily points;
- 8 weekly points;
- 6 monthly points.

One file can satisfy several tiers, and the script imposes a 28-file maximum. The newest backup is restored into an isolated database for scheduled verification. Offsite backup is recommended but activation and region/provider are not proven by the repository.

Deletion from the live database does not rewrite existing encrypted backups. Restoring an older backup must be followed by controls that reapply valid deletions before normal service resumes; that procedure still needs rehearsal.

## Provisional processing-purpose register

This table is a legal-review worksheet, not a final lawful-basis determination.

| Purpose | Data involved | Necessary/optional | Candidate basis to review | Decision owner |
|---|---|---|---|---|
| Create and operate an account | Identity, credentials, session, device, core records | Core | Performance of requested service/contract | Counsel and owner |
| Secure North and prevent abuse | Auth, IP, device, request/audit/incident records | Core | Legitimate interests, contract, or legal obligation | Counsel and owner |
| Provide training record and planning | Profile, workouts, activities, check-ins, preferences | Core/feature-dependent | Performance of requested service; special-data analysis required | Counsel and owner |
| Import connected health | Health scopes and records | Optional | Explicit consent and/or territory-specific condition | Counsel and owner |
| Provide Nova | Messages, selected account context, memory, proposals, usage | Optional | Contract and/or consent; special-data and automated-processing review required | Counsel and owner |
| Provide local weather | Precise coordinates and returned weather | Optional | Consent/device permission and provider disclosure | Counsel and owner |
| Publish community templates | Template and author attribution | Optional/public | Member request/consent and acceptable-use terms | Counsel and owner |
| Support and issue handling | Report, account context, technical metadata | Member-initiated | Contract and/or legitimate interests | Counsel and owner |
| Back up and recover service | All server records in encrypted snapshots | Core security | Contract, legitimate interests, and/or legal obligation | Counsel and owner |

## Subprocessor and external-service register

Only confirmed code paths are listed. Production activation, legal entity, region, terms, and transfer mechanism must be verified separately.

| Service | Role in current design | Data sent | Production status to verify |
|---|---|---|---|
| North hosting/VPS and PostgreSQL infrastructure | Host web/API/database and operational logs | All server-side member and operational data | Provider, entity, region, contract, encryption-at-rest, access, deletion, incident terms |
| OpenAI-compatible Nova provider | Generate replies and structured proposals | Member message, instructions, allow-listed account context, request metadata | Actual provider/model, region, retention, training use, DPA, transfer, abuse monitoring, deletion |
| Open-Meteo | Return optional current weather | Rounded coordinates and normal network metadata | Terms, privacy disclosure, necessity and precision |
| Android Health Connect / source health apps | Member-controlled source on Android | Health data flows from authorized apps/device into North | Platform declarations, app identity, permissions, deletion, real-device behavior |
| Optional issue webhook provider | Notify the owner of reports | Report summary, ID, category, source screen, time; provider also receives network metadata | Disabled/enabled state, provider, destination access, retention, DPA/terms |
| Optional offsite backup provider via rclone | Store encrypted database backup objects | Encrypted backup files and object metadata | Activation, provider, region, contract, key separation, deletion and restore proof |
| Browser/device/cloud services selected by member | Store local data or exported files | Local app data, downloads, backups, recaps/photos as directed by member | Outside North's direct control; member guidance required |

## Incident exposure priorities

Highest-impact scenarios are:

- stolen browser refresh token or unlocked device exposing local records;
- missing owner scoping or admin authorization causing cross-account access;
- compromised database/JWT/provider/backup key or production host;
- Nova prompt/context disclosure or provider retention beyond approved terms;
- health record, photo, reflection, or issue-report disclosure;
- logs or webhooks capturing more content than intended;
- account deletion that leaves active local copies or restored backup data;
- malicious community content or member free text reaching operators/providers;
- downloadable backup or recap stored or shared insecurely.

Use `docs/INCIDENT_RESPONSE.md` for declaration, containment, evidence, breach assessment, communication, recovery, and review.

## Verification required before launch

- [ ] Owner and counsel complete every decision in "Decisions still required."
- [ ] Inspect the exact production environment, provider dashboards, contracts, regions, and retention settings.
- [ ] Run account export/deletion across browser, API, Nova, health, community, issue/support, logs, other devices, and a restored backup.
- [ ] Verify the scheduled retention job executes successfully in staging/production and approve schedules for support, audit, health, deleted-account residuals, and infrastructure logs.
- [ ] Verify production logs and error paths never capture request bodies, tokens, private notes, Nova content, or health payloads.
- [ ] Confirm optional webhook and offsite backup activation, access, region, and deletion behavior.
- [ ] Reconcile this map with the counsel-approved Privacy Notice and member controls.
- [ ] Review the map whenever a provider, data category, public feature, analytics tool, territory, or retention rule changes.

## Evidence sources

- Authentication, API logging, account deletion, health routes, and admin controls: `server/index.mjs`
- Nova provider and account-scoped storage: `server/nova-provider.mjs`, `server/nova-routes.mjs`, `db/migrations/0012_nova_intelligence_hub.sql`
- Core, auth/sync, operations, request-log, health, community, and issue schemas: `db/migrations/0001_initial.sql` through `db/migrations/0017_issue_reports.sql`
- Browser sessions and device identity: `src/data/account.ts`
- IndexedDB, outbox, and conflicts: `src/data/northDb.ts`, `src/data/sync.ts`
- Weather and member-facing records/exports: `src/App.tsx`
- Health Connect bridge: `mobile/android/app/src/main/java/io/bodhix/north/health/HealthReader.kt`
- Backups and restore: `deploy/BACKUPS.md`, `deploy/backup-north.sh`, `deploy/prune-north-backups.sh`, `deploy/verify-north-restore.sh`
- Incident handling: `docs/INCIDENT_RESPONSE.md`