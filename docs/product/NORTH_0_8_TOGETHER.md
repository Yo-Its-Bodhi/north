# North 0.8 — Together

## Product intent

Together is North's private, continual conversation space. It should feel like the useful part of an old messenger: a small list of people, conversations that remain open, messages waiting when someone returns, and an easy way to pick up where both people left off.

It is correspondence, not a social feed.

## Core product rule

Connecting with someone never merges timelines, records, recommendations, Nova context, health data, or analytics. A connection grants no automatic access to either person's North account.

Sharing is always a deliberate message from one person to another. Nothing appears in a conversation merely because it was recorded in North.

## Member experience

### Conversations

- Together opens to a private conversation list, ordered by recent activity.
- Each row shows the person, latest message preview, time, unread state, and muted state.
- Opening a row resumes the complete conversation rather than starting a temporary session.
- Either person can leave messages while the other is away. Messages remain available across signed-in devices.
- A conversation supports text first, with delivery, retry, offline queueing, pagination, and an honest empty state.
- Read receipts, typing indicators, presence, and notification previews are separate opt-in controls. North must not create a new form of surveillance to make chat feel alive.
- Search may find a person or text in the member's own conversations. It must never search another person's private North record.

### Deliberate sharing

A member may deliberately send a supported North item into one conversation:

- a workout template
- a milestone or achievement
- a training recap
- a Journey photo selected for sharing
- a short progress update
- encouragement or an invitation to do something together

The send review must show the exact recipient and visible content before sending. Shared items become conversation cards; they do not enter either person's Journey timeline automatically. A recipient may save a shared workout as an independent copy, but receiving it does not change their plan or record.

Every shared item shows who can see it. The sender can remove the shared card from the conversation later without deleting the private source record. Deleting the private source must not silently make a different claim about what the recipient previously received; North should show an unavailable or removed state honestly.

### Relationship controls

- A connection starts with an explicit request and acceptance.
- Members can decline, disconnect, block, report, mute, or delete their local conversation view.
- Disconnecting stops new messages but does not silently delete either person's retained history.
- Blocking stops new contact immediately and hides presence or receipt signals.
- Notification settings exist per conversation and globally.
- There are no follower counts, likes, public profiles, suggested popularity, engagement streaks, or public feed.

## North Updates

Owner announcements are a separate product channel, not a private member conversation and not an impersonation of one.

- North Updates appears as a clearly signed system conversation in the same inbox.
- The owner console can draft, preview, schedule, target, publish, correct, archive, and audit notices about bugs, incidents, fixes, releases, and new features.
- Announcements are one-to-many and read-only unless a distinct support reply path is deliberately added later.
- Members can control feature and release notifications separately from direct-message notifications. Essential security or service notices must be narrowly defined and visibly labelled.
- Publishing an announcement never grants the owner access to member conversations.

## Privacy and trust boundary

- Private messages are accessible in the product only to their participants. The admin console must not provide a general conversation browser.
- Operational logs exclude message bodies, shared photos, and private record content.
- Reports preserve only the minimum content deliberately submitted for review.
- Retention, export, account deletion, participant deletion, and legal-access behavior must be defined before release.
- North must not claim end-to-end encryption unless the released transport, key management, device recovery, and multi-device behavior actually provide it.
- Nova never reads Together conversations or uses them as memory unless a member explicitly submits specific text to Nova through a separate review step.

## 0.8 implementation checklist

### Foundation

- [ ] Define connection, participant, conversation, message, receipt, block, report, and announcement schemas.
- [ ] Add migrations with participant-scoped access rules, indexes, retention fields, and immutable audit events for administrative publishing.
- [ ] Build authenticated connection-request, accept, decline, disconnect, block, mute, conversation-list, history, send, retry, and delete endpoints.
- [ ] Add idempotent client message IDs, cursor pagination, optimistic delivery states, offline outbox behavior, and multi-device reconciliation.
- [ ] Threat-model authorization, recipient enumeration, spam, replay, attachment access, rate limits, blocking bypasses, and notification leakage.

### Member product

- [ ] Add Together as a member destination with conversation list, unread counts, latest previews, search, and resume behavior.
- [ ] Build the persistent one-to-one thread with text messages, timestamps, delivery states, retry, pagination, and accessible keyboard/mobile behavior.
- [ ] Add connection requests and clear decline, disconnect, block, report, and mute controls.
- [ ] Add deliberate share review and conversation cards for workouts, milestones, recaps, selected photos, updates, and encouragement.
- [ ] Keep all received items out of Journey, Training, Nova, recommendations, and analytics unless the recipient performs a separate explicit action.
- [ ] Add independent controls for message notifications, previews, sounds, read receipts, typing, and presence.

### Owner announcements

- [ ] Complete the admin announcement composer with audience, preview, schedule, expiry, correction, archive, and publish confirmation.
- [ ] Render a clearly signed, read-only North Updates conversation in the member inbox.
- [ ] Separate direct-message preferences from release, feature, incident, service, and security notice preferences.
- [ ] Audit every publish, edit, correction, audience change, and archive action without storing private member conversation content.

### Release proof

- [ ] Prove with authorization tests that connections cannot read timelines, records, health data, Nova data, recommendations, analytics, or other conversations.
- [ ] Test send/retry/order/deduplication across offline use, reconnects, two devices, blocked users, disconnects, deletions, and account deletion.
- [ ] Test notification privacy with locked-screen previews disabled and enabled.
- [ ] Complete abuse-reporting, data export, retention, deletion, backup, restore, accessibility, and incident-response reviews.
- [ ] Run a two-person field test focused on leaving messages, returning later, resuming naturally, and deliberately sharing one experience.

## Release line

North 0.8 is ready when two people can stay in touch over time without either person gaining ambient access to the other's life in North.