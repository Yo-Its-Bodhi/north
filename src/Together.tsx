import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, Bell, CalendarPlus, Check, Ellipsis, Heart, MessageCircle, Plus, Reply, RotateCcw, Search, Send, Settings, Trash2, TrendingUp, UsersRound, X } from "lucide-react";
import { readNorthSession } from "./data/account";
import { northRepository } from "./data/northDb";
import "./together.css";
import {
  blockTogetherConnection,
  createTogetherTrainerRoom,
  disconnectTogetherConnection,
  hideTogetherRoom,
  reportTogetherRoom,
  getTogetherPushConfig,
  getTogetherPreferences,
  getTogetherRoomInfo,
  inviteTogetherTrainerMember,
  joinTogetherRoom,
  listTogetherInbox,
  listTogetherMessages,
  listTogetherRequests,
  markTogetherRoomRead,
  prepareTogetherWorkoutCopy,
  removeTogetherMessage,
  removeTogetherTrainerMember,
  requestTogetherConnection,
  registerTogetherPush,
  respondTogetherConnection,
  sendTogetherMessage,
  setTogetherRoomNotifications,
  streamTogetherEvents,
  updateTogetherPreferences,
  type TogetherConnectionRequest,
  type TogetherMessage,
  type TogetherMessageKind,
  type TogetherPreferences,
  type TogetherReplyPreview,
  type TogetherRoom,
  type TogetherRoomInfo,
  type TogetherShareCard,
} from "./data/togetherApi";
import type { WorkoutTemplate } from "./data/workouts";

