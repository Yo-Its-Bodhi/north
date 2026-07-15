import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const port = 4174;
const base = `http://127.0.0.1:${port}`;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const server = spawn("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not start.\n${serverOutput}`);
}

const account = { user: { id: "browser-test-user", username: "browser_test", displayName: "Browser Test", timezone: "America/Toronto" }, accessToken: "test", refreshToken: "test" };
const results = [];
async function check(name, operation) {
  const started = performance.now();
  await operation();
  results.push({ name, milliseconds: Math.round(performance.now() - started) });
}

try {
  await waitForServer();
  await mkdir("artifacts/visual", { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: "reduce" });
  await context.addInitScript(({ account }) => {
    localStorage.setItem("north-account-session-v1", JSON.stringify(account));
    localStorage.setItem(`north-onboarding-complete:${account.user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${account.user.id}`, new Date().toISOString());
    localStorage.setItem("north-profile-v1", JSON.stringify({ name: "Browser Test", direction: "Build strength and consistency", trainingDays: 3, units: "imperial", language: "English", tone: "Encouraging and direct", notifications: false, memoryEnabled: true, reducedMotion: true, largeText: false, highContrast: false, connectedServices: [], dismissedInsights: [], memoryCorrections: {} }));
  }, { account });
  await context.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/me/devices") return route.fulfill({ json: { devices: [], currentDeviceId: "test-device" } });
    if (path === "/v1/health/connections") return route.fulfill({ json: { connections: [] } });
    if (path === "/v1/health/summary") return route.fulfill({ json: { days: 30, types: [] } });
    if (path.includes("/resolve")) return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: { status: "applied", documents: [], serverTime: new Date().toISOString() } });
  });
  const page = await context.newPage();

  await check("primary destinations are reachable and free of horizontal overflow", async () => {
    await page.goto(base);
    await page.getByRole("heading", { name: "Good morning." }).waitFor();
    for (const destination of ["Today", "Journey", "Training", "Nova", "You"]) {
      await page.getByRole("button", { name: destination, exact: true }).last().click();
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${destination} overflows horizontally`);
      await page.screenshot({ path: `artifacts/visual/mobile-${destination.toLowerCase()}.png`, fullPage: true });
    }
  });

  await check("weekly plan can be selected, edited, and opened for preparation", async () => {
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("heading", { name: "Your rhythm" }).waitFor();
    await page.getByRole("button", { name: /View details/ }).click();
    await page.locator(".kind-picker button").filter({ hasText: /^strength$/i }).click();
    const sessionInput = page.locator(".plan-editor input").first();
    await sessionInput.fill("Automated strength session");
    await page.getByRole("button", { name: /Prepare this workout|Edit and prepare/ }).first().click();
    await page.getByRole("heading", { name: "Ready when you are." }).waitFor();
    await page.getByText("Add an exercise", { exact: false }).waitFor();
  });

  await check("exercise profiles provide honest media, anatomy, history and technique", async () => {
    await page.getByRole("button", { name: /View exercise/ }).first().click();
    await page.getByText("EXERCISE PROFILE").waitFor();
    await page.getByRole("heading", { name: "What does the work" }).waitFor();
    await page.getByRole("heading", { name: "Make every rep repeatable" }).waitFor();
    assert.ok(await page.getByText("COMMON MISTAKES").count() === 1);
    assert.ok(await page.getByText("SAFETY", { exact: true }).count() === 1);
    assert.equal(await page.locator(".exercise-demo-card img, .exercise-demo-fallback").count(), 1);
    await page.getByRole("button", { name: /Workout/ }).first().click();
  });

  await check("workout library supports search, preview, schedule, and start actions", async () => {
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByText("More training tools", { exact: true }).click();
    await page.getByText("Explore premade workouts", { exact: true }).click();
    await page.getByRole("heading", { name: "Find the right session." }).waitFor();
    await page.getByPlaceholder("Search workouts, exercises, or equipment").fill("dumbbell");
    assert.ok(await page.locator(".template-grid > article").count() > 0);
    const card = page.locator(".template-grid > article").first();
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    await page.locator(".template-metrics").waitFor();
    await page.getByRole("button", { name: /Library/ }).click();
    const actions = page.locator(".template-grid > article").first().locator(".template-quick-actions button");
    assert.equal(await actions.count(), 3);
  });

  await check("Nova creates an evidence-linked reply and a reversible plan proposal", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Nova", exact: true }).last().click();
    const input = page.getByPlaceholder("Ask about today, recovery, or your week");
    await input.fill("I am short on time today");
    await page.getByRole("button", { name: "Send to Nova" }).click();
    await page.getByText("PROPOSED PLAN CHANGE").waitFor();
    await page.getByText("Evidence and limits").last().click();
    assert.ok(await page.locator(".nova-evidence li").count() >= 1);
    await page.getByRole("button", { name: "Confirm change" }).click();
    await page.getByRole("button", { name: /Undo/ }).last().click();
    await page.getByText("PROPOSED PLAN CHANGE").waitFor();
  });

  await check("keyboard focus reaches primary navigation and all visible controls have names", async () => {
    await page.goto(base);
    await page.locator("button.brand").focus();
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim() }));
    assert.equal(focused.tag, "BUTTON");
    assert.ok(focused.name);
    const unnamed = await page.locator("button:visible").evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute("aria-label") || button.textContent?.trim() || button.getAttribute("title"))).map((button) => button.outerHTML));
    assert.equal(unnamed.length, 0, `visible buttons need accessible names: ${unnamed.join(" | ")}`);
  });

  await check("responsive layouts render at every audited width", async () => {
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 900 : 1000 });
      await page.goto(base);
      await page.getByRole("heading", { name: "Good morning." }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${width}px layout overflows`);
      if ([320, 768, 1440].includes(width)) await page.screenshot({ path: `artifacts/visual/today-${width}.png`, fullPage: true });
    }
  });

  await check("offline mode is explicit and the active experience remains usable", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await context.setOffline(true);
    await page.waitForTimeout(120);
    await page.getByText("Offline mode", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("heading", { name: "Own the work." }).waitFor();
    await context.setOffline(false);
  });

  await check("an interrupted workout survives a full page reload", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("button", { name: /Start workout/ }).click();
    const startButton = page.getByRole("button", { name: /Start workout/ }).last();
    if (await startButton.isVisible().catch(() => false)) await startButton.click();
    await page.locator(".workout-screen").waitFor();
    const firstInput = page.locator(".set-row:not(.set-head) input").first();
    await firstInput.fill("77");
    await page.reload();
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("button", { name: /Resume workout/ }).click();
    await page.locator(".workout-screen").waitFor();
    assert.equal(await page.locator(".set-row:not(.set-head) input").first().inputValue(), "77.0");
    await page.getByRole("button", { name: /Complete set 1/ }).last().click();
    await page.getByText("Set 1 saved. Rest timer started.").waitFor();
    assert.equal(await page.getByRole("button", { name: "Add 15 seconds to rest" }).count(), 1);
  });

  await check("public welcome and account form are usable without an existing session", async () => {
    const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(base);
    await publicPage.getByRole("heading", { name: "Find your direction." }).waitFor();
    await publicPage.getByRole("button", { name: /Create your North/ }).click();
    await publicPage.getByRole("heading", { name: "Create your North." }).waitFor();
    assert.equal(await publicPage.locator('input[autocomplete="username"]').count(), 1);
    assert.equal(await publicPage.locator('input[type="password"]').count(), 1);
    await publicPage.screenshot({ path: "artifacts/visual/onboarding-mobile.png", fullPage: true });
    await publicContext.close();
  });

  await browser.close();
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}
process.exit(0);
