# North 0.8 - Together

## Release intent

North 0.8 turns Community into a place where people can stay in touch, share useful training work, and return to an ongoing conversation from any signed-in device.

Together should feel social without becoming a feed. It prioritizes people, conversations, rooms, and deliberate sharing. It does not add follower counts, likes, popularity rankings, engagement streaks, or ambient access to another person's private North.

## Product contract

- Messages, membership, unread state, and preferences live on the North server and resume across devices.
- A connection never exposes workouts, Journey, health, Nova, recommendations, or analytics.
- Sharing a North item is an explicit send to a named conversation with a review step.
- Nova cannot read Together content unless a member deliberately submits selected text through a separate review flow.
- Private conversation bodies are not available in the admin console or operational logs.
- North does not claim end-to-end encryption in 0.8. Transport encryption, strict participant authorization, and careful notification previews are the honest security model.
- Version 0.8 remains local until the complete messaging validation gate passes. Do not push it to Git or deploy it to the VPS before explicit approval.

## Conversation model

### Inbox

Together opens to a compact inbox ordered by recent activity. Each row shows the conversation name, avatar or room mark, latest safe preview, time, unread count, muted state, and delivery problem when one needs attention.

### Direct messages

- A DM begins with an explicit connection request and acceptance.
- Members can search by exact username without exposing a browsable member directory.
- Accepted connections receive one persistent conversation.
- Members can mute, disconnect, block, report, or hide their local view.
- Disconnecting preserves retained history while stopping new messages.
- Blocking immediately stops contact and suppresses presence, typing, and receipts.

### Community rooms

- **General** is a relaxed whole-community room for training conversation and encouragement.
- **Help** is a question-and-answer room for using North and practical training discussion. It is not medical support.
- **North Updates** is a signed, read-only announcement room. Owner posts never impersonate a DM.
- Public rooms use moderation, rate limits, reports, slow mode, and member-level mute controls.
- Public room discovery is curated. Members cannot create arbitrary public rooms in 0.8.

### Trainer rooms

- A trainer room is private and invite-only, with `owner`, `trainer`, and `member` roles.
- It may contain one trainer and one member or a deliberately invited small group.
- Joining a trainer room grants access only to messages and items explicitly shared into that room.
- Trainer status is a room role, not a medical or professional endorsement by North.

### Deliberate sharing

The first supported card is a workout template. Milestones, recaps, selected Journey photos, short progress updates, and invitations follow after text and workout sharing are proven.

Every send review shows the recipient or room, exact visible content, and who can see it. Receiving content never edits a plan or record. Saving a workout creates an independent personal copy.

## Notifications

- In-app unread badges distinguish DMs, rooms, trainer spaces, and signed announcements by restrained destination colours.
- Notification preferences are global and per conversation.
- Direct messages, room activity, trainer messages, feature announcements, release announcements, incidents, service notices, and security notices are separate categories.
- Browser push is opt-in and requested only after Together has demonstrated value, never on first load.
- Locked-screen previews default to sender/conversation only; message text requires explicit opt-in.
- Notification clicks deep-link to the exact conversation and reconcile read state after authentication.
- Sounds, read receipts, typing indicators, and presence are independent opt-in controls.

## Architecture

### Durable server model

PostgreSQL owns connections, conversations, participants, messages, receipts, blocks, reports, rooms, announcements, push subscriptions, notification preferences, and administrative announcement audit events.

Messages use a client-generated idempotency key. The API returns canonical server order and timestamps. History and inbox use cursor pagination. Participant authorization is applied to every private query.

### Realtime and offline

1. The first local slice uses authenticated HTTP send/pull with short foreground refresh and refresh-on-focus.
2. The client writes an optimistic message to a dedicated IndexedDB outbox before sending.
3. Reconnect retries the same client message ID, making delivery idempotent.
4. Server-Sent Events are added after HTTP reconciliation is proven, providing lightweight live messages and unread changes without changing persistence semantics.
5. Web Push wakes absent devices; it is not the source of truth.

### Privacy and abuse controls

- Exact-username lookup is rate limited and returns minimum profile information.
- Message bodies and private shared payloads are excluded from request and operational logs.
- Public-room and connection-request sends have separate spam limits.
- Reports include only content the reporter deliberately submits for review.
- Attachment URLs are participant-scoped, short lived, and introduced only after the text threat model passes.
- Export, deletion, account removal, retention, legal access, and backup behavior are tested before release.