type Props = { onUnreadChange: (count: number) => void; shareWorkout?: WorkoutTemplate | null; shareCard?: TogetherShareCard | null; onShareComplete?: () => void; onSaveWorkout?: (template: WorkoutTemplate) => void };
type CreateMode = "closed" | "connection" | "trainer";
type SimpleCardKind = "progress" | "encouragement" | "invitation";
type QueuedMessage = { clientMessageId: string; roomId: string; body: string; createdAt: string; kind?: TogetherMessageKind; sharedPayload?: unknown; replyToMessageId?: string | null; replyTo?: TogetherReplyPreview | null };
type PreferenceKey = keyof TogetherPreferences;
const preferenceGroups: Array<{ title: string; description: string; items: Array<{ key: PreferenceKey; label: string }> }> = [
  { title: "Conversations", description: "Choose which kinds of new messages may notify this device.", items: [
    { key: "direct_messages", label: "Direct messages" }, { key: "room_messages", label: "General and Help" }, { key: "trainer_messages", label: "Trainer rooms" },
  ] },
  { title: "North Updates", description: "Control each signed announcement category independently.", items: [
    { key: "feature_announcements", label: "Features" }, { key: "release_announcements", label: "Releases" }, { key: "incident_notices", label: "Incidents" }, { key: "service_notices", label: "Service notices" }, { key: "security_notices", label: "Security notices" },
  ] },
  { title: "Privacy and activity", description: "These signals stay off unless you choose otherwise.", items: [
    { key: "preview_message_text", label: "Show message text in notifications" }, { key: "sounds", label: "Notification sounds" }, { key: "read_receipts", label: "Share read receipts" }, { key: "typing_indicators", label: "Share typing indicators" }, { key: "presence", label: "Share active presence" },
  ] },
];
const outboxCollection = "together-outbox";
const queuedMessages = async (roomId?: string) => (await northRepository.list<QueuedMessage>(outboxCollection)).map((document) => document.data).filter((message) => !roomId || message.roomId === roomId);
const senderTone = (id?: string) => id ? [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 4 : 0;

export default function Together({ onUnreadChange, shareWorkout, shareCard, onShareComplete, onSaveWorkout }: Props) {
  const account = readNorthSession();
  const [rooms, setRooms] = useState<TogetherRoom[]>([]);
  const [requests, setRequests] = useState<TogetherConnectionRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TogetherMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<TogetherMessage | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>("closed");
  const [username, setUsername] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("other");
  const [reportContext, setReportContext] = useState("");
  const [inboxQuery, setInboxQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<TogetherPreferences | null>(null);
  const [savingPreference, setSavingPreference] = useState<PreferenceKey | null>(null);
  const [roomInfo, setRoomInfo] = useState<TogetherRoomInfo | null>(null);
  const [memberUsername, setMemberUsername] = useState("");
  const [savingMember, setSavingMember] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cardKind, setCardKind] = useState<SimpleCardKind | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDetail, setCardDetail] = useState("");
  const transcript = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const selected = rooms.find((room) => room.id === selectedId) ?? null;
  useLayoutEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const showError = (error: unknown) => setStatus(error instanceof Error ? error.message : "Together unavailable.");

  async function refreshInbox() {
    try {
      const [inbox, pending] = await Promise.all([listTogetherInbox(), listTogetherRequests()]);
      setRooms(inbox.rooms);
      setRequests(pending.requests);
      onUnreadChange(inbox.rooms.reduce((sum, room) => sum + room.unreadCount, 0));
      const requestedRoom = new URLSearchParams(location.search).get("room");
      setSelectedId((current) => current && inbox.rooms.some((room) => room.id === current) ? current : requestedRoom && inbox.rooms.some((room) => room.id === requestedRoom) ? requestedRoom : window.matchMedia("(max-width: 760px)").matches ? null : inbox.rooms[0]?.id ?? null);
      setStatus("");
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }

  async function deliver(message: QueuedMessage) {
    try {
      const result = await sendTogetherMessage(message.roomId, { clientMessageId: message.clientMessageId, body: message.body, kind: message.kind, sharedPayload: message.sharedPayload, replyToMessageId: message.replyToMessageId });
      await northRepository.remove(outboxCollection, message.clientMessageId, false);
      setMessages((items) => {
        const reconciled = items.filter((item) => item.clientMessageId !== message.clientMessageId && item.id !== result.message.id);
        return [...reconciled, result.message];
      });
    } catch (error) {
      setMessages((items) => items.map((item) => item.clientMessageId === message.clientMessageId ? { ...item, delivery: "failed" } : item));
      showError(error);
    }
  }

  async function loadEarlier() {
    if (!selectedId || !nextCursor) return;
    try {
      const result = await listTogetherMessages(selectedId, nextCursor);
      setMessages((items) => [...result.messages.filter((message) => !items.some((item) => item.id === message.id)), ...items]);
      setNextCursor(result.nextCursor);
    } catch (error) { showError(error); }
  }

  async function flushOutbox() {
    for (const message of await queuedMessages()) await deliver(message);
  }

  const synchronizeInbox = useEffectEvent(async () => {
    await flushOutbox();
    await refreshInbox();
  });

  async function reconcileOpenRoom(roomId: string) {
    const result = await listTogetherMessages(roomId);
    if (selectedIdRef.current !== roomId) return;
    setMessages((items) => {
      const canonicalClientIds = new Set(result.messages.map((message) => message.clientMessageId));
      const pending = items.filter((message) => message.roomId === roomId && message.delivery && !canonicalClientIds.has(message.clientMessageId));
      return [...result.messages, ...pending];
    });
    setNextCursor(result.nextCursor);
    await markTogetherRoomRead(roomId);
    setRooms((items) => items.map((room) => room.id === roomId ? { ...room, unreadCount: 0 } : room));
  }

  const handleStreamEvent = useEffectEvent((event: string, data: unknown) => {
    if (["message", "announcement"].includes(event)) {
      const message = data as TogetherMessage;
      if (message.roomId === selectedIdRef.current) setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
    }
    if (event === "message_removed") {
      const removed = data as { id: string; roomId: string; removedAt: string };
      if (removed.roomId === selectedIdRef.current) setMessages((items) => items.map((item) => {
        if (item.id === removed.id) return { ...item, body: "Message removed", sharedPayload: null, removedAt: removed.removedAt };
        if (item.replyTo?.id === removed.id) return { ...item, replyTo: { ...item.replyTo, body: "Message removed" } };
        return item;
      }));
    }
    if (event === "unread") {
      const unread = data as { roomId: string };
      if (unread.roomId === selectedIdRef.current) void reconcileOpenRoom(unread.roomId).catch(showError);
    }
    if (event !== "ready" && event !== "receipt") void refreshInbox();
  });

  const currentAccountUser = useEffectEvent(() => account?.user ?? null);

  useEffect(() => {
    queueMicrotask(() => void synchronizeInbox().catch(showError));
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine) void synchronizeInbox(); };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("online", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("online", refresh); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          await streamTogetherEvents(controller.signal, handleStreamEvent);
        } catch { if (controller.signal.aborted) break; }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setReplyingTo(null); });
    if (!selectedId) {
      queueMicrotask(() => { if (!cancelled) setMessages([]); });
      return () => { cancelled = true; };
    }
    void Promise.all([listTogetherMessages(selectedId), queuedMessages(selectedId)]).then(async ([result, queued]) => {
      if (cancelled) return;
      const canonicalClientIds = new Set(result.messages.map((message) => message.clientMessageId));
      const pending: TogetherMessage[] = queued.filter((message) => !canonicalClientIds.has(message.clientMessageId)).map((message) => ({ ...message, id: `pending-${message.clientMessageId}`, sender: currentAccountUser(), kind: message.kind ?? "text", delivery: "failed" }));
      setMessages((current) => {
        const merged = [...result.messages, ...pending];
        const ids = new Set(merged.map((message) => message.id));
        const clientIds = new Set(merged.map((message) => message.clientMessageId));
        for (const message of current) {
          if (message.roomId === selectedId && !ids.has(message.id) && !clientIds.has(message.clientMessageId)) merged.push(message);
        }
        return merged;
      });
      setNextCursor(result.nextCursor);
      await markTogetherRoomRead(selectedId);
      if (cancelled) return;
      setRooms((items) => items.map((room) => room.id === selectedId ? { ...room, unreadCount: 0 } : room));
      requestAnimationFrame(() => transcript.current?.scrollTo({ top: transcript.current.scrollHeight }));
    }).catch((error) => { if (!cancelled) showError(error); });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim() || !account) return;
    const body = draft.trim();
    const clientMessageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const replyTo = replyingTo ? { id: replyingTo.id, body: replyingTo.body, sender: replyingTo.sender } : null;
    const queued = { clientMessageId, roomId: selected.id, body, createdAt, kind: "text" as const, replyToMessageId: replyingTo?.id ?? null, replyTo };
    await northRepository.put(outboxCollection, clientMessageId, queued, false);
    setMessages((items) => [...items, { ...queued, id: `pending-${clientMessageId}`, sender: account.user, kind: "text", delivery: "sending" }]);
    setDraft("");
    setReplyingTo(null);
    void deliver(queued);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    if (event.shiftKey && event.altKey) {
      event.preventDefault();
      const composer = event.currentTarget;
      const start = composer.selectionStart;
      const end = composer.selectionEnd;
      setDraft(`${draft.slice(0, start)}\n${draft.slice(end)}`);
      requestAnimationFrame(() => composer.setSelectionRange(start + 1, start + 1));
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function shareSelectedWorkout() {
    if (!selected || !shareWorkout || !account || !["direct", "trainer"].includes(selected.kind)) return;
    const queued: QueuedMessage = { clientMessageId: crypto.randomUUID(), roomId: selected.id, body: `Shared ${shareWorkout.name}`, createdAt: new Date().toISOString(), kind: "workout", sharedPayload: { template: shareWorkout } };
    await northRepository.put(outboxCollection, queued.clientMessageId, queued, false);
    setMessages((items) => [...items, { ...queued, id: `pending-${queued.clientMessageId}`, sender: account.user, kind: "workout", delivery: "sending" }]);
    onShareComplete?.();
    void deliver(queued);
  }

  async function shareSimpleCard(event: FormEvent) {
    event.preventDefault();
    if (!selected || !cardKind || !cardTitle.trim() || !cardDetail.trim() || !account || !["direct", "trainer"].includes(selected.kind)) return;
    const queued: QueuedMessage = { clientMessageId: crypto.randomUUID(), roomId: selected.id, body: cardTitle.trim(), createdAt: new Date().toISOString(), kind: cardKind, sharedPayload: { title: cardTitle.trim(), detail: cardDetail.trim() } };
    await northRepository.put(outboxCollection, queued.clientMessageId, queued, false);
    setMessages((items) => [...items, { ...queued, kind: cardKind, id: `pending-${queued.clientMessageId}`, sender: account.user, delivery: "sending" }]);
    setCardKind(null); setCardTitle(""); setCardDetail("");
    void deliver(queued);
  }

  async function shareSourceCard() {
    if (!selected || !shareCard || !account || !["direct", "trainer"].includes(selected.kind)) return;
    const queued: QueuedMessage = { clientMessageId: crypto.randomUUID(), roomId: selected.id, body: shareCard.title, createdAt: new Date().toISOString(), kind: shareCard.kind, sharedPayload: { title: shareCard.title, detail: shareCard.detail, ...(shareCard.imageDataUrl ? { imageDataUrl: shareCard.imageDataUrl } : {}) } };
    await northRepository.put(outboxCollection, queued.clientMessageId, queued, false);
    setMessages((items) => [...items, { ...queued, kind: shareCard.kind, id: `pending-${queued.clientMessageId}`, sender: account.user, delivery: "sending" }]);
    onShareComplete?.();
    void deliver(queued);
  }

  async function saveWorkout(message: TogetherMessage) {
    try {
      const result = await prepareTogetherWorkoutCopy(message.id, crypto.randomUUID());
      onSaveWorkout?.(result.template);
      setStatus(`Saved ${result.template.name} to My Workouts.`);
    } catch (error) { showError(error); }
  }

  async function removeMessage(message: TogetherMessage) {
    if (!window.confirm("Delete this message for everyone in this conversation?")) return;
    try {
      await removeTogetherMessage(message.id);
      setMessages((items) => items.map((item) => item.id === message.id ? { ...item, body: "Message removed", sharedPayload: null, removedAt: new Date().toISOString() } : item.replyTo?.id === message.id ? { ...item, replyTo: { ...item.replyTo, body: "Message removed" } } : item));
      setReplyingTo((current) => current?.id === message.id ? null : current);
      setStatus("Message deleted from the conversation.");
    } catch (error) { showError(error); }
  }

  function startReply(message: TogetherMessage) {
    setReplyingTo(message);
    requestAnimationFrame(() => composer.current?.focus());
  }

  async function createConversation(event: FormEvent) {
    event.preventDefault();
    if (creatingConversation) return;
    setCreatingConversation(true);
    setStatus(createMode === "trainer" ? "Creating private trainer room…" : "Sending connection request…");
    try {
      if (createMode === "trainer") {
        const usernames = username.split(/[,\n]/).map((value) => value.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
        await createTogetherTrainerRoom({ usernames, name: trainerName, invitedRole: "member" });
        await refreshInbox();
        setStatus(`Trainer room created. ${usernames.length} ${usernames.length === 1 ? "invitation" : "invitations"} sent.`);
      } else {
        await requestTogetherConnection(username);
        setStatus(`Connection request sent to @${username.trim()}.`);
      }
      setUsername(""); setTrainerName(""); setCreateMode("closed");
    } catch (error) { showError(error); }
    finally { setCreatingConversation(false); }
  }

  async function answerRequest(request: TogetherConnectionRequest, decision: "accept" | "decline") {
    try {
      const result = await respondTogetherConnection(request.id, decision);
      setRequests((items) => items.filter((item) => item.id !== request.id));
      await refreshInbox();
      if (result.connection.roomId) setSelectedId(result.connection.roomId);
    } catch (error) { showError(error); }
  }

  async function joinRoom(room: TogetherRoom) {
    try { await joinTogetherRoom(room.id); await refreshInbox(); setSelectedId(room.id); }
    catch (error) { showError(error); }
  }

  async function enableNotifications() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Notifications are not supported on this browser.");
      if (await Notification.requestPermission() !== "granted") throw new Error("Notifications were not enabled.");
      const config = await getTogetherPushConfig();
      if (!config.enabled || !config.publicKey) throw new Error("Together notifications are not available yet.");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await registerTogetherPush(subscription.toJSON());
      setStatus("Together notifications are on for this device.");
    } catch (error) { showError(error); }
  }

  async function openPreferences() {
    setPreferencesOpen(true);
    if (preferences) return;
    try { setPreferences((await getTogetherPreferences()).preferences); }
    catch (error) { setPreferencesOpen(false); showError(error); }
  }

  async function togglePreference(key: PreferenceKey) {
    if (!preferences || savingPreference) return;
    const nextValue = !preferences[key];
    setSavingPreference(key);
    try {
      const result = await updateTogetherPreferences({ [key]: nextValue });
      setPreferences(result.preferences);
    } catch (error) { showError(error); }
    finally { setSavingPreference(null); }
  }

  async function openRoomInfo() {
    if (!selected) return;
    try { setRoomInfo(await getTogetherRoomInfo(selected.id)); }
    catch (error) { showError(error); }
  }

  async function inviteTrainerMember(event: FormEvent) {
    event.preventDefault();
    if (!roomInfo || savingMember || !memberUsername.trim()) return;
    setSavingMember(true);
    try {
      await inviteTogetherTrainerMember(roomInfo.room.id, memberUsername.trim().replace(/^@/, "").toLowerCase());
      setMemberUsername("");
      setRoomInfo(await getTogetherRoomInfo(roomInfo.room.id));
      setStatus("Private room invitation sent.");
    } catch (error) { showError(error); }
    finally { setSavingMember(false); }
  }

  async function removeTrainerMember(member: TogetherRoomInfo["members"][number]) {
    if (!roomInfo || savingMember || !window.confirm(`${member.status === "invited" ? "Withdraw" : "Remove"} ${member.displayName} from ${roomInfo.room.name}?`)) return;
    setSavingMember(true);
    try {
      await removeTogetherTrainerMember(roomInfo.room.id, member.id);
      setRoomInfo(await getTogetherRoomInfo(roomInfo.room.id));
      setStatus(member.status === "invited" ? "Invitation withdrawn." : "Member removed from the private room.");
    } catch (error) { showError(error); }
    finally { setSavingMember(false); }
  }

  async function roomAction(action: "mute" | "hide" | "disconnect" | "block") {
    if (!selected) return;
    try {
      if (action === "mute") {
        const level = selected.notificationLevel === "muted" ? "all" : "muted";
        await setTogetherRoomNotifications(selected.id, level);
        setRooms((items) => items.map((room) => room.id === selected.id ? { ...room, notificationLevel: level } : room));
        setStatus(level === "muted" ? "Conversation muted." : "Conversation notifications restored.");
        return;
      }
      const warnings = { hide: "Hide your local conversation history? New messages will show this conversation again.", disconnect: `Disconnect from ${selected.name}? You will not be able to send new messages.`, block: `Block ${selected.name}? This immediately stops contact and disconnects you.` };
      if (!window.confirm(warnings[action])) return;
      if (action === "hide") await hideTogetherRoom(selected.id);
      else if (selected.connectionId && action === "disconnect") await disconnectTogetherConnection(selected.connectionId);
      else if (selected.connectionId) await blockTogetherConnection(selected.connectionId);
      setSelectedId(null);
      await refreshInbox();
    } catch (error) { showError(error); }
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!selected || !reportContext.trim()) return;
    try {
      await reportTogetherRoom(selected.id, reportCategory, reportContext.trim());
      setReportOpen(false); setReportContext(""); setStatus("Report submitted for review.");
    } catch (error) { showError(error); }
  }

  const visibleRooms = rooms.filter((room) => `${room.name} ${room.peer?.username ?? ""} ${room.latestMessage?.body ?? ""}`.toLowerCase().includes(inboxQuery.trim().toLowerCase()));
  const unreadRooms = rooms.filter((room) => room.unreadCount > 0);
  const notificationCount = requests.length + unreadRooms.length;
  const isCanonicalOwner = account?.user.username.toLowerCase() === "druwbi";
  const canPostToSelected = Boolean(selected && (selected.kind !== "updates" || account?.user.isAdmin || isCanonicalOwner));

  return <section className="screen destination-screen together-screen">
    <style>{".together-actions button{width:100%!important;height:auto!important;border:0!important;display:block!important}"}</style>
    <header className="destination-brand-header destination-brand-together"><div className="destination-header-copy"><p className="eyebrow destination-eyebrow">NORTH TOGETHER</p><h1>Together</h1></div><div className="together-header-actions"><button className="together-notification-button" onClick={() => setNotificationsOpen(true)} aria-label="Together notifications" title="Together notifications"><Bell size={18}/>{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}</button><button onClick={() => void openPreferences()} aria-label="Together settings" title="Together settings"><Settings size={18}/></button><button className="together-primary-action" onClick={() => setCreateMode("connection")}><UsersRound size={18}/>Connect</button><button onClick={() => setCreateMode("trainer")}><MessageCircle size={18}/>Trainer room</button></div></header>
    {status && <div className="together-status" role="status"><span>{status}</span><button onClick={() => setStatus("")} aria-label="Dismiss"><X size={15}/></button></div>}
    {preferencesOpen && <div className="together-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreferencesOpen(false); }}><section className="together-settings" role="dialog" aria-modal="true" aria-labelledby="together-settings-title"><header><div><p className="eyebrow">TOGETHER SETTINGS</p><h2 id="together-settings-title">Notifications and privacy</h2></div><button onClick={() => setPreferencesOpen(false)} aria-label="Close Together settings"><X size={18}/></button></header>{preferences ? <div className="together-settings-groups">{preferenceGroups.map((group) => <fieldset key={group.title}><legend>{group.title}</legend><p>{group.description}</p>{group.items.map((item) => <label key={item.key}><span>{item.label}</span><input type="checkbox" role="switch" checked={preferences[item.key]} disabled={savingPreference !== null} onChange={() => void togglePreference(item.key)}/></label>)}</fieldset>)}</div> : <p className="together-settings-loading">Loading settings…</p>}<footer><div><Bell size={16}/><span>Browser notifications are enabled separately on each device.</span></div><button onClick={() => void enableNotifications()}>Enable on this device</button></footer></section></div>}
    {notificationsOpen && <div className="together-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNotificationsOpen(false); }}><section className="together-notifications" role="dialog" aria-modal="true" aria-labelledby="together-notifications-title"><header><div><p className="eyebrow">IN-APP NOTIFICATIONS</p><h2 id="together-notifications-title">What is waiting</h2></div><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={18}/></button></header><div>{requests.map((request) => <button key={request.id} onClick={() => setNotificationsOpen(false)}><span><UsersRound size={17}/></span><div><strong>{request.person.displayName}</strong><small>@{request.person.username} wants to connect</small></div><b>NEW</b></button>)}{unreadRooms.map((room) => <button key={room.id} className={`kind-${room.kind}`} onClick={() => { setSelectedId(room.id); setNotificationsOpen(false); }}><span><MessageCircle size={17}/></span><div><strong>{room.name}</strong><small>{room.latestMessage?.body || room.description}</small></div><b>{room.unreadCount > 99 ? "99+" : room.unreadCount}</b></button>)}{notificationCount === 0 && <p>Nothing is waiting. New messages and connection requests will appear here.</p>}</div></section></div>}
    {roomInfo && <div className="together-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRoomInfo(null); }}><section className="together-room-info" role="dialog" aria-modal="true" aria-labelledby="together-room-info-title">
      <header><div><p className="eyebrow">CONVERSATION INFO</p><h2 id="together-room-info-title">{roomInfo.room.name}</h2></div><button onClick={() => setRoomInfo(null)} aria-label="Close conversation info"><X size={18}/></button></header>
      <div className="together-room-info-body"><p>{roomInfo.room.description}</p><dl><div><dt>Type</dt><dd>{roomInfo.room.kind === "updates" ? "Signed North Updates" : roomInfo.room.kind === "trainer" ? "Private · invite only" : roomInfo.room.kind === "direct" ? "Private · one to one" : "Curated community room"}</dd></div><div><dt>Your role</dt><dd>{roomInfo.room.role}</dd></div><div><dt>Members</dt><dd>{roomInfo.members.filter((member) => member.status === "active").length} active</dd></div></dl>
        {roomInfo.room.kind === "trainer" && roomInfo.room.role === "owner" && <form className="together-member-invite" onSubmit={inviteTrainerMember}><label><span>Invite another member</span><div><b>@</b><input required maxLength={30} value={memberUsername} onChange={(event) => setMemberUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="username"/></div></label><button disabled={savingMember || !memberUsername.trim()}><Plus size={14}/>Invite</button></form>}
        {roomInfo.members.length > 0 && <section><h3>People</h3>{roomInfo.members.map((member) => <div className="together-room-member" key={member.id}><span><strong>{member.displayName}</strong><small>{member.username ? `@${member.username}` : "North member"}</small></span><aside><b>{member.status === "invited" ? "invited" : member.role}</b>{roomInfo.room.kind === "trainer" && roomInfo.room.role === "owner" && member.role !== "owner" && <button disabled={savingMember} onClick={() => void removeTrainerMember(member)} aria-label={`${member.status === "invited" ? "Withdraw invitation for" : "Remove"} ${member.displayName}`} title={member.status === "invited" ? "Withdraw invitation" : "Remove member"}><Trash2 size={14}/></button>}</aside></div>)}</section>}
      </div>
    </section></div>}
    {createMode !== "closed" && <form className="together-create" onSubmit={createConversation}><div><p className="eyebrow">{createMode === "trainer" ? "PRIVATE TRAINER SPACE" : "NEW CONNECTION"}</p><h2>{createMode === "trainer" ? "Open a trainer room" : "Find one person"}</h2><p>{createMode === "trainer" ? "Invite up to 20 people. Only invited members can join." : "Enter their exact North username."}</p></div>{createMode === "trainer" && <label><span>Room name</span><input required maxLength={80} value={trainerName} onChange={(event) => setTrainerName(event.target.value)} placeholder="Dad's training"/></label>}<label><span>{createMode === "trainer" ? "Invite usernames" : "North username"}</span><div><b>@</b><input required maxLength={createMode === "trainer" ? 650 : 30} value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" placeholder={createMode === "trainer" ? "morgan, jamie, sam" : "username"}/></div></label><footer><button type="button" disabled={creatingConversation} onClick={() => setCreateMode("closed")}>Cancel</button><button type="submit" disabled={creatingConversation}>{creatingConversation ? createMode === "trainer" ? "Creating…" : "Sending…" : createMode === "trainer" ? "Create room" : "Send request"}</button></footer></form>}
    <div className={`together-workspace${selected ? " has-selection" : ""}`}>
      <aside className="together-inbox"><header><div><p className="eyebrow">INBOX</p><h2>Conversations</h2></div><button onClick={() => void refreshInbox()} aria-label="Refresh"><RotateCcw size={17}/></button></header>
        {requests.length > 0 && <section className="together-requests"><strong>{requests.length} connection {requests.length === 1 ? "request" : "requests"}</strong>{requests.map((request) => <article key={request.id}><UsersRound size={17}/><div><b>{request.person.displayName}</b><small>@{request.person.username}</small></div><button onClick={() => void answerRequest(request, "accept")} aria-label={`Accept ${request.person.displayName}`}><Check size={14}/></button><button onClick={() => void answerRequest(request, "decline")} aria-label={`Decline ${request.person.displayName}`}><X size={14}/></button></article>)}</section>}
        <label className="together-search"><Search size={16}/><input value={inboxQuery} onChange={(event) => setInboxQuery(event.target.value)} placeholder="Find a conversation" aria-label="Find a conversation"/></label><div className="together-room-list">{loading ? <p className="together-empty">Opening Together…</p> : visibleRooms.length ? visibleRooms.map((room) => <button key={room.id} className={`together-room kind-${room.kind}${room.id === selectedId ? " active" : ""}`} onClick={() => room.status === "invited" ? void joinRoom(room) : setSelectedId(room.id)}><span><MessageCircle size={18}/></span><div><strong>{room.name}</strong><small>{room.status === "invited" ? "Invitation - open to join" : room.latestMessage?.body || room.description}</small></div><aside>{room.unreadCount > 0 && <b>{room.unreadCount > 99 ? "99+" : room.unreadCount}</b>}</aside></button>) : <p className="together-empty">No matching conversations.</p>}</div>
      </aside>
      <section className="together-thread">{!selected ? <div className="together-empty-thread"><MessageCircle size={28}/><strong>Choose a conversation.</strong></div> : <><header><button className="together-back" onClick={() => setSelectedId(null)} aria-label="Back to conversations" title="Back to conversations"><ArrowLeft size={18}/></button><span className={`kind-${selected.kind}`}><MessageCircle size={18}/></span><div><strong>{selected.name}</strong><small>{selected.kind === "updates" ? "Signed by North" : selected.peer ? `@${selected.peer.username}` : selected.description}</small></div><details className="together-actions"><summary aria-label="Conversation actions"><Ellipsis size={18}/></summary><div><button onClick={() => void openRoomInfo()}>Conversation info</button><button onClick={() => void roomAction("mute")}>{selected.notificationLevel === "muted" ? "Unmute" : "Mute"}</button>{selected.kind !== "updates" && <button onClick={() => setReportOpen(true)}>Report</button>}{selected.kind === "direct" && <><button onClick={() => void roomAction("hide")}>Hide history</button><button onClick={() => void roomAction("disconnect")}>Disconnect</button><button onClick={() => void roomAction("block")}>Block</button></>}</div></details></header>
        {reportOpen && <form className="together-report" onSubmit={submitReport}><header><strong>Report this conversation</strong><button type="button" onClick={() => setReportOpen(false)} aria-label="Close report"><X size={15}/></button></header><label>Reason<select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="unsafe">Unsafe content</option><option value="impersonation">Impersonation</option><option value="privacy">Privacy</option><option value="other">Other</option></select></label><label>What should North review?<textarea required maxLength={4000} value={reportContext} onChange={(event) => setReportContext(event.target.value)}/></label><footer><button type="button" onClick={() => setReportOpen(false)}>Cancel</button><button>Submit report</button></footer></form>}
        {shareWorkout && <section className="together-share-review"><div><small>SHARE WORKOUT</small><strong>{shareWorkout.name}</strong><span>{shareWorkout.exercises.length} exercises · {shareWorkout.duration} min</span></div><button onClick={() => void shareSelectedWorkout()} disabled={!["direct", "trainer"].includes(selected.kind)}>Send to {selected.name}</button><button onClick={onShareComplete}>Cancel</button></section>}
        {shareCard && <section className="together-share-review"><div><small>SHARE {shareCard.kind.toUpperCase()}</small><strong>{shareCard.title}</strong><span>{shareCard.detail}</span></div><button onClick={() => void shareSourceCard()} disabled={!['direct', 'trainer'].includes(selected.kind)}>Send to {selected.name}</button><button onClick={onShareComplete}>Cancel</button></section>}
        {cardKind && <form className="together-card-review" onSubmit={shareSimpleCard}><header><div><small>REVIEW {cardKind.toUpperCase()}</small><strong>Visible to {selected.name}</strong></div><button type="button" onClick={() => setCardKind(null)} aria-label="Cancel card"><X size={16}/></button></header><label>Title<input required maxLength={80} value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} placeholder={cardKind === "progress" ? "A step forward" : cardKind === "encouragement" ? "You have this" : "Train together"}/></label><label>Detail<textarea required maxLength={500} value={cardDetail} onChange={(event) => setCardDetail(event.target.value)} placeholder="Write exactly what they will see."/></label><button>Send to {selected.name}</button></form>}
          <div className="together-transcript" ref={transcript}>{nextCursor && <button className="together-earlier" onClick={() => void loadEarlier()}>Earlier messages</button>}{messages.length === 0 ? <div className="together-empty-thread"><strong>{selected.kind === "updates" ? "Updates appear here." : "Start where you are."}</strong><p>{selected.description}</p></div> : messages.map((message) => {
            const own = message.sender?.id === account?.user.id;
            const workout = message.kind === "workout" && message.sharedPayload && typeof message.sharedPayload === "object" ? (message.sharedPayload as { template?: WorkoutTemplate }).template : null;
            const card = ["milestone", "recap", "photo", "progress", "encouragement", "invitation"].includes(message.kind) && message.sharedPayload && typeof message.sharedPayload === "object" ? message.sharedPayload as { title?: string; detail?: string; imageDataUrl?: string } : null;
            const senderName = message.sender?.displayName || (own ? account?.user.displayName : "North");
            return <article id={`together-message-${message.id}`} key={message.id} className={`together-message sender-tone-${senderTone(message.sender?.id)}${own ? " own" : ""}${message.delivery === "failed" ? " failed" : ""}`}>
              <small>{senderName?.toUpperCase()}{own ? " · YOU" : ""}</small>
              {message.replyTo && <button type="button" className="together-reply-quote" onClick={() => document.getElementById(`together-message-${message.replyTo?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}><strong>{message.replyTo.sender?.displayName || "North"}</strong><span>{message.replyTo.body}</span></button>}
              {!card && <p>{message.body}</p>}
              {card && <div className={`together-shared-card kind-${message.kind}`}>{card.imageDataUrl && <img src={card.imageDataUrl} alt={card.title || "Shared Journey photo"}/>}<small>{message.kind.toUpperCase()}</small><strong>{card.title}</strong><span>{card.detail}</span></div>}
              {workout && <div className="together-workout-card"><strong>{workout.name}</strong><span>{workout.exercises.length} exercises · {workout.duration} min · {workout.level}</span>{!own && !message.delivery && <button onClick={() => void saveWorkout(message)}>Save to My Workouts</button>}</div>}
              {!message.removedAt && !message.delivery && <div className="together-message-controls">{canPostToSelected && <button type="button" onClick={() => startReply(message)} aria-label={`Reply to ${senderName}`} title="Reply"><Reply size={13}/></button>}{own && message.kind !== "system" && <button type="button" onClick={() => void removeMessage(message)} aria-label="Delete message" title="Delete message"><Trash2 size={13}/></button>}</div>}
              {message.delivery === "sending" && <span>Sending…</span>}
              {message.delivery === "failed" && <button onClick={() => void deliver({ clientMessageId: message.clientMessageId, roomId: message.roomId, body: message.body, createdAt: message.createdAt, kind: message.kind, sharedPayload: message.sharedPayload, replyToMessageId: message.replyToMessageId, replyTo: message.replyTo })}><RotateCcw size={12}/> Retry</button>}
            </article>;
          })}</div>
        {!canPostToSelected ? <footer className="together-readonly"><MessageCircle size={16}/> Read-only · Signed by North</footer> : <form className="together-composer" onSubmit={sendMessage}>{replyingTo && <div className="together-composer-reply"><Reply size={14}/><span><strong>{replyingTo.sender?.displayName || "North"}</strong><small>{replyingTo.body}</small></span><button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" title="Cancel reply"><X size={14}/></button></div>}{["direct", "trainer"].includes(selected.kind) && <details className="together-attach"><summary aria-label="Share something"><Plus size={18}/></summary><div><button type="button" onClick={() => { setCardKind("progress"); setCardTitle(""); setCardDetail(""); }}><TrendingUp size={15}/>Progress update</button><button type="button" onClick={() => { setCardKind("encouragement"); setCardTitle(""); setCardDetail(""); }}><Heart size={15}/>Encouragement</button><button type="button" onClick={() => { setCardKind("invitation"); setCardTitle(""); setCardDetail(""); }}><CalendarPlus size={15}/>Invitation</button></div></details>}<textarea ref={composer} rows={1} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder={selected.kind === "updates" ? "Post a North Update" : `Message ${selected.name}`} aria-label={selected.kind === "updates" ? "Post a North Update" : `Message ${selected.name}`}/><button disabled={!draft.trim()} aria-label="Send message"><Send size={18}/></button></form>}</>}</section>
    </div>
  </section>;
}