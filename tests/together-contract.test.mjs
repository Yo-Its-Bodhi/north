import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../db/migrations/0020_together_foundation.sql", import.meta.url), "utf8");
const moderationMigration = readFileSync(new URL("../db/migrations/0021_together_moderation.sql", import.meta.url), "utf8");
const pushMigration = readFileSync(new URL("../db/migrations/0022_together_push.sql", import.meta.url), "utf8");
const deletionMigration = readFileSync(new URL("../db/migrations/0023_together_account_deletion.sql", import.meta.url), "utf8");
const deletionRollback = readFileSync(new URL("../db/rollback/0023_together_account_deletion.sql", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const plan = readFileSync(new URL("../v.8.md", import.meta.url), "utf8");
const routes = readFileSync(new URL("../server/together-routes.mjs", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
const communityRoutes = readFileSync(new URL("../server/community-routes.mjs", import.meta.url), "utf8");
const togetherApi = readFileSync(new URL("../src/data/togetherApi.ts", import.meta.url), "utf8");
const togetherClient = readFileSync(new URL("../src/Together.tsx", import.meta.url), "utf8");
const adminClient = readFileSync(new URL("../src/Admin.tsx", import.meta.url), "utf8");

test("Together models durable cross-device conversations separately from sync documents", () => {
  for (const table of [
    "together_connections",
    "together_rooms",
    "together_room_members",
    "together_messages",
    "together_message_receipts",
    "together_blocks",
    "together_reports",
    "together_announcements",
    "together_announcement_receipts",
    "together_notification_preferences",
    "together_announcement_audit",
  ]) assert.match(migration, new RegExp(`create table if not exists ${table}`));
  assert.doesNotMatch(migration, /sync_documents/i);
});

test("Together messages are idempotent, bounded, ordered, and receipt-aware", () => {
  assert.match(migration, /client_message_id uuid not null/);
  assert.match(migration, /unique \(sender_user_id,client_message_id\)/);
  assert.match(migration, /char_length\(body\) <= 4000/);
  assert.match(migration, /together_messages\(room_id,created_at desc,id desc\)/);
  assert.match(migration, /read_at timestamptz/);
  assert.match(migration, /reply_to_message_id uuid references together_messages/);
  assert.match(routes, /message\.id=\$1 and message\.room_id=\$2/);
  assert.match(routes, /replyTo: row\.reply_to_message_id/);
  assert.match(togetherApi, /replyToMessageId\?: string \| null/);
  assert.match(togetherClient, /className="together-reply-quote"/);
  assert.match(togetherClient, /aria-label="Delete message"/);
  assert.match(togetherClient, /account\?\.user\.isAdmin \|\| isCanonicalOwner/);
});

test("Together provides curated public, help, updates, and private trainer spaces", () => {
  assert.match(migration, /'direct','general','help','updates','trainer'/);
  assert.match(migration, /'general','General'/);
  assert.match(migration, /'help','Help'/);
  assert.match(migration, /'north-updates','North Updates'/);
  assert.match(routes, /Array\.isArray\(request\.body\?\.usernames\)/);
  assert.match(routes, /usernames\.length > 20/);
  assert.match(routes, /\/v1\/together\/rooms\/:id\/members/);
  assert.match(routes, /access\.kind !== "trainer" \|\| access\.role !== "owner"/);
  assert.match(togetherApi, /inviteTogetherTrainerMember/);
  assert.match(togetherApi, /removeTogetherTrainerMember/);
  assert.match(togetherClient, /Invite up to 20 people\. Only invited members can join/);
  assert.match(togetherClient, /className="together-member-invite"/);
  assert.match(plan, /invite-only/);
});

test("Together keeps notification and surveillance controls independent", () => {
  for (const preference of [
    "direct_messages",
    "room_messages",
    "trainer_messages",
    "feature_announcements",
    "release_announcements",
    "preview_message_text",
    "read_receipts",
    "typing_indicators",
    "presence",
  ]) assert.match(migration, new RegExp(`${preference} boolean`));
});

test("the 0.8 release gate forbids Git and VPS publication before approval", () => {
  assert.match(plan, /Do not push it to Git or deploy it to the VPS before explicit approval/);
  assert.match(plan, /PC send, mobile receive\/reply, second-device resume/);
});

test("Together routes require account authentication and never trust caller owner IDs", () => {
  assert.match(server, /registerTogetherRoutes\(app, \{ pool \}\)/);
  assert.ok((routes.match(/preHandler: app\.authenticate/g) ?? []).length >= 10);
  assert.doesNotMatch(routes, /request\.body\?\.owner/i);
  assert.match(routes, /rm\.owner_user_id=\$1/);
  assert.match(routes, /owner_user_id=\$2 and rm\.status='active'/);
});

test("Together exposes persistent inbox, history, idempotent send, unread, and relationship controls", () => {
  for (const endpoint of [
    "/v1/together/inbox",
    "/v1/together/rooms/:id/messages",
    "/v1/together/rooms/:id/read",
    "/v1/together/requests/:id/respond",
    "/v1/together/trainer-rooms",
    "/v1/together/connections/:id/block",
  ]) assert.match(routes, new RegExp(endpoint.replaceAll("/", "\\/")));
  assert.match(routes, /client message ID was already used for different content/i);
  assert.match(routes, /decodeCursor/);
  assert.match(routes, /together_message_receipts/);
  assert.match(routes, /together_blocks/);
  assert.match(routes, /connection\.status='accepted'/);
});

test("Together exposes participant-scoped reports and independent global preferences", () => {
  assert.match(routes, /\/v1\/together\/rooms\/:id\/reports/);
  assert.match(routes, /\/v1\/together\/preferences/);
  assert.match(routes, /findRoomAccess\(pool, request\.params\.id, request\.user\.sub\)/);
  assert.match(routes, /cleanText\(request\.body\?\.submittedContext, 4000\)/);
  assert.match(routes, /reporter_user_id,reported_user_id,room_id,message_id,category,submitted_context/);
  assert.doesNotMatch(routes, /request\.body\?\.reportedUserId/);
  assert.match(routes, /access\.kind === "direct"[\s\S]+owner_user_id<>\$2/);
  assert.match(routes, /typeof request\.body\?\.\[field\] === "boolean"/);
  for (const helper of ["getTogetherPreferences", "updateTogetherPreferences"]) assert.match(togetherApi, new RegExp(`export const ${helper}`));
  for (const preference of ["direct_messages", "room_messages", "trainer_messages", "feature_announcements", "release_announcements", "incident_notices", "service_notices", "security_notices", "preview_message_text", "sounds", "read_receipts", "typing_indicators", "presence"]) assert.match(togetherClient, new RegExp(preference));
  assert.match(togetherClient, /role="switch"/);
  assert.match(togetherClient, /Enable on this device/);
});

test("Together can hide only the caller's local direct-conversation view", () => {
  assert.match(routes, /\/v1\/together\/rooms\/:id\/view/);
  assert.match(routes, /member\.owner_user_id=\$2/);
  assert.match(routes, /room\.kind='direct'/);
  assert.match(routes, /access_member\.hidden_before is null or m\.created_at>access_member\.hidden_before/);
  assert.match(routes, /rm\.hidden_before is null or r\.last_message_at>rm\.hidden_before/);
});

test("Together streams committed messages to every active member device", () => {
  assert.match(routes, /\/v1\/together\/events.*preHandler: app\.authenticate/);
  assert.match(routes, /text\/event-stream/);
  assert.match(routes, /request\.raw\.once\("close"/);
  assert.match(routes, /select owner_user_id from together_room_members where room_id=\$1 and status='active'/);
  assert.match(routes, /client\.query\("commit"\)[\s\S]+publish\(recipient\.owner_user_id, "message", mapped\)/);
  assert.match(routes, /publish\(recipient\.owner_user_id, "unread"/);
  assert.match(routes, /publish\(member\.owner_user_id, "membership"/);
  assert.match(routes, /preferences\.rows\[0\]\?\.read_receipts/);
  assert.match(routes, /publish\(member\.owner_user_id, "receipt"/);
  assert.match(togetherApi, /fetch\(`\$\{NORTH_API_BASE\}\$\{togetherPath\}\/events`/);
  assert.match(togetherApi, /Authorization: `Bearer \$\{token\}`/);
  assert.match(togetherApi, /response\.body\.getReader\(\)/);
  assert.match(togetherClient, /streamTogetherEvents\(controller\.signal/);
  assert.match(togetherClient, /items\.some\(\(item\) => item\.id === message\.id\)/);
  assert.match(togetherClient, /setTimeout\(resolve, 3000\)/);
});

test("Together surfaces connection requests and reconciles an open room", () => {
  assert.match(routes, /publish\(recipient\.id, "connection_request"/);
  assert.match(togetherClient, /notificationCount = requests\.length \+ unreadRooms\.length/);
  assert.match(togetherClient, /wants to connect/);
  assert.match(togetherClient, /message\.roomId === selectedIdRef\.current/);
  assert.match(togetherClient, /event === "unread"[\s\S]+reconcileOpenRoom\(unread\.roomId\)/);
  assert.match(togetherClient, /\.together-actions button\{width:100%!important;height:auto!important/);
});

test("Together moderation reviews only deliberately submitted report context", () => {
  assert.match(moderationMigration, /reviewed_by_user_id uuid references app_users/);
  assert.match(moderationMigration, /resolution_note text/);
  assert.match(moderationMigration, /appeal_note text/);
  assert.match(routes, /\/v1\/admin\/together\/reports.*preHandler: app\.requireAdmin/);
  assert.match(routes, /\/v1\/together\/reports\/:id\/appeal.*preHandler: app\.authenticate/);
  assert.match(routes, /report\.submitted_context/);
  assert.doesNotMatch(routes, /admin\/together[\s\S]+message\.body/);
  assert.match(routes, /reporter_user_id=\$3 and status in \('resolved','dismissed'\)/);
});

test("North Updates publishing is confirmed, audited, and audience scoped", () => {
  for (const action of ["schedule", "publish", "correct", "archive", "audit"]) assert.match(routes, new RegExp(`announcements\\/:id\\/${action}`));
  assert.match(routes, /request\.body\?\.confirmed !== true/);
  assert.match(routes, /together_announcement_audit/);
  assert.match(routes, /cleanAudience/);
  assert.match(routes, /together_announcement_receipts announcement_receipt/);
  assert.match(routes, /announcement_receipt\.owner_user_id=\$2/);
  assert.match(routes, /publish\(recipient\.id, "announcement", mapped\)/);
  assert.match(routes, /status='scheduled' and scheduled_at<=now\(\)/);
  assert.match(routes, /app\.addHook\("onClose"/);
  assert.match(routes, /if \(!recipients\.rowCount\).*rollback/);
  assert.doesNotMatch(routes, /North Updates[\s\S]+private member conversation/);
});

test("public-room moderation is scoped and enforced in the send path", () => {
  assert.match(moderationMigration, /slow_mode_seconds integer/);
  assert.match(moderationMigration, /last_posted_at timestamptz/);
  assert.match(routes, /findRoomModerator/);
  assert.match(routes, /\["general", "help"\]\.includes\(access\.kind\)/);
  assert.match(routes, /Slow mode is active/);
  assert.match(routes, /rm\.last_posted_at/);
  assert.match(routes, /last_posted_at=\$1/);
  assert.match(routes, /\/v1\/together\/rooms\/:id\/members\/:userId/);
  assert.match(routes, /\/v1\/admin\/together\/rooms\/:id\/members\/:userId\/role/);
  assert.match(routes, /role='member' returning owner_user_id/);
});

test("Together export is self-service and participant scoped", () => {
  assert.match(routes, /\/v1\/together\/export.*preHandler: app\.authenticate/);
  assert.match(routes, /member\.owner_user_id=\$1/);
  assert.match(routes, /where reporter_user_id=\$1/);
  assert.match(routes, /announcement_receipt\.owner_user_id=\$1/);
  assert.doesNotMatch(routes, /\/v1\/admin\/together\/export/);
  assert.match(routes, /together_connections[\s\S]+order by requested_at/);
  assert.doesNotMatch(routes, /together_connections[\s\S]{0,300}order by created_at/);
  assert.match(migration, /sender_user_id uuid references app_users\(id\) on delete set null/);
  assert.match(migration, /owner_user_id uuid not null references app_users\(id\) on delete cascade/);
});

test("workout sharing uses a reviewed snapshot and explicit independent recipient copy", () => {
  assert.match(communityRoutes, /export function workoutSnapshot/);
  assert.match(routes, /const template = workoutSnapshot\(sharedPayload\?\.template\)/);
  assert.match(routes, /sharedPayload = \{ type: "workout-template", template \}/);
  assert.match(routes, /\/v1\/together\/messages\/:id\/workout-copy/);
  assert.match(routes, /message\.sender_user_id === request\.user\.sub/);
  assert.match(routes, /findRoomAccess\(pool, message\.room_id, request\.user\.sub\)/);
  assert.match(routes, /template: \{ \.\.\.template, id: copyId, source: "personal" \}/);
  assert.doesNotMatch(routes, /workout-copy[\s\S]+sync_documents/);
});

test("self-contained Together cards accept only reviewed text and cannot mutate private records", () => {
  assert.match(routes, /sharedCardSnapshot/);
  assert.match(routes, /\["milestone", "recap", "progress", "encouragement", "invitation"\]\.includes\(kind\)/);
  assert.match(routes, /cleanText\(value\?\.title, 80\)/);
  assert.match(routes, /cleanText\(value\?\.detail, 500\)/);
  assert.doesNotMatch(routes, /sharedCardSnapshot[\s\S]{0,500}(sync_documents|north_documents|nova_|health_)/);
  for (const kind of ["progress", "encouragement", "invitation"]) assert.match(togetherClient, new RegExp(`setCardKind\\(\"${kind}\"\\)`));
  assert.match(togetherClient, /Visible to \{selected\.name\}/);
  assert.match(togetherClient, /together-shared-card/);
  assert.doesNotMatch(togetherClient, /together-shared-card[\s\S]{0,300}(persistAccountJson|northRepository\.put)/);
  assert.match(routes, /sharedPhotoSnapshot/);
  assert.match(routes, /imageDataUrl\.length <= 700_000/);
  assert.match(routes, /\^data:image/);
  assert.match(togetherClient, /card\.imageDataUrl && <img/);
  assert.match(togetherClient, /shareCard\.imageDataUrl/);
  assert.match(routes, /\/v1\/together\/messages\/:id.*message\.sender_user_id=\$2/s);
  assert.match(routes, /shared_payload=null,removed_at=now\(\)/);
  assert.match(togetherApi, /export const removeTogetherMessage/);
  assert.match(togetherClient, /removeMessage/);
});

test("Web Push subscriptions are opt-in, device bound, and owner scoped", () => {
  assert.match(pushMigration, /create table if not exists together_push_subscriptions/);
  assert.match(pushMigration, /owner_user_id uuid not null references app_users\(id\) on delete cascade/);
  assert.match(pushMigration, /device_id uuid not null references devices\(id\) on delete cascade/);
  assert.match(routes, /NORTH_VAPID_PUBLIC_KEY/);
  assert.match(routes, /\/v1\/together\/push\/subscriptions.*preHandler: app\.authenticate/);
  assert.match(routes, /request\.device\.id/);
  assert.match(routes, /where together_push_subscriptions\.owner_user_id=\$1/);
  assert.match(routes, /id=\$1 and owner_user_id=\$2 and revoked_at is null/);
  assert.match(routes, /join devices device.*device\.revoked_at is null/);
  assert.match(routes, /pushPreferenceByRoom/);
  assert.match(routes, /pushPreferenceByAnnouncement/);
  assert.match(routes, /feature: "feature_announcements"/);
  assert.match(routes, /preference\.preview_message_text/);
  assert.match(routes, /member\.notification_level<>'muted'/);
  assert.match(routes, /member\.muted_until<now\(\)/);
  assert.match(routes, /Open North to view this update\./);
  assert.match(routes, /url = "\/\?open=together"/);
  assert.match(routes, /\[404, 410\].*revoked_at=now\(\)/s);
  assert.match(serviceWorker, /addEventListener\("push"/);
  assert.match(serviceWorker, /addEventListener\("notificationclick"/);
  assert.match(serviceWorker, /\/\?open=together/);
  assert.match(togetherClient, /new URLSearchParams\(location\.search\)\.get\("room"\)/);
});

test("Together exposes member relationship and safety controls in each eligible thread", () => {
  for (const helper of ["setTogetherRoomNotifications", "hideTogetherRoom", "disconnectTogetherConnection", "blockTogetherConnection", "reportTogetherRoom"]) assert.match(togetherApi, new RegExp(`export const ${helper}`));
  for (const action of ["mute", "hide", "disconnect", "block"]) assert.match(togetherClient, new RegExp(`roomAction\\(\\"${action}\\"\\)`));
  for (const label of ["Report", "Hide history", "Disconnect", "Block"]) assert.match(togetherClient, new RegExp(`>${label}<`));
  assert.match(togetherClient, /window\.confirm\(warnings\[action\]\)/);
  assert.match(togetherClient, /What should North review\?/);
});

test("Together room information is participant scoped without exposing a public member directory", () => {
  assert.match(routes, /\/v1\/together\/rooms\/:id\/info/);
  assert.match(routes, /findRoomAccess\(pool, request\.params\.id, request\.user\.sub\)/);
  assert.match(routes, /if \(\["direct", "trainer"\]\.includes\(access\.kind\)\)/);
  assert.match(routes, /member\.status in \('active','invited'\)/);
  assert.doesNotMatch(routes, /member\.created_at/);
  assert.match(togetherApi, /export const getTogetherRoomInfo/);
  assert.match(togetherClient, />Conversation info</);
  assert.match(togetherClient, /roomInfo\.members\.map/);
});

test("Together exposes inbox filtering and cursor-based earlier history", () => {
  assert.match(togetherClient, /placeholder="Find a conversation"/);
  assert.match(togetherClient, /visibleRooms = rooms\.filter/);
  assert.match(togetherClient, /listTogetherMessages\(selectedId, nextCursor\)/);
  assert.match(togetherClient, /Earlier messages/);
  assert.match(togetherClient, /setMessages\(\(items\) => \[\.\.\.result\.messages\.filter/);
});

test("the owner console manages safety reports and the signed announcement lifecycle", () => {
  assert.match(adminClient, /id: "together", label: "Together"/);
  assert.match(adminClient, /Private conversations are not browsable/);
  for (const action of ["edit", "schedule", "publish", "correct", "archive", "audit"]) assert.match(adminClient, new RegExp(`announcementAction\\(item, \\"${action}\\"\\)`));
  assert.match(adminClient, /confirmed: true/);
  assert.match(adminClient, /reviewTogetherReport/);
});

test("Together has an in-app notification center driven by canonical unread rooms", () => {
  assert.match(togetherClient, /const unreadRooms = rooms\.filter/);
  assert.match(togetherClient, /IN-APP NOTIFICATIONS/);
  assert.match(togetherClient, /unreadRooms\.map/);
  assert.match(togetherClient, /setSelectedId\(room\.id\)/);
  assert.match(togetherClient, /kind-\$\{room\.kind\}/);
});

test("Together account deletion anonymizes retained history without leaving a sendable connection", () => {
  assert.match(migration, /sender_user_id uuid references app_users\(id\) on delete set null/);
  assert.match(migration, /owner_user_id uuid not null references app_users\(id\) on delete cascade/);
  assert.match(migration, /requester_user_id uuid not null references app_users\(id\) on delete cascade/);
  assert.match(deletionMigration, /pg_get_constraintdef\(oid\).*connection_id is not null/s);
  assert.match(deletionMigration, /kind='direct' and visibility='private'/);
  assert.doesNotMatch(deletionMigration, /kind='direct' and connection_id is not null/);
  assert.match(routes, /access\.kind === "direct" && !access\.connection_id/);
});

test("Together account-deletion migration has a guarded, non-destructive rollback", () => {
  assert.match(deletionRollback, /^--[\s\S]*\bbegin;/i);
  assert.match(deletionRollback, /kind='direct' and connection_id is null/);
  assert.match(deletionRollback, /raise exception 'Cannot roll back 0023/);
  assert.match(deletionRollback, /kind='direct' and connection_id is not null and visibility='private'/);
  assert.doesNotMatch(deletionRollback, /\b(delete from|drop table|truncate)\b/i);
  assert.match(deletionRollback, /\bcommit;\s*$/i);
});

test("Together creation actions expose progress and unsupported-server feedback", () => {
  assert.match(togetherApi, /Together is not available on this North server yet\./);
  assert.match(togetherClient, /setCreatingConversation\(true\)/);
  assert.match(togetherClient, /Sending connection request…/);
  assert.match(togetherClient, /Creating private trainer room…/);
  assert.match(togetherClient, /disabled=\{creatingConversation\}/);
});