## Start-to-finish implementation

### Phase 1 - Foundation

- [x] Define the 0.8 product, room, privacy, notification, and release contract.
- [x] Add relational schemas for conversations, membership, connections, messages, receipts, blocks, reports, announcements, preferences, and audit events.
- [x] Build authenticated inbox, history, send, receipt, and unread endpoints.
- [x] Complete request, accept, decline, disconnect, block, report, and mute endpoints.
- [x] Seed General, Help, and North Updates without creating duplicate system rooms.
- [x] Add route-level authorization, idempotency, ordering, pagination, blocking, and rate-limit contract tests.

### Phase 2 - Member messaging

- [x] Add Together to desktop and mobile primary navigation with unread badges.
- [x] Complete inbox filters, search, and offline states.
- [x] Complete thread pagination and offline recovery with accessible text threads, optimistic send, retry, canonical ordering, and live multi-device reconciliation.
- [x] Add General, Help, North Updates, and private trainer room treatments.
- [x] Add privacy-preserving room information and member controls. Direct and trainer rooms show participants; public rooms show counts without exposing a browsable member directory.
- [x] Add a dedicated IndexedDB Together outbox and reconciliation worker.

### Phase 3 - Sharing

- [x] Add reviewed workout-template sharing and independent recipient save.
- [x] Add milestone, recap, bounded selected Journey photo, progress update, encouragement, and invitation cards with recipient review.
- [x] Prove in focused contracts that received cards are inert; only a reviewed workout exposes a separate explicit copy action.

### Phase 4 - Live delivery and notifications

- [x] Add authenticated Server-Sent Events for message, receipt, membership, announcement, and unread updates.
- [x] Add global and per-conversation preferences for messages, rooms, trainer spaces, announcements, previews, sounds, receipts, typing, and presence.
- [x] Add VAPID-backed push subscriptions, service-worker display/click handling, device revocation, and privacy-safe previews.
- [x] Add global member preference controls and an in-app notification centre driven by canonical unread rooms and destination colours.

### Phase 5 - Owner and moderation tools

- [x] Add announcement draft, audience, preview, schedule, expiry, correction, archive, publish confirmation, and immutable audit history.
- [x] Add public-room moderation, slow mode, member removal, reports, appeals notes, and narrowly scoped moderator roles.
- [x] Keep private conversation browsing out of the admin console.

### Phase 6 - Release proof

- [x] Prove participant isolation, blocked-user behavior, inactive trainer invitations, and post-deletion direct-room behavior with adversarial route tests.
- [x] Prove send, retry, deduplication, ordering, offline recovery, and unread reconciliation across two users and two devices each against a disposable native PostgreSQL 16.14 instance.
- [x] Prove public-room moderator authority and denial for ordinary members, plus trainer-room invitation boundaries, with adversarial route tests.
- [x] Prove Push payload privacy with preview text disabled and enabled, and exact-room notification deep links, in executable tests.
- [ ] Prove real Push-provider delivery and notification-click behavior on desktop and mobile with production VAPID credentials.
- [x] Complete local keyboard-labelled dialog/control, responsive desktop/mobile, performance-budget, participant export, account-deletion, backup-scope, incident-response, and technical privacy reviews.
- [ ] Approve final legal retention periods and rehearse encrypted backup restore in an isolated deployment environment.
- [ ] Run a two-person field test: PC send, mobile receive/reply, second-device resume, workout share/save, mute, disconnect, and block.
- [x] Add and execute a guarded real-API field runner for two disposable accounts and four device identities against all 23 migrations on native PostgreSQL 16.14.
- [x] Run secrets, exercise validation, lint, all 258 automated tests, TypeScript, production build, focused Together desktop/mobile browser proof, and unchanged performance budgets.
- [x] Add a transactional migration `0023` rollback that refuses to discard retained post-deletion direct-message history, with an executable contract check.
- [x] Rehearse migration `0023` rollback and reapply against a disposable native PostgreSQL 16.14 instance.
- [ ] Rehearse release rollback and migration `0023` restore against the deployment PostgreSQL environment.
- [x] Obtain explicit approval before any Git push or VPS deployment.

## Release definition

North 0.8 is ready when two people can continue the same private conversation across devices, participate safely in a small set of useful rooms, receive clear opt-in notifications, and deliberately share a workout without gaining ambient access to each other's lives in North.