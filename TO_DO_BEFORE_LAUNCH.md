# North: To Do Before Launch

Status reviewed: 2026-08-05

This checklist assumes the next launch is a controlled public launch of the North web app/PWA. Android, Samsung Health production access, Google Play, and iPhone distribution have separate gates below.

The older estimates in `AUDIT_AND_EXECUTION_PLAN.md` are no longer the launch source of truth. Several items listed there as incomplete are now implemented or covered by automation. This file tracks what is verified, what still needs human or real-device evidence, and what is deliberately deferred.

## Current launch read

| Area | Current status |
|---|---|
| North 0.7 product foundation | Complete and automated release-tested |
| Hosted architecture and operations tooling | Implemented; final staging rehearsal and alert proof remain |
| Responsive, keyboard, offline, and recovery automation | Complete; manual assistive-technology and real-device testing remain |
| Legal and safety notice | Comprehensive interim notice complete; counsel-approved launch documents remain |
| Privacy and security | Product controls, technical data map, secret scanning, owner export, retention automation, and incident procedure implemented; approvals, independent review, staging proof, credential rotation, and incident rehearsal remain |
| Controlled public web launch | Not ready until the applicable blockers below are closed or formally accepted |
| Android/Samsung Health production launch | Not ready; signed build, real hardware sync, data controls, and Play review remain |
| iPhone/App Store launch | Deferred until the HealthKit/iOS product exists and passes its own gate |

## Already completed and verified

### Product and account foundation

- [x] North 0.7 core member experience is implemented: onboarding, Today, Journey, Training, Nova, You, Guide, planning, workout recording, and account settings.
- [x] Owner-scoped authentication, recovery codes, sessions, devices, account deletion, IndexedDB persistence, offline outbox, sync, restoration, and conflict handling are implemented.
- [x] Hosted web/API/PostgreSQL architecture, HTTPS proxy, migrations, health checks, structured logs, secure headers, rate limits, encrypted backups, and restore procedures exist.
- [x] Owner administration, account controls, audit events, support notes, operational status, backup status, and privacy-limited request/error logs exist.
- [x] A shared issue-reporting action is available in the member app and covered by tests.

### Product quality already covered by automation

- [x] TypeScript production build passes.
- [x] Exercise database validation passes.
- [x] Unit and integration coverage exists for persistence, sync, account isolation, planning, workout safety, health imports, Nova isolation, Guide behavior, and release notes.
- [x] The 27-check browser release suite passes across core navigation, account, planning, workout, Nova, health, Guide, online/offline, reload, keyboard, and responsive flows.
- [x] Automated responsive checks cover 320, 375, 390, 430, 768, 1024, and wide-desktop layouts without horizontal overflow.
- [x] Automated accessibility checks cover named controls, keyboard reachability, focus behavior, large text, high contrast, and reduced motion on critical routes.
- [x] PWA manifest, icons, install metadata, offline navigation fallback, update-safe asset naming, and interrupted-workout recovery are implemented.
- [x] The North Guide covers current member-facing controls and has a dated factual-claim source register.

### Trust and safety already implemented

- [x] Privacy controls, connected-service state, data export/restore, local-data deletion, and permanent account deletion are exposed to members.
- [x] Nova uses approval gates, evidence, confidence, account isolation, stale-state protection, audit receipts, and medical-safety boundaries.
- [x] Exercise and health guidance is bounded as editorial context rather than diagnosis, treatment, rehabilitation, or individual medical clearance.
- [x] A comprehensive interim Legal & Safety notice is reachable from Settings and the universal footer, includes emergency guidance, and is responsive and browser-tested.
- [x] The notice clearly states that qualified counsel must review it before commercial launch.

## Launch blockers: controlled public web launch

These items must be closed or explicitly accepted in writing by the owner before public launch.

### 1. Business and legal identity

