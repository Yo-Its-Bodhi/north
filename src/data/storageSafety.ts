export type NorthStorageFailure = {
  kind: "quota" | "unavailable";
  message: string;
};

export const NORTH_STORAGE_FAILURE_EVENT = "north:storage-failure";

let latestStorageFailure: NorthStorageFailure | null = null;

export function storageFailure(error: unknown): NorthStorageFailure {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";
  const quota = name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
  return quota
    ? { kind: "quota", message: "Device storage is full. North could not save the latest change. Keep this tab open, export a backup if available, and free some storage before continuing." }
    : { kind: "unavailable", message: "Device storage is unavailable. North could not confirm the latest change was saved. Keep this tab open and check browser storage permissions before continuing." };
}

export function reportStorageFailure(error: unknown) {
  const detail = storageFailure(error);
  latestStorageFailure = detail;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<NorthStorageFailure>(NORTH_STORAGE_FAILURE_EVENT, { detail }));
  return detail;
}

export function getLatestStorageFailure() {
  return latestStorageFailure;
}

export function setLocalStorageItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    reportStorageFailure(error);
    return false;
  }
}

export function removeLocalStorageItem(key: string) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    reportStorageFailure(error);
    return false;
  }
}