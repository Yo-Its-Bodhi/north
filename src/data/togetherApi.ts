import { NORTH_API_BASE, northDeviceHeaders, withFreshAccess } from "./account";
import type { WorkoutTemplate } from "./workouts";

export type TogetherPerson = { id: string; username: string; displayName: string };
export type TogetherRoomKind = "direct" | "general" | "help" | "updates" | "trainer";
export type TogetherMessageKind = "text" | "workout" | "milestone" | "recap" | "photo" | "progress" | "encouragement" | "invitation" | "system";
export type TogetherShareCard = { kind: "milestone" | "recap" | "photo"; title: string; detail: string; imageDataUrl?: string };
export type TogetherReplyPreview = { id: string; body: string; sender: TogetherPerson | null };

export type TogetherRoom = {
  id: string;
  connectionId?: string | null;
  slug?: string | null;
  name: string;
  kind: TogetherRoomKind;
  description: string;
  role: "owner" | "trainer" | "member" | "moderator";
  status: "invited" | "active" | "left" | "removed";
  notificationLevel: "all" | "mentions" | "muted";
  mutedUntil?: string | null;
  peer?: TogetherPerson | null;
  latestMessage?: { id: string; senderUserId?: string | null; kind: TogetherMessageKind; body: string; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt?: string | null;
};

export type TogetherMessage = {
  id: string;
  roomId: string;
  clientMessageId: string;
  sender: TogetherPerson | null;
  kind: TogetherMessageKind;
  body: string;
  sharedPayload?: unknown;
  replyToMessageId?: string | null;
  replyTo?: TogetherReplyPreview | null;
  removedAt?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  delivery?: "sending" | "failed";
};

export type TogetherConnectionRequest = { id: string; requestedAt: string; person: TogetherPerson };
export type TogetherRoomInfo = { room: { id: string; name: string; description: string; kind: TogetherRoomKind; role: TogetherRoom["role"]; memberCount: number }; members: Array<TogetherPerson & { role: TogetherRoom["role"]; status: TogetherRoom["status"] }> };
export type TogetherPreferences = {
  direct_messages: boolean;
  room_messages: boolean;
  trainer_messages: boolean;
  feature_announcements: boolean;
  release_announcements: boolean;
  incident_notices: boolean;
  service_notices: boolean;
  security_notices: boolean;
  preview_message_text: boolean;
  sounds: boolean;
  read_receipts: boolean;
  typing_indicators: boolean;
  presence: boolean;
};

async function togetherRequest<T>(path: string, init: RequestInit = {}) {
  return withFreshAccess(async (token) => {
    const response = await fetch(`${NORTH_API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders(), ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
    if (response.status === 204) return undefined as T;
    const result = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) {
      if (response.status === 404 && String(result.error ?? "").toLowerCase() === "not found") {
        throw new Error("Together is not available on this North server yet.");
      }
      throw new Error(result.error || `Together returned ${response.status}`);
    }
    return result;
  });
}

const togetherPath = "/v1/together";
const jsonRequest = (body: unknown, method = "POST") => ({ method, body: JSON.stringify(body) });
export const listTogetherInbox = () => togetherRequest<{ rooms: TogetherRoom[] }>(`${togetherPath}/inbox`);
export const listTogetherRequests = () => togetherRequest<{ requests: TogetherConnectionRequest[] }>(`${togetherPath}/requests`);
export const requestTogetherConnection = (username: string) => togetherRequest(`${togetherPath}/requests`, jsonRequest({ username }));
export const respondTogetherConnection = (requestId: string, decision: "accept" | "decline") => togetherRequest<{ connection: { id: string; status: string; roomId: string | null } }>(`${togetherPath}/requests/${requestId}/respond`, jsonRequest({ decision }));
export const listTogetherMessages = (roomId: string, before?: string) => togetherRequest<{ room: TogetherRoom; messages: TogetherMessage[]; nextCursor: string | null }>(`${togetherPath}/rooms/${roomId}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`);
export const getTogetherRoomInfo = (roomId: string) => togetherRequest<TogetherRoomInfo>(`${togetherPath}/rooms/${roomId}/info`);
export const sendTogetherMessage = (roomId: string, input: { clientMessageId: string; body: string; kind?: TogetherMessageKind; sharedPayload?: unknown; replyToMessageId?: string | null }) => togetherRequest<{ message: TogetherMessage; deduplicated: boolean }>(`${togetherPath}/rooms/${roomId}/messages`, jsonRequest(input));
export const markTogetherRoomRead = (roomId: string) => togetherRequest<void>(`${togetherPath}/rooms/${roomId}/read`, jsonRequest(null));
export const prepareTogetherWorkoutCopy = (messageId: string, copyId: string) => togetherRequest<{ template: WorkoutTemplate }>(`${togetherPath}/messages/${messageId}/workout-copy`, jsonRequest({ copyId }));
export const removeTogetherMessage = (messageId: string) => togetherRequest<void>(`${togetherPath}/messages/${messageId}`, { method: "DELETE" });
export const getTogetherPushConfig = () => togetherRequest<{ enabled: boolean; publicKey: string | null }>(`${togetherPath}/push/config`);
export const registerTogetherPush = (subscription: PushSubscriptionJSON) => togetherRequest(`${togetherPath}/push/subscriptions`, jsonRequest(subscription));
export const getTogetherPreferences = () => togetherRequest<{ preferences: TogetherPreferences }>(`${togetherPath}/preferences`);
export const updateTogetherPreferences = (changes: Partial<TogetherPreferences>) => togetherRequest<{ preferences: TogetherPreferences }>(`${togetherPath}/preferences`, jsonRequest(changes, "PATCH"));
export const streamTogetherEvents = (signal: AbortSignal, receive: (event: string, data: unknown) => void) => withFreshAccess(async (token) => {
  const response = await fetch(`${NORTH_API_BASE}${togetherPath}/events`, { signal, headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders() } });
  if (!response.ok || !response.body) throw Object.assign(new Error("Together live updates are unavailable."), { status: response.status });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = frame.match(/^event: (.+)$/m)?.[1];
      const data = frame.match(/^data: (.+)$/m)?.[1];
      if (event && data) receive(event, JSON.parse(data));
    }
  }
});
export const setTogetherRoomNotifications = (roomId: string, level: TogetherRoom["notificationLevel"]) => togetherRequest(`${togetherPath}/rooms/${roomId}/notifications`, jsonRequest({ level }, "PATCH"));
export const hideTogetherRoom = (roomId: string) => togetherRequest<void>(`${togetherPath}/rooms/${roomId}/view`, { method: "DELETE" });
export const disconnectTogetherConnection = (connectionId: string) => togetherRequest<void>(`${togetherPath}/connections/${connectionId}`, { method: "DELETE" });
export const blockTogetherConnection = (connectionId: string) => togetherRequest<void>(`${togetherPath}/connections/${connectionId}/block`, jsonRequest({ reason: "Blocked from conversation controls" }));
export const reportTogetherRoom = (roomId: string, category: string, submittedContext: string) => togetherRequest(`${togetherPath}/rooms/${roomId}/reports`, jsonRequest({ category, submittedContext }));
export const joinTogetherRoom = (roomId: string) => togetherRequest(`${togetherPath}/rooms/${roomId}/join`, jsonRequest(null));
export const createTogetherTrainerRoom = (input: { usernames: string[]; name: string; description?: string; invitedRole: "trainer" | "member" }) => togetherRequest<{ room: { id: string; name: string; kind: "trainer" }; invited: TogetherPerson[] }>(`${togetherPath}/trainer-rooms`, jsonRequest(input));
export const inviteTogetherTrainerMember = (roomId: string, username: string, role: "trainer" | "member" = "member") => togetherRequest<{ member: TogetherPerson & { role: "trainer" | "member"; status: "invited" } }>(`${togetherPath}/rooms/${roomId}/members`, jsonRequest({ username, role }));
export const removeTogetherTrainerMember = (roomId: string, userId: string) => togetherRequest<void>(`${togetherPath}/rooms/${roomId}/members/${userId}`, jsonRequest({ reason: "Removed by the private room owner." }, "DELETE"));