- [ ] Confirm the operating legal entity, trading name, registered address, contact address, launch territories, and governing jurisdiction.
- [ ] Have qualified counsel review North's product, health, AI/Nova, account, community, and data-handling risks.
- [ ] Replace the interim notice with counsel-approved Terms of Service, Privacy Notice, Health and Exercise Disclaimer, Acceptable Use rules, and required consumer disclosures.
- [ ] Decide the minimum member age and implement any required age gate, parental-consent flow, or exclusion of minors.
- [x] `docs/PRIVACY_DATA_MAP.md` contains a code-grounded subprocessor and external-service register covering hosting, Nova/AI, weather, Health Connect/source apps, issue webhooks, offsite backups, browser storage, and member-controlled destinations, including the data each path receives.
- [ ] Confirm the production providers, legal entities, regions, contracts/DPAs, transfer mechanisms, retention/training/deletion terms, and activation state for every subprocessor and international transfer.
- [ ] Define cookie/local-storage and analytics consent requirements for every launch territory.
- [ ] Decide pricing, trial, billing, cancellation, refund, tax/VAT, chargeback, and territorial-availability rules before accepting payment.
- [ ] Obtain appropriate business, cyber, and professional/product liability insurance advice.
- [ ] Publish real legal, privacy, and support contact methods. Do not launch with placeholders.

### 2. Privacy and security review

- [x] `docs/PRIVACY_DATA_MAP.md` inventories current collection, purpose, storage, flows, export, deletion, retention gaps, subprocessors, and incident exposure from the North 0.7 implementation.
- [ ] Owner and qualified counsel must approve controller/processor roles, lawful bases, special-category conditions, territories, age rules, retention schedules, subprocessors/transfers, and notices recorded as unresolved in the data map.
- [ ] Complete an independent application/API security review against current OWASP guidance, including authentication, authorization, account isolation, injection, abuse, rate limits, file handling, and admin actions.
- [ ] Revoke and replace the OpenAI credential currently stored in the ignored workspace key file. Treat it as exposed because it has been shared outside the provider secret store; delete the file after rotation and update only the server's protected environment.
- [ ] Rotate any other development or production secret that has been stored insecurely, shared, logged, or committed, and record the affected systems and rotation date.
- [x] Automated secret scanning covers tracked repository files and generated production assets without printing detected values; it runs as part of `npm run validate`.
- [x] The authenticated owner export covers account-scoped product, health, Nova, community, support, issue, conflict, request-log, and related audit records while excluding reusable credential hashes.
- [ ] Verify account export and deletion end to end in staging, including synced records, Nova data, health imports, logs, backups, and documented backup-retention limits.
- [x] Scheduled, auditable retention cleanup covers API request logs, resolved operational events, idempotency receipts, and expired/revoked refresh-token hashes; automated tests protect its settings, SQL targets, safety boundaries, and cron installation.
- [ ] Approve and implement retention/deletion schedules for admin audit data, support records, health imports, deleted-account residuals, job/backup metadata, and infrastructure logs; verify the maintenance job on staging and production.
- [x] A pre-launch incident-response and breach-assessment procedure defines an interim owner, severity levels, containment, evidence retention, recovery, member communication, and post-incident review.
- [ ] Rehearse `docs/INCIDENT_RESPONSE.md` using the real provider, hosting, monitoring, legal, support, and private contact arrangements; record gaps, owners, due dates, and a retest.
- [ ] Review Nova provider data-use, retention, training, regional processing, and failure behavior; record the production configuration.
- [ ] Resolve or formally accept every high/critical security finding before launch.

### 3. Staging and release rehearsal

- [ ] Create a staging environment that matches production configuration without using production member data.
- [ ] Run the complete `npm run validate:release` gate against the final release candidate.
- [ ] Run non-destructive live contract checks against staging for health, authentication rejection, protected routes, cache rules, headers, recovery, sync, and deletion.
- [ ] Rehearse database migration, encrypted backup, isolated restore, deployment, health verification, and rollback from start to finish.
- [ ] Test an interrupted or failed deployment and prove the previous version can be restored without data loss.
- [ ] Verify monitoring alerts reach the owner for API unavailability, elevated errors, latency, database failure, backup failure, certificate expiry, disk pressure, and repeated auth/rate-limit events.
- [ ] Record the exact release command, migration version, artifact/version identifier, rollback command, responsible person, and go/no-go decision.

### 4. Real-device accessibility and browser matrix

