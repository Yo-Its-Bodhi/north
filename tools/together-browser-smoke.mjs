import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright-core";

const port = await new Promise((resolve, reject) => {
  const reservation = createServer();
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", () => {
    const address = reservation.address();
    if (!address || typeof address === "string") return reject(new Error("Could not reserve a browser-test port."));
    reservation.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], { stdio: "ignore" });
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const account = { user: { id: "alex", username: "alex", displayName: "Alex", timezone: "America/Toronto" }, accessToken: "test", refreshToken: "test" };
const dad = { id: "dad", username: "dad", displayName: "Dad" };
const rooms = [
  { id: "general", slug: "general", name: "General", kind: "general", description: "The shared North room.", role: "member", status: "active", notificationLevel: "all", unreadCount: 0 },
  { id: "help", slug: "help", name: "Help", kind: "help", description: "Ask for practical help.", role: "member", status: "active", notificationLevel: "all", unreadCount: 0 },
  { id: "updates", slug: "north-updates", name: "North Updates", kind: "updates", description: "Signed North announcements.", role: "member", status: "active", notificationLevel: "all", unreadCount: 1 },
  { id: "dad-room", name: "Dad", kind: "direct", description: "Private conversation", role: "member", status: "active", notificationLevel: "all", peer: dad, unreadCount: 1 },
];
const messages = new Map([["dad-room", [{ id: "m1", roomId: "dad-room", clientMessageId: "dad-1", sender: dad, kind: "text", body: "Send me the new workout when it is ready.", createdAt: new Date().toISOString() }]]]);
const preferences = Object.fromEntries(["direct_messages", "room_messages", "trainer_messages", "feature_announcements", "release_announcements", "incident_notices", "service_notices", "security_notices", "sounds"].map((key) => [key, true]));
Object.assign(preferences, { preview_message_text: false, read_receipts: false, typing_indicators: false, presence: false });
let messagingOffline = false;
let pendingStreamMessage = null;
const connectionRequests = [];
const trainerRooms = [];

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Vite did not start.");
}

  async function waitForState(predicate, message) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(message);
  }

async function createDevice(browser, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.addInitScript(({ account }) => {
    localStorage.setItem("north-account-session-v1", JSON.stringify(account));
    localStorage.setItem(`north-onboarding-complete:${account.user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${account.user.id}`, JSON.stringify({ completed: true, step: 4 }));
    localStorage.setItem("north-release-notes-dismissed", "north-0.8-together");
  }, { account });
  await context.route("**/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api(?=\/v1\/)/, "");
    if (path === "/v1/together/events") {
      const message = pendingStreamMessage;
      pendingStreamMessage = null;
      return route.fulfill({ contentType: "text/event-stream", body: `event: ready\ndata: {}\n\n${message ? `event: message\ndata: ${JSON.stringify(message)}\n\nevent: unread\ndata: ${JSON.stringify({ roomId: message.roomId })}\n\n` : ""}` });
    }
    if (path === "/v1/together/inbox") return route.fulfill({ json: { rooms } });
    if (path === "/v1/together/requests" && request.method() === "GET") return route.fulfill({ json: { requests: [] } });
    if (path === "/v1/together/requests" && request.method() === "POST") {
      connectionRequests.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { connection: { id: "connection-probe", status: "pending", roomId: null } } });
    }
    if (path === "/v1/together/trainer-rooms" && request.method() === "POST") {
      trainerRooms.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { room: { id: "trainer-probe" } } });
    }
    if (path === "/v1/together/preferences" && request.method() === "GET") return route.fulfill({ json: { preferences } });
    if (path === "/v1/together/preferences" && request.method() === "PATCH") {
      Object.assign(preferences, request.postDataJSON());
      return route.fulfill({ json: { preferences } });
    }
    if (path === "/v1/together/rooms/dad-room/info") return route.fulfill({ json: { room: { id: "dad-room", name: "Dad", description: "Private conversation", kind: "direct", role: "member", memberCount: 2 }, members: [{ ...account.user, role: "member", status: "active" }, { ...dad, role: "member", status: "active" }] } });
    const history = path.match(/^\/v1\/together\/rooms\/([^/]+)\/messages$/);
    if (history && request.method() === "GET") return route.fulfill({ json: { room: rooms.find((room) => room.id === history[1]), messages: messages.get(history[1]) ?? [], nextCursor: null } });
    if (history && request.method() === "POST") {
      if (messagingOffline) return route.fulfill({ status: 503, json: { error: "Offline for browser proof" } });
      const body = JSON.parse(request.postData() ?? "{}");
      const existing = (messages.get(history[1]) ?? []).find((message) => message.clientMessageId === body.clientMessageId);
      if (existing) return route.fulfill({ json: { message: existing, deduplicated: true } });
      const message = { id: `m-${Date.now()}`, roomId: history[1], clientMessageId: body.clientMessageId, sender: account.user, kind: body.kind ?? "text", body: body.body, sharedPayload: body.sharedPayload, createdAt: new Date().toISOString() };
      messages.set(history[1], [...(messages.get(history[1]) ?? []), message]);
      return route.fulfill({ json: { message, deduplicated: false } });
    }
    const removal = path.match(/^\/v1\/together\/messages\/([^/]+)$/);
    if (removal && request.method() === "DELETE") {
      for (const [roomId, roomMessages] of messages) messages.set(roomId, roomMessages.map((message) => message.id === removal[1] ? { ...message, body: "Message removed", sharedPayload: null, removedAt: new Date().toISOString() } : message));
      return route.fulfill({ status: 204 });
    }
    if (/\/v1\/together\/rooms\/[^/]+\/read$/.test(path)) return route.fulfill({ status: 204 });
    return route.fulfill({ json: { status: "applied", documents: [], devices: [], connections: [], types: [], activities: [], daily: [] } });
  });
  return context;
}

