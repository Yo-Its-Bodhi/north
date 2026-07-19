# North 0.4 — Nova Intelligence Hub

Status: local development only. Do not deploy until the owner explicitly approves a North 0.4 release.

## Product promise

Nova is North's account-scoped intelligence layer: a conversational coach, app helper, planner, record interpreter and companion. Nova may explain and draft freely, but every read and write is performed through validated North tools. Meaningful changes are previewed and require approval.

## Non-negotiable security boundary

- The authenticated JWT determines the owner. Model output never supplies an owner ID.
- Every Nova table carries `owner_user_id`; composite foreign keys prevent cross-owner relationships.
- Account switches clear local Nova projections before the next account is hydrated.
- Nova cannot call admin routes or query another member by username.
- Conversation context is assembled from allow-listed records belonging to the current owner.
- Proposed mutations are validated, audited, reversible where practical and protected from stale writes.

## Core records

- Conversations and messages
- Direction and goals ledger
- Reviewable memory entries with source, confidence and confirmation state
- Action proposals with before/after snapshots
- Action events and undo receipts
- Per-account/provider usage records

## Action policy

### Explicit low-risk actions

Add a dictated thought, reflection or check-in; retrieve records; navigate; explain; or save an exact preference. Apply immediately with a receipt and undo where practical.

### Approval required

Change a workout, week, program, active goal, schedule, inferred preference, or delete data. Nova produces a proposal showing before, after, reason and untouched scope.

### Forbidden

Cross-account access, admin actions from member chat, medical diagnosis, invented completed work, silent plan changes, concealed history rewrites and casual account deletion.

## Release slices

1. Secure storage, ownership tests and audit trail.
2. Provider abstraction, streaming conversation and grounded context.
3. Direction/goals ledger and What Nova Knows controls.
4. Journey, check-in, goal, navigation and record tools.
5. Workout explanation, building, substitutions and approved plan mutations.
6. Polished proposal, receipt, undo and evidence interface.
7. Isolation, safety, hallucination, mobile, gym-floor and cost testing.
8. Local release package and owner review; production remains untouched.

## Definition of ready to upload

A member can converse naturally, ask about owned records, add a thought/check-in, manage goals and memories, create a validated workout, approve or reject plan changes, inspect evidence, undo supported actions, and switch accounts without any context crossing between users. All validation, isolation, regression and production-build checks pass locally.
