import { northRepository, type NorthDocument, type OutboxMutation } from "./northDb";
import { northDeviceHeaders } from "./account";

export type SyncResult = { sent: number; conflicts: number; failed: number; pending: number };
export type PullResult = { restored: number; serverTime: string };

type MutationResponse = { status: "applied" | "conflict"; conflictId?: string; remote?: NorthDocument };

export async function syncNorth(apiBase: string, accessToken: string): Promise<SyncResult> {
  const mutations = (await northRepository.pendingMutations()).filter((mutation) => new Date(mutation.nextAttemptAt).getTime() <= Date.now()).slice(0,12);
  let sent = 0;
  let conflicts = 0;
  let failed = 0;
  for (const mutation of mutations) {
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/v1/sync/mutations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "Idempotency-Key": mutation.mutationId, ...northDeviceHeaders() },
        body: JSON.stringify(mutation),
      });
      if (response.status === 409) {
        const result = await response.json() as MutationResponse;
        const local = await northRepository.get(mutation.collection, mutation.documentKey.split(":").slice(1).join(":"));
        if (local && result.remote) await northRepository.addConflict({ conflictId: result.conflictId || `${mutation.documentKey}:${result.remote.version}`, documentKey: mutation.documentKey, collection: mutation.collection, local, remote: result.remote, createdAt: new Date().toISOString(), status: "open" });
        await northRepository.acknowledge(mutation.mutationId);
        conflicts += 1;
      } else if (response.ok) {
        await northRepository.acknowledge(mutation.mutationId);
        sent += 1;
      } else if (response.status === 429) {
        const retryAfterSeconds = Math.max(5, Number.parseInt(response.headers.get("retry-after") || "60", 10) || 60);
        await northRepository.retry(mutation, "Sync paused by server rate limit", retryAfterSeconds * 1000);
        failed += 1;
        break;
      } else {
        throw new Error(`Sync returned ${response.status}`);
      }
    } catch (error) {
      await northRepository.retry(mutation, error instanceof Error ? error.message : "Unknown sync error");
      failed += 1;
    }
  }
  return { sent, conflicts, failed, pending: (await northRepository.pendingMutations()).length };
}

export async function resolveConflict(conflictId: string, choice: "local" | "remote") {
  const conflicts = await northRepository.conflicts();
  const conflict = conflicts.find((item) => item.conflictId === conflictId);
  if (!conflict) throw new Error("Conflict not found");
  const [collection, ...idParts] = conflict.documentKey.split(":");
  await northRepository.acceptRemote(conflict.remote);
  if (choice === "local") await northRepository.put(collection, idParts.join(":"), conflict.local.data, true);
  await northRepository.addConflict({ ...conflict, status: choice });
}

const storageKeys: Record<string, string> = {
  "active-session": "north-active-session-v1", workouts: "north-session-history-v1", "week-plan": "north-week-plan-v1",
  activities: "north-activities-v1", "check-ins": "north-check-ins-v1", reviews: "north-weekly-reviews-v1",
  "test-notes": "north-test-notes-v1", "personal-workouts": "north-personal-workouts-v1", "active-program": "north-active-program-v1",
  "journey-photos": "north-journey-photos-v1", profile: "north-profile-v1", settings: "north-settings-v1",
  "favorite-workouts": "north-favorite-workouts-v1",
  "favorite-exercises": "north-favorite-exercises-v1",
  "nova-conversations": "north-nova-conversation-v1",
  "progression-transaction": "north-progression-transaction-v1",
};

export async function pullNorth(apiBase: string, accessToken: string, since = "1970-01-01T00:00:00.000Z", preferAccount = false): Promise<PullResult> {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/v1/sync/documents?since=${encodeURIComponent(since)}`, { headers: { Authorization: `Bearer ${accessToken}`, ...northDeviceHeaders() } });
  if (!response.ok) throw new Error(`Restore returned ${response.status}`);
  const result = await response.json() as { documents: NorthDocument[]; serverTime: string };
  const pendingDocumentKeys = new Set((await northRepository.pendingMutations()).map((mutation) => mutation.documentKey));
  let restored = 0;
  for (const document of result.documents) {
    if (!preferAccount && pendingDocumentKeys.has(document.key)) continue;
    await northRepository.acceptRemote(document);
    restored += 1;
    if (document.collection === "settings" && document.id === "theme") { if (document.deletedAt) localStorage.removeItem("north-theme"); else localStorage.setItem("north-theme", String(document.data)); continue; }
    if (document.collection === "settings" && document.id === "calorie-estimates") { if (document.deletedAt) localStorage.removeItem("north-calorie-estimates"); else localStorage.setItem("north-calorie-estimates", document.data ? "on" : "off"); continue; }
    const storageKey = storageKeys[document.collection];
    if (!storageKey || document.id !== "primary") continue;
    if (document.deletedAt) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(document.data));
  }
  return { restored, serverTime: result.serverTime };
}

export function mutationSummary(mutation: OutboxMutation) {
  return `${mutation.operation} ${mutation.documentKey} · attempt ${mutation.attempts + 1}`;
}
