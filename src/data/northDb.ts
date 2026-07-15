export type NorthDocument<T = unknown> = {
  key: string;
  collection: string;
  id: string;
  data: T;
  version: number;
  updatedAt: string;
  deletedAt?: string;
};

export type OutboxMutation = {
  mutationId: string;
  documentKey: string;
  collection: string;
  operation: "put" | "delete";
  data?: unknown;
  baseVersion: number;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
};

export type SyncConflict = {
  conflictId: string;
  documentKey: string;
  collection: string;
  local: NorthDocument;
  remote: NorthDocument;
  createdAt: string;
  status: "open" | "local" | "remote";
};

const DB_VERSION = 1;

function ownerDatabaseName() {
  try {
    const session = JSON.parse(localStorage.getItem("north-account-session-v1") || "null") as { user?: { id?: string } } | null;
    return `north-local-${session?.user?.id || "guest"}`;
  } catch { return "north-local-guest"; }
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

const databasePromises = new Map<string, Promise<IDBDatabase>>();

export function openNorthDatabase() {
  const databaseName = ownerDatabaseName();
  const existing = databasePromises.get(databaseName);
  if (existing) return existing;
  const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("documents")) {
        const documents = database.createObjectStore("documents", { keyPath: "key" });
        documents.createIndex("collection", "collection", { unique: false });
        documents.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!database.objectStoreNames.contains("outbox")) {
        const outbox = database.createObjectStore("outbox", { keyPath: "mutationId" });
        outbox.createIndex("nextAttemptAt", "nextAttemptAt", { unique: false });
      }
      if (!database.objectStoreNames.contains("conflicts")) database.createObjectStore("conflicts", { keyPath: "conflictId" });
      if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("North database could not open"));
  });
  databasePromises.set(databaseName, databasePromise);
  return databasePromise;
}

export const northRepository = {
  async get<T>(collection: string, id: string) {
    const database = await openNorthDatabase();
    const transaction = database.transaction("documents", "readonly");
    const result = await requestResult(transaction.objectStore("documents").get(`${collection}:${id}`));
    return (result as NorthDocument<T> | undefined) ?? null;
  },

  async list<T>(collection: string) {
    const database = await openNorthDatabase();
    const transaction = database.transaction("documents", "readonly");
    const result = await requestResult(transaction.objectStore("documents").index("collection").getAll(collection));
    return (result as NorthDocument<T>[]).filter((document) => !document.deletedAt);
  },

  async put<T>(collection: string, id: string, data: T, queue = true) {
    const database = await openNorthDatabase();
    const key = `${collection}:${id}`;
    const transaction = database.transaction(queue ? ["documents", "outbox"] : ["documents"], "readwrite");
    const store = transaction.objectStore("documents");
    const existing = await requestResult(store.get(key)) as NorthDocument<T> | undefined;
    const updatedAt = new Date().toISOString();
    const document: NorthDocument<T> = { key, collection, id, data, version: (existing?.version ?? 0) + 1, updatedAt };
    store.put(document);
    if (queue) transaction.objectStore("outbox").put({ mutationId: key, documentKey: key, collection, operation: "put", data, baseVersion: existing?.version ?? 0, createdAt: updatedAt, attempts: 0, nextAttemptAt: updatedAt } satisfies OutboxMutation);
    await transactionDone(transaction);
    return document;
  },

  async remove(collection: string, id: string) {
    const database = await openNorthDatabase();
    const key = `${collection}:${id}`;
    const transaction = database.transaction(["documents", "outbox"], "readwrite");
    const store = transaction.objectStore("documents");
    const existing = await requestResult(store.get(key)) as NorthDocument | undefined;
    const updatedAt = new Date().toISOString();
    const document: NorthDocument = { key, collection, id, data: existing?.data ?? null, version: (existing?.version ?? 0) + 1, updatedAt, deletedAt: updatedAt };
    store.put(document);
    transaction.objectStore("outbox").put({ mutationId: key, documentKey: key, collection, operation: "delete", baseVersion: existing?.version ?? 0, createdAt: updatedAt, attempts: 0, nextAttemptAt: updatedAt } satisfies OutboxMutation);
    await transactionDone(transaction);
  },

  async pendingMutations() {
    const database = await openNorthDatabase();
    const transaction = database.transaction("outbox", "readonly");
    return requestResult(transaction.objectStore("outbox").getAll()) as Promise<OutboxMutation[]>;
  },

  async acceptRemote(document: NorthDocument) {
    const database = await openNorthDatabase();
    const transaction = database.transaction(["documents", "outbox"], "readwrite");
    transaction.objectStore("documents").put(document);
    transaction.objectStore("outbox").delete(document.key);
    await transactionDone(transaction);
  },

  async acknowledge(mutationId: string) {
    const database = await openNorthDatabase();
    const transaction = database.transaction("outbox", "readwrite");
    transaction.objectStore("outbox").delete(mutationId);
    await transactionDone(transaction);
  },

  async retry(mutation: OutboxMutation, error: string) {
    const database = await openNorthDatabase();
    const transaction = database.transaction("outbox", "readwrite");
    const attempts = mutation.attempts + 1;
    const delay = Math.min(300_000, 1000 * 2 ** attempts);
    transaction.objectStore("outbox").put({ ...mutation, attempts, lastError: error, nextAttemptAt: new Date(Date.now() + delay).toISOString() });
    await transactionDone(transaction);
  },

  async addConflict(conflict: SyncConflict) {
    const database = await openNorthDatabase();
    const transaction = database.transaction("conflicts", "readwrite");
    transaction.objectStore("conflicts").put(conflict);
    await transactionDone(transaction);
  },

  async conflicts() {
    const database = await openNorthDatabase();
    const transaction = database.transaction("conflicts", "readonly");
    return requestResult(transaction.objectStore("conflicts").getAll()) as Promise<SyncConflict[]>;
  },
};

const legacyCollections: Record<string, string> = {
  "north-active-session-v1": "active-session",
  "north-session-history-v1": "workouts",
  "north-week-plan-v1": "week-plan",
  "north-activities-v1": "activities",
  "north-check-ins-v1": "check-ins",
  "north-weekly-reviews-v1": "reviews",
  "north-test-notes-v1": "test-notes",
  "north-personal-workouts-v1": "personal-workouts",
  "north-active-program-v1": "active-program",
  "north-journey-photos-v1": "journey-photos",
  "north-profile-v1": "profile",
  "north-nova-conversation-v1": "nova-conversations",
  "north-progression-transaction-v1": "progression-transaction",
};

export async function migrateLegacyStorage() {
  const database = await openNorthDatabase();
  const check = database.transaction("meta", "readonly");
  const completed = await requestResult(check.objectStore("meta").get("legacy-migration-v1")) as { key: string; completedAt: string } | undefined;
  if (completed) return false;
  for (const [storageKey, collection] of Object.entries(legacyCollections)) {
    const raw = localStorage.getItem(storageKey);
    if (!raw) continue;
    try { await northRepository.put(collection, "primary", JSON.parse(raw), false); }
    catch { await northRepository.put(collection, "primary", raw, false); }
  }
  const transaction = database.transaction("meta", "readwrite");
  transaction.objectStore("meta").put({ key: "legacy-migration-v1", completedAt: new Date().toISOString() });
  await transactionDone(transaction);
  return true;
}