try {
  await waitForServer();
  await mkdir("artifacts/visual", { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const desktop = await createDevice(browser, { width: 1440, height: 1000 });
  const mobile = await createDevice(browser, { width: 430, height: 932 });
  const desktopPage = await desktop.newPage();
  const browserErrors = [];
  desktopPage.on("pageerror", (error) => browserErrors.push(error.message));
  await desktopPage.goto(`${base}?open=together`);
  await desktopPage.locator(".together-screen").waitFor();
  await desktopPage.locator(".together-room").first().waitFor();
  for (const room of ["General", "Help", "North Updates", "Dad"]) assert.equal(await desktopPage.locator(".together-room", { hasText: room }).count() > 0, true, `${room} is missing`);
  await desktopPage.getByRole("button", { name: "Connect" }).click();
  await desktopPage.getByRole("textbox", { name: /North username/ }).fill("morgan");
  await desktopPage.getByRole("button", { name: "Send request" }).click();
  await desktopPage.getByText("Connection request sent to @morgan.").waitFor();
  assert.deepEqual(connectionRequests, [{ username: "morgan" }]);
  await desktopPage.getByRole("button", { name: "Trainer room" }).click();
  await desktopPage.getByRole("textbox", { name: "Room name" }).fill("Morgan training");
  await desktopPage.getByRole("textbox", { name: /North username/ }).fill("morgan");
  await desktopPage.getByRole("button", { name: "Create room" }).click();
  await desktopPage.getByText("Trainer room created. The invited member will see it in Together.").waitFor();
  assert.deepEqual(trainerRooms, [{ username: "morgan", name: "Morgan training", invitedRole: "trainer" }]);
  await desktopPage.getByRole("button", { name: "Together notifications" }).click();
  const notificationDialog = desktopPage.getByRole("dialog", { name: "What is waiting" });
  await notificationDialog.waitFor();
  assert.equal(await notificationDialog.getByRole("button", { name: /Dad/ }).count(), 1, "Dad unread notification is missing");
  assert.equal(await notificationDialog.getByRole("button", { name: /North Updates/ }).count(), 1, "North Updates notification is missing");
  await notificationDialog.getByRole("button", { name: /Dad/ }).click();
  await desktopPage.getByRole("button", { name: "Together settings" }).click();
  const settingsDialog = desktopPage.getByRole("dialog", { name: "Notifications and privacy" });
  await settingsDialog.waitFor();
  assert.equal(await settingsDialog.getByRole("switch").count(), 13, "Together settings are incomplete");
  await settingsDialog.getByRole("button", { name: "Close Together settings" }).click();
  const liveMessage = { id: "m-live", roomId: "dad-room", clientMessageId: "dad-live", sender: dad, kind: "text", body: "This arrived live without a refresh.", createdAt: new Date().toISOString() };
  messages.set("dad-room", [...messages.get("dad-room"), liveMessage]);
  pendingStreamMessage = liveMessage;
  await desktopPage.getByText(liveMessage.body).waitFor({ timeout: 8000 });
  await desktopPage.locator('[aria-label="Conversation actions"]').click();
  const actionGeometry = await desktopPage.locator(".together-actions button").evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { left: box.left, width: box.width, height: box.height, border: getComputedStyle(button).borderWidth };
  }));
  assert.ok(actionGeometry.length > 1, "Conversation actions are missing");
  assert.ok(actionGeometry.every((item) => item.left === actionGeometry[0].left && item.width === actionGeometry[0].width && item.width > 100 && item.height !== 38 && item.border === "0px"), "Conversation actions are not aligned full-width rows");
  await desktopPage.getByRole("button", { name: "Conversation info" }).click();
  const roomInfoDialog = desktopPage.getByRole("dialog", { name: "Dad" });
  await roomInfoDialog.waitFor();
  assert.match(await roomInfoDialog.innerText(), /members\s+2/i);
  assert.match(await roomInfoDialog.innerText(), /@dad/);
  await roomInfoDialog.getByRole("button", { name: "Close conversation info" }).click();
  await desktopPage.getByLabel("Message Dad").fill("I made the new workout for you.");
  await desktopPage.getByRole("button", { name: "Send message" }).click();
  const sentMessage = desktopPage.locator(".together-message", { hasText: "I made the new workout for you." });
  await sentMessage.first().waitFor();
  assert.equal(await sentMessage.count(), 1, "Together rendered a message more than once");
  await waitForState(() => messages.get("dad-room").some((message) => message.body === "I made the new workout for you."), "Mock server did not retain the desktop send");
  await desktopPage.locator('[aria-label="Share something"]').click();
  await desktopPage.getByRole("button", { name: "Progress update" }).click();
  await desktopPage.getByLabel("Title").fill("A steady week");
  await desktopPage.getByLabel("Detail").fill("Three planned sessions completed without changing Dad's records.");
  await desktopPage.getByRole("button", { name: "Send to Dad" }).click();
  await desktopPage.locator(".together-shared-card", { hasText: "A steady week" }).waitFor();
  assert.equal(messages.get("dad-room").at(-1)?.kind, "progress");
  desktopPage.once("dialog", (dialog) => dialog.accept());
  await desktopPage.getByRole("button", { name: "Remove shared progress" }).click();
  await desktopPage.getByText(/Shared item removed/).waitFor();
  assert.equal(await desktopPage.locator(".together-shared-card", { hasText: "A steady week" }).count(), 0, "Removed card is still visible");
  messagingOffline = true;
  await desktopPage.getByLabel("Message Dad").fill("Queue this through the outage.");
  await desktopPage.getByRole("button", { name: "Send message" }).click();
  await desktopPage.getByRole("button", { name: /Retry/ }).waitFor();
  messagingOffline = false;
  await desktopPage.reload();
  await desktopPage.locator(".together-screen").waitFor();
  await desktopPage.locator(".together-room", { hasText: "Dad" }).click();
  await desktopPage.getByText("Queue this through the outage.").waitFor();

  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${base}?open=together&room=dad-room`);
  await mobilePage.locator(".together-screen").waitFor();
  await mobilePage.locator(".together-transcript").waitFor();
  await mobilePage.getByText("I made the new workout for you.").waitFor();
  assert.match(await mobilePage.locator(".together-transcript").innerText(), /I made the new workout for you\./, "Mobile did not receive the desktop message");
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, "Together overflows on mobile");

  messages.set("dad-room", [...messages.get("dad-room"), { id: "m-reply", roomId: "dad-room", clientMessageId: "dad-reply", sender: dad, kind: "text", body: "Got it. I will start tomorrow.", createdAt: new Date().toISOString() }]);
  await desktopPage.reload();
  await desktopPage.locator(".together-screen").waitFor();
  await desktopPage.locator(".together-room", { hasText: "Dad" }).click();
  await desktopPage.getByText("Got it. I will start tomorrow.").waitFor();
  await desktopPage.locator(".together-room", { hasText: "North Updates" }).click();
  assert.match(await desktopPage.locator(".together-readonly").innerText(), /read-only.*signed by north/i, "Updates is not signed and read-only");
  assert.equal(await desktopPage.locator(".together-composer").count(), 0, "Updates exposed a message composer");
  assert.deepEqual(browserErrors, []);
  await mobilePage.screenshot({ path: "artifacts/visual/together-mobile.png", fullPage: true });
  await desktopPage.screenshot({ path: "artifacts/visual/together-desktop.png", fullPage: true });
  await desktop.close();
  await mobile.close();
  await browser.close();
  console.log("Together browser smoke passed: creation, continuity, notifications, settings, room info, reviewed cards, curated rooms, and read-only Updates.");
} finally {
  server.kill();
}