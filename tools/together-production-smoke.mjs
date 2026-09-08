import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.NORTH_PREVIEW_BASE || "http://127.0.0.1:4188";
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const alex = { id: "alex", username: "alex", displayName: "Alex", timezone: "America/Toronto" };
const dad = { id: "dad", username: "dad", displayName: "Dad", timezone: "America/Toronto" };
const template = { id: "personal-dad-strength", name: "Dad Strength", description: "A steady full-body session.", focus: "Full body", goal: "Strength", level: "Beginner", duration: 40, equipment: ["Dumbbell"], location: "Home", source: "personal", exercises: [{ exerciseName: "Goblet Squat", sets: 3, reps: "8-10", rest: 75 }] };
const messages = [];

async function createContext(browser, user, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.addInitScript(({ user, template }) => {
    const session = { user, accessToken: "test", refreshToken: "test" };
    localStorage.setItem("north-account-session-v1", JSON.stringify(session));
    localStorage.setItem(`north-onboarding-complete:${user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${user.id}`, new Date().toISOString());
    localStorage.setItem("north-release-notes-dismissed", "north-0.8-together");
    if (user.id === "alex") localStorage.setItem("north-personal-workouts-v1", JSON.stringify([template]));
  }, { user, template });
  await context.route("**/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api(?=\/v1\/)/, "");
    if (path === "/v1/together/inbox") return route.fulfill({ json: { rooms: [{ id: "dad-room", name: user.id === "alex" ? "Dad" : "Alex", kind: "direct", description: "Private conversation", role: "member", status: "active", notificationLevel: "all", peer: user.id === "alex" ? dad : alex, unreadCount: messages.length }] } });
    if (path === "/v1/together/requests") return route.fulfill({ json: { requests: [] } });
    if (path === "/v1/together/rooms/dad-room/messages" && request.method() === "GET") return route.fulfill({ json: { messages, nextCursor: null } });
    if (path === "/v1/together/rooms/dad-room/messages" && request.method() === "POST") {
      const input = request.postDataJSON();
      const message = { id: "shared-workout-message", roomId: "dad-room", clientMessageId: input.clientMessageId, sender: user, kind: input.kind, body: input.body, sharedPayload: input.sharedPayload, createdAt: new Date().toISOString() };
      messages.splice(0, messages.length, message);
      return route.fulfill({ status: 201, json: { message, deduplicated: false } });
    }
    if (path === "/v1/together/messages/shared-workout-message/workout-copy") return route.fulfill({ json: { template: { ...template, id: request.postDataJSON().copyId, source: "personal" } } });
    if (path.endsWith("/read")) return route.fulfill({ status: 204 });
    if (path === "/v1/me/devices") return route.fulfill({ json: { devices: [], currentDeviceId: "browser" } });
    if (path === "/v1/health/connections") return route.fulfill({ json: { connections: [] } });
    if (path === "/v1/health/summary") return route.fulfill({ json: { days: 30, types: [] } });
    if (path === "/v1/nova/status") return route.fulfill({ json: { available: true, model: "test", mode: "connected", usage: {} } });
    if (path === "/v1/nova/bootstrap") return route.fulfill({ json: { conversations: [], goals: [], memories: [], pendingProposals: [] } });
    return route.fulfill({ json: { status: "applied", documents: [], items: [], activities: [], daily: [], serverTime: new Date().toISOString() } });
  });
  return context;
}

const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  const senderContext = await createContext(browser, alex, { width: 1440, height: 1000 });
  const sender = await senderContext.newPage();
  const senderErrors = [];
  sender.on("pageerror", (error) => senderErrors.push(error.message));
  await sender.goto(`${base}?open=training`);
  await sender.locator(".training-destination").waitFor();
  await sender.getByRole("button", { name: /My workouts/ }).first().click();
  await sender.locator(".workout-library-screen").waitFor();
  await sender.locator(".template-open", { hasText: "Dad Strength" }).click();
  await sender.getByRole("button", { name: "Share in Together" }).click();
  await sender.locator(".together-room", { hasText: "Dad" }).click();
  await sender.locator(".together-share-review", { hasText: "Dad Strength" }).waitFor();
  await sender.getByRole("button", { name: "Send to Dad" }).click();
  await sender.locator(".together-workout-card", { hasText: "Dad Strength" }).waitFor();
  assert.equal(messages[0]?.kind, "workout");
  assert.equal(messages[0]?.sharedPayload?.template?.name, "Dad Strength");
  assert.deepEqual(senderErrors, []);

  const recipientContext = await createContext(browser, dad, { width: 430, height: 932 });
  const recipient = await recipientContext.newPage();
  const recipientErrors = [];
  recipient.on("pageerror", (error) => recipientErrors.push(error.message));
  await recipient.goto(`${base}?open=together`);
  await recipient.locator(".together-room", { hasText: "Alex" }).click();
  await recipient.getByRole("button", { name: "Save to My Workouts" }).click();
  await recipient.getByText("Saved Dad Strength to My Workouts.").waitFor();
  await recipient.waitForFunction(() => JSON.parse(localStorage.getItem("north-personal-workouts-v1") || "[]").some((workout) => workout.name === "Dad Strength" && workout.source === "personal"));
  assert.equal(await recipient.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  assert.deepEqual(recipientErrors, []);
  await senderContext.close();
  await recipientContext.close();
  console.log("Together production smoke passed: reviewed send, canonical card, independent recipient save, and mobile fit.");
} finally {
  await browser.close();
}