export type NorthUser = { id: string; username: string; displayName: string; timezone: string };
export type NorthSession = { user: NorthUser; accessToken: string; refreshToken: string; recoveryCode?: string };

const SESSION_KEY = "north-account-session-v1";
const DEVICE_KEY = "north-device-id-v1";
const LAST_LOCAL_OWNER_KEY = "north-last-local-owner-v1";
export const NORTH_API_BASE = import.meta.env?.VITE_API_BASE_URL || (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://127.0.0.1:8080" : location.origin);

export function northDevice() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return { id, name: `${mobile ? "Mobile" : "Computer"} · ${navigator.platform || "Browser"}` };
}

export function northDeviceHeaders() {
  const device = northDevice();
  return { "X-North-Device-ID": device.id, "X-North-Device-Name": device.name };
}

export function readNorthSession(): NorthSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as NorthSession | null; } catch { return null; }
}

function saveSession(session: NorthSession | null) {
  if (session) {
    const previousOwner = localStorage.getItem(LAST_LOCAL_OWNER_KEY);
    if (previousOwner && previousOwner !== session.user.id) {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("north-") && ![DEVICE_KEY, LAST_LOCAL_OWNER_KEY].includes(key)) localStorage.removeItem(key);
      }
    }
    localStorage.setItem(LAST_LOCAL_OWNER_KEY, session.user.id);
    const { recoveryCode: _oneTimeSecret, ...persistentSession } = session;
    void _oneTimeSecret;
    localStorage.setItem(SESSION_KEY, JSON.stringify(persistentSession));
  } else localStorage.removeItem(SESSION_KEY);
  return session;
}

async function sessionRequest(path: string, body: unknown) {
  const response = await fetch(`${NORTH_API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...northDeviceHeaders() }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as NorthSession & { error?: string };
  if (!response.ok) throw new Error(result.error || `Account request returned ${response.status}`);
  return saveSession(result) as NorthSession;
}

export const registerNorthAccount = (username: string, password: string, displayName: string, accessCode?: string) => sessionRequest("/v1/auth/register", { username, password, displayName, accessCode, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
export const loginNorthAccount = (username: string, password: string) => sessionRequest("/v1/auth/login", { username, password });
export const recoverNorthAccount = (username: string, recoveryCode: string, newPassword: string) => sessionRequest("/v1/auth/recover", { username, recoveryCode, newPassword });
export const refreshNorthSession = (refreshToken: string) => sessionRequest("/v1/auth/refresh", { refreshToken });
export function logoutNorthAccount() { saveSession(null); }

export async function withFreshAccess<T>(operation: (token: string) => Promise<T>) {
  let session = readNorthSession();
  if (!session) throw new Error("Sign in to sync North.");
  try { return await operation(session.accessToken); }
  catch {
    session = await refreshNorthSession(session.refreshToken);
    return operation(session.accessToken);
  }
}

export async function deleteNorthAccount() {
  await withFreshAccess(async (token) => {
    const response = await fetch(`${NORTH_API_BASE}/v1/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, ...northDeviceHeaders() } });
    if (!response.ok) throw new Error(`Account deletion returned ${response.status}`);
  });
  logoutNorthAccount();
}
