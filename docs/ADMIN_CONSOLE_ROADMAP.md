# North owner administration console

## Security model

- Owner-only access is enforced by the API, never by hiding frontend controls.
- Every admin query and mutation requires a valid member session plus `is_admin=true` and `status=active`.
- Existing passwords and recovery codes can never be displayed. They are hashed; admins can revoke sessions or issue a one-time replacement recovery code.
- Suspension immediately blocks refresh, account reads, sync, and admin access.
- Destructive actions require explicit confirmation and an entered reason.
- Every sensitive action records actor, target, action, reason, timestamp, IP and structured before/after metadata.

## Dashboard

- [x] Total, active, new and suspended users
- [ ] Onboarding completion, workouts, activities and sync adoption
- [ ] New users and activity over 7/30/90 days
- [x] Live API runtime, memory, database size/connections, schema, sessions, devices, content and conflict status
- [x] Encrypted backup execution, integrity verification and isolated restore-test status
- [x] Searchable request log plus 24-hour error-rate, average and p95 latency history
- [x] Open server sync-conflict count and latest-sync context
- [x] Recent admin actions and recovery events

## Users

- [x] Search by username, display name or ID
- [x] Filter by status and paginate without loading the complete user table
- [x] User detail: identity, role, status, created/updated and last active
- [x] User detail: devices, sessions, document/workout/activity counts and sync-document metadata
- [x] Suspend/restore, revoke all sessions, rename display name and promote/demote with owner safeguards
- [x] Generate a replacement recovery code shown once
- [x] Permanently delete an account
- [ ] Merge review workflow for genuinely duplicated accounts without automatic destructive merging

## Codes and access

- [x] Generate one-time or multi-use invite/access codes
- [x] Store code hashes and show the full code once
- [x] Label, expiry, maximum uses, current uses, enabled state and optional notes
- [x] Enable or revoke codes with audited reasons
- [x] Enforced feature flag requiring an active, unexpired, usage-limited access code during registration

## Content and product controls

- [x] CRUD/version/publish exercise catalogue entries
- [x] CRUD/version/publish workouts and programs
- [x] Initial feature flags and maintenance-mode controls
- [ ] Announcement/banner composer with schedule and audience
- [ ] Milestone definitions and safe Nova prompt/tool configuration
- [ ] Read-only system configuration view with secrets always redacted

## Operations and trust

- [x] Immutable recent audit log
- [x] Live health, runtime and migration status
- [x] Scheduled encrypted backups, retention, integrity verification and weekly isolated restore tests
- [x] Persistent API error, authentication-denial and rate-limit event view with resolution workflow
- [x] Searchable privacy-limited API request logs and scheduled background-job status
- [ ] Rate-limit/security event view
- [ ] Data-retention jobs and deletion queue
- [x] Support notes separated from private workout/reflection content
- [ ] Mobile-safe emergency controls, with primary administration optimized for desktop/tablet

## Cross-device identity

- [x] Pull authoritative documents immediately after sign-in before local defaults can overwrite them
- [x] Push local records automatically after first completion and signed-in app load
- [x] Persist onboarding completion as an owner-scoped server document
- [x] Register and label devices, update last-seen state and show them in the account/admin areas
- [x] Allow member and admin session/device revocation
- [x] Resolve same-document conflicts explicitly; never silently choose a winner
