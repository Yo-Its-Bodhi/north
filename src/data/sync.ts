import { northRepository, type NorthDocument, type OutboxMutation } from "./northDb";
import { northDeviceHeaders } from "./account";
import { mergeAccountData } from "./mergeAccountData";

export type SyncResult = { sent: number; conflicts: number; failed: number; pending: number };
export type PullResult = { restored: number; serverTime: string };

type MutationResponse = { status: "applied" | "conflict" | "superseded"; remote?: NorthDocument; document?: NorthDocument };

async function pushLatest(apiBase: string, accessToken: string, mutation: OutboxMutation) {
  let candidate = mutation;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/v1/sync/mutations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-North-Sync-Protocol": "2", Authorization: `Bearer ${accessToken}`, "Idempotency-Key": candidate.mutationId, ...northDeviceHeaders() },
      body: JSON.stringify(candidate),
    });
    if (response.status === 429) throw Object.assign(new Error("Sync paused by server rate limit"), { status: 429, retryAfter: Math.max(5, Number.parseInt(response.headers.get("retry-after") || "60", 10) || 60) });
    if (!response.ok && response.status !== 409) throw Object.assign(new Error(`Sync returned ${response.status}`), { status: response.status });
    const result = await response.json() as MutationResponse;
    if (result.status === "applied") return result;
    const latest = result.remote ?? result.document;
    if (!latest) throw new Error("Account save did not return its latest version");
    if (candidate.operation === "delete") throw new Error("Account changed before deletion. Refresh before trying again.");
    candidate = { ...candidate, data: mergeAccountData(candidate.baseData, candidate.data, latest.data), baseData: latest.data, mutationId: crypto.randomUUID(), baseVersion: latest.version, createdAt: new Date().toISOString() };
  }
  throw new Error("Account changed repeatedly while saving; North will retry the latest save");
}

export async function syncNorth(apiBase: string, accessToken: string): Promise<SyncResult> {
  await northRepository.preserveLegacySync();
  const mutations = (await northRepository.pendingMutations()).filter((mutation) => new Date(mutation.nextAttemptAt).getTime() <= Date.now()).slice(0,12);
  let sent = 0;
  const conflicts = 0;
  let failed = 0;
  for (const mutation of mutations) {
    try {
      if (mutation.protocol !== 2) throw new Error("Older device save is preserved for recovery; reload North.");
      const result = await pushLatest(apiBase, accessToken, mutation);
      if (result.document) await northRepository.acceptMutation(result.document, mutation);
      else await northRepository.acknowledge(mutation.mutationId);
      sent += 1;
    } catch (error) {
      if (error instanceof Error && (error as Error & { status?: number }).status === 401) throw error;
      const retryAfter = error instanceof Error ? Number((error as Error & { retryAfter?: number }).retryAfter ?? 0) * 1000 : 0;
      await northRepository.retry(mutation, error instanceof Error ? error.message : "Unknown sync error", retryAfter);
      failed += 1;
      if (error instanceof Error && (error as Error & { status?: number }).status === 429) break;
    }
  }
  return { sent, conflicts, failed, pending: (await northRepository.pendingMutations()).length };
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

export async function pullNorth(apiBase: string, accessToken: string, since = "1970-01-01T00:00:00.000Z", preferAccount = false, timeoutMs = 10_000): Promise<PullResult> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${apiBase.replace(/\/$/, "")}/v1/sync/documents?since=${encodeURIComponent(since)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...northDeviceHeaders() },
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Account restore timed out. North is using the data saved on this device.", { cause: error });
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
  if (!response.ok) throw Object.assign(new Error(`Restore returned ${response.status}`), { status: response.status });
  const result = await response.json() as { documents: NorthDocument[]; serverTime: string };
  const pendingDocumentKeys = new Set((await northRepository.pendingMutations()).filter((mutation) => !preferAccount || mutation.protocol === 2).map((mutation) => mutation.documentKey));
  let restored = 0;
  
  for (const document of result.documents) {
    // Skip if there's a pending mutation for this document
    if (pendingDocumentKeys.has(document.key)) continue;
    
    if (!await northRepository.acceptRemote(document, preferAccount)) continue;
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