- [ ] Test critical flows with NVDA on Windows and at least one mobile screen reader such as TalkBack or VoiceOver.
- [ ] Manually verify focus order, focus visibility, landmarks, headings, form instructions/errors, dialogs, Escape behavior, announcements, and zoom/reflow at 200% and 400%.
- [ ] Complete a WCAG 2.2 AA review and document defects, exceptions, and fixes.
- [ ] Test the final release candidate on current Chrome, Edge, Firefox, Safari, Samsung Internet, Android, iPhone, and at least one tablet.
- [ ] Verify on-screen keyboard behavior, safe areas, landscape, standalone PWA mode, reduced motion, high contrast, large text, and coarse-pointer targets on real hardware.
- [ ] Fix or explicitly document every launch-blocking accessibility or browser defect.

### 5. Gym-floor and field validation

- [ ] Complete a real one-handed gym-floor workout using preparation, set entry, rest, hold timing, substitution, pause/resume, notes, cancellation safeguards, completion, and interruption recovery.
- [ ] Test weak/no network, airplane mode, tab suspension, screen lock, browser kill, low battery, refresh, sign-out/sign-in, and later sync during an actual workout.
- [ ] Complete real walking, running, and cycling records and verify duration, distance, dates, units, calendar placement, summaries, and duplicate behavior.
- [ ] Test a long-lived account with substantial workout, activity, photo, check-in, Nova, and sync history.
- [ ] Record each defect with device, OS, browser, reproduction steps, severity, and resolution status.

### 6. Performance, install, update, and recovery

- [x] Production artifact budgets now enforce member-entry and total JavaScript, stylesheet, fonts, individual images, Android APK, and complete distribution size on every build; non-runtime public assets are excluded deterministically.
- [ ] Establish measured launch budgets for startup, interaction responsiveness, memory, API latency, sync duration, long-history rendering, and account restoration on representative hardware.
- [ ] Profile the final build on a mid-range phone and a throttled connection; reduce the current large-entry warning through measured route/component/CSS splitting and optimize reviewed workout/exercise media.
- [ ] Load-test authentication, sync, health import, Nova, admin, and large-history reads at the expected launch concurrency plus a safety margin.
- [ ] Test PWA installation and removal on supported desktop and mobile browsers.
- [x] An automated production-build rehearsal installs service-worker revision A, persists an active workout and owner-scoped unsynced mutation, activates revision B on the same origin, reloads, and verifies the workout, outbox, controller, and cache transition survive; it runs in `validate:release`.
- [ ] Repeat the service-worker update rehearsal from the actual current production artifact to the exact release candidate on staging and representative installed PWAs before launch.
- [ ] Verify local backup export, validated restore, server restoration, account recovery, device revocation, and conflict resolution using realistic data.
- [x] Local and IndexedDB persistence failures are classified without claiming a save succeeded, and North shows an accessible, dismissible storage-full/unavailable warning with safe recovery guidance.
- [ ] Exercise real browser quota exhaustion and blocked-storage behavior on supported desktop/mobile browsers; verify backup export and recovery after space is restored.

### 7. Operations, support, and launch ownership

- [ ] Define launch scope, audience size, invite/public-access policy, supported territories, and explicit go/no-go criteria.
- [ ] Publish support and privacy contact routes and define who responds, expected response windows, escalation, and emergency boundaries.
- [ ] Create a triage process for issue reports, security reports, data requests, account recovery, abuse, and health/safety complaints.
- [x] North 0.7 member-facing release notes are published in the app, linked from App & updates, announced through the dismissible update notice, recorded in `CHANGELOG.md`, and covered by release tests.
- [ ] Publish launch-specific known issues, support guidance, and status/incident messaging using the final real contact routes.
- [ ] Confirm production monitoring, backup checks, certificate renewal, dependency updates, database maintenance, and restore tests have named owners and schedules.
- [ ] Decide what privacy-respecting product metrics are genuinely required; do not add analytics without the legal basis, consent behavior, and retention rules being settled.
- [ ] Schedule launch-day and first-week monitoring windows, rollback authority, and daily review of errors, support, sync conflicts, and account creation.

## Product quality required before launch

These are current product gaps that should be completed or consciously descoped before the release candidate is frozen.

- [ ] Add validated start/finish demonstrations for the most-used movement families; do not expand media faster than form and accuracy can be reviewed.
- [ ] Finish activity-specific visual assets where their absence materially weakens comprehension, not merely decoration.
- [ ] Review large-history exercise and Journey performance and add virtualization, pagination, or lazy loading where measured evidence requires it.
- [ ] Review all member-facing claims, emergency wording, connected-health explanations, and Nova boundaries one final time after legal review.
- [ ] Freeze launch scope and move non-blocking visual enhancements or new features out of the release branch.

## Android and Samsung Health production gate

These items are not blockers for a web-only launch if connected-health production access is disabled or clearly limited.

- [ ] Build and sign the Android companion APK on a maintained Android SDK workstation.
- [ ] Install it on the target Samsung phone, grant each category, and complete the first real Galaxy Watch to Samsung Health to Health Connect to North sync.
- [ ] Verify source attribution, time zones, units, permissions, revocation, deduplication, reconnection, deletion, and foreground incremental import on real data.
- [ ] Add and validate background/incremental sync only after foreground behavior is proven.
- [ ] Add per-category pause, imported-history deletion, and member-visible source-attribution controls.
- [ ] Complete the Google Play Health Apps declaration, Data Safety form, privacy rationale, store listing, production-access review, signing/key custody, and release testing.

## iPhone/App Store gate

- [ ] Build and validate the HealthKit bridge and iOS application before claiming iPhone health integration.
- [ ] Complete Apple privacy manifests, required-purpose API declarations, HealthKit disclosures, App Privacy answers, review notes, signing, and TestFlight testing.
- [ ] Complete App Store listing, screenshots, support URL, privacy URL, age rating, territorial availability, and review approval.

## Deliberately deferred from the initial launch

- [x] Deferred from the initial launch: nutrition and cookbook systems.
- [x] Deferred from the initial launch: public social feeds or profiles.
- [x] Deferred from the initial launch: coach, family, and team workspaces.
- [x] Deferred from the initial launch: marketplace or referral-payment mechanics.
- [x] Deferred from the initial launch: large-scale exercise-media expansion without an accuracy review process.

Deferred items stay out of launch scope unless the owner deliberately reopens scope and adds their product, privacy, security, legal, operational, and testing gates here.

## Final release-day checklist

- [ ] Release candidate commit/tag and version are recorded.
- [ ] Full release validation is green on the exact artifact being deployed.
- [ ] Legal documents, support details, release notes, and known issues are published.
- [ ] Database backup is current and restore verification is green.
- [ ] Migration and rollback commands have been reviewed by the person operating them.
- [ ] Monitoring and alert delivery are green before traffic is enabled.
- [ ] Deploy to staging, complete smoke tests, then obtain an explicit owner go decision.
- [ ] Deploy the same reviewed artifact to production.
- [ ] Verify HTTPS, headers, health, authentication, onboarding, recovery, sync, workout completion, offline recovery, account export/deletion, admin access, and issue reporting.
- [ ] Watch errors, latency, database health, backups, auth denials, rate limits, sync conflicts, and support reports during the agreed monitoring window.
- [ ] Roll back immediately if a stop condition is reached; preserve logs and document the decision.
- [ ] Record the release outcome, defects, mitigations, and next review date.

## Definition of launch-ready

North is ready for the scoped launch only when:

1. Every applicable launch blocker above is checked, or has a written owner acceptance with reason, mitigation, and review date.
2. Qualified legal and privacy professionals have reviewed the commercial launch documents and data practices for the actual entity and territories.
3. No unresolved critical or high security, privacy, data-loss, accessibility, or health/safety defect remains.
4. Real-device evidence covers the supported browsers, accessibility tools, gym-floor workflow, offline recovery, and any advertised health integration.
5. The exact production artifact has passed the complete release gate, staging rehearsal, backup/restore proof, and rollback proof.
6. Support, monitoring, incident response, and release ownership are active rather than merely documented.

## Related records

- `docs/MASTER_BUILD_LIST.md` remains the broader product roadmap.
- `docs/NORTH_10_OF_10_SUPERPLAN.md` records the product-quality standard and release principle.
- `docs/product/NORTH_0_7_GUIDE_COVERAGE.md` records member-facing Guide and factual-claim coverage.
- `docs/HOSTED_PRODUCT_ROADMAP.md` records the hosted architecture and usable-product definition.
- `deploy/BACKUPS.md` and the deployment scripts record operational procedures.
- `AUDIT_AND_EXECUTION_PLAN.md` is retained as a historical audit, not current completion status.