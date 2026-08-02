import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const port = 4176;
const base = `http://127.0.0.1:${port}`;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDirectory = "artifacts/visual/workout-day-flow";
const reportPath = "reports/workout-day-flow-audit.json";
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not start.\n${serverOutput}`);
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const report = {
  generatedAt: new Date().toISOString(),
  flow: [],
  steps: [],
  consoleErrors: [],
  pageErrors: [],
};

let browser;
try {
  await waitForServer();
  await mkdir(outputDirectory, { recursive: true });
  await mkdir("reports", { recursive: true });

  browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const account = {
    user: { id: "workout-flow-audit", username: "workout_flow_audit", displayName: "Workout Flow Audit", timezone: "America/Toronto" },
    accessToken: "test",
    refreshToken: "test",
  };
  await context.addInitScript(({ account }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("north-account-session-v1", JSON.stringify(account));
    localStorage.setItem(`north-onboarding-complete:${account.user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${account.user.id}`, new Date().toISOString());
    localStorage.setItem("north-release-notes-dismissed", "north-0.6-the-whole-picture");
    localStorage.setItem("north-profile-v1", JSON.stringify({
      name: "Workout Flow Audit",
      direction: "Build strength and consistency",
      trainingDays: 3,
      units: "imperial",
      language: "English",
      tone: "Encouraging and direct",
      notifications: false,
      memoryEnabled: true,
      reducedMotion: true,
      largeText: false,
      highContrast: false,
      connectedServices: [],
      dismissedInsights: [],
      memoryCorrections: {},
    }));
  }, { account });

  await context.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/me/devices") return route.fulfill({ json: { devices: [], currentDeviceId: "workout-flow-device" } });
    if (path === "/v1/health/connections") return route.fulfill({ json: { connections: [] } });
    if (path === "/v1/health/summary") return route.fulfill({ json: { days: 30, types: [] } });
    if (path === "/v1/health/activities") return route.fulfill({ json: { activities: [] } });
    if (path === "/v1/health/context") return route.fulfill({ json: { days: 14, daily: [], latest_weight: null } });
    if (path === "/v1/nova/status") return route.fulfill({ json: { available: true, model: "audit", mode: "connected", usage: { period: "this_month", replies: 0, tokens: 0, estimatedCostMicros: 0 } } });
    if (path === "/v1/nova/bootstrap") return route.fulfill({ json: { conversations: [], goals: [], memories: [], pendingProposals: [] } });
    return route.fulfill({ json: { status: "applied", documents: [], serverTime: new Date().toISOString() } });
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push(message.text());
  });

  async function captureStep(name, keySelector) {
    for (const width of [320, 430]) {
      await page.setViewportSize({ width, height: 932 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const metrics = await page.evaluate((selector) => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        };
        const labelFor = (element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 80);
        const controls = [...document.querySelectorAll("main button, main a[href], main summary, main input, main select, main textarea")].filter((element) => visible(element) && !element.matches(":disabled") && !element.matches(".skip-link"));
        const targetViolations = controls.map((element) => {
          const box = element.getBoundingClientRect();
          return { label: labelFor(element), tag: element.tagName, width: Math.round(box.width * 10) / 10, height: Math.round(box.height * 10) / 10 };
        }).filter((item) => item.height < 44 && !(item.tag === "INPUT" && item.width >= 44));
        const textViolations = [...document.querySelectorAll("main *")].filter((element) => {
          const style = getComputedStyle(element);
          const text = element.textContent?.trim() || "";
          const hasDirectText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
          return visible(element) && hasDirectText && Number.parseFloat(style.fontSize) < 10 && !element.closest(".global-report-footer") && !["●", "·", "—"].includes(text);
        }).map((element) => ({ label: labelFor(element), size: getComputedStyle(element).fontSize }));
        const navigation = document.querySelector(".primary-nav");
        const navBox = navigation && visible(navigation) ? navigation.getBoundingClientRect() : null;
        const keyElement = selector ? document.querySelector(selector) : null;
        const keyBox = keyElement && visible(keyElement) ? keyElement.getBoundingClientRect() : null;
        return {
          viewport: { width: innerWidth, height: innerHeight },
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          documentHeight: document.documentElement.scrollHeight,
          targetViolations,
          textViolations,
          keyAction: keyBox ? { width: keyBox.width, height: keyBox.height, bottom: keyBox.bottom } : null,
          navigationTop: navBox?.top ?? null,
          keyActionOverlapsDock: Boolean(keyBox && navBox && keyBox.bottom > navBox.top && keyBox.top < navBox.bottom),
        };
      }, keySelector);
      report.steps.push({ name, width, ...metrics });
      assert.ok(metrics.horizontalOverflow <= 1, `${name} overflows horizontally by ${metrics.horizontalOverflow}px at ${width}px`);
      if (metrics.keyAction) {
        assert.ok(metrics.keyAction.height >= 44, `${name} key action is ${metrics.keyAction.height}px tall at ${width}px`);
        assert.equal(metrics.keyActionOverlapsDock, false, `${name} key action overlaps the dock at ${width}px`);
      }
      await page.screenshot({ path: `${outputDirectory}/${String(report.steps.length).padStart(2, "0")}-${safeName(name)}-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 430, height: 932 });
  }

  await page.goto(base);
  await page.locator(".today-screen").waitFor();
  await page.getByRole("button", { name: "Training", exact: true }).last().click();
  await page.locator(".training-destination").waitFor();
  report.flow.push("Opened Training");
  await captureStep("training landing", ".training-hero-actions .primary-button");

  await page.getByRole("button", { name: "Next week", exact: true }).click();
  const strengthDays = page.locator(".training-rhythm-strip button").filter({ hasText: "●" });
  assert.ok(await strengthDays.count() > 0, "Next week has no strength day to edit");
  await strengthDays.first().click();
  await page.locator(".training-hero.strength").waitFor();
  report.flow.push("Selected next week's first strength day");

  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await page.locator(".training-details-drawer").waitFor();
  await captureStep("day editor opened", ".training-details-drawer .primary-button");

  const sessionField = page.locator(".training-details-drawer > label").filter({ hasText: /^Session/ }).locator("input");
  await sessionField.fill("Mobile audit strength");
  await page.locator(".training-details-drawer > label").filter({ hasText: /^Plan note/ }).locator("textarea").fill("Mobile flow audit: controlled reps and clear transitions.");
  const firstPrescription = page.locator(".planned-workout-prescriptions article").first();
  await firstPrescription.locator('input[type="number"]').first().fill("4");
  await firstPrescription.locator('input:not([type="number"])').fill("10 reps");
  await firstPrescription.locator('input[type="number"]').last().fill("105");
  report.flow.push("Renamed the day and edited its first prescription");

  await page.getByRole("button", { name: "Edit this workout", exact: true }).click();
  const picker = page.locator(".training-details-drawer .exercise-picker-v2");
  await picker.waitFor();
  const addButton = picker.locator(".picker-v2-add:not(:disabled)").first();
  const addedExercise = (await addButton.getAttribute("aria-label"))?.replace(/^Add /, "") || "Unknown exercise";
  await addButton.click();
  await page.getByRole("button", { name: "Close exercise picker", exact: true }).click();
  report.addedExercise = addedExercise;
  report.flow.push(`Added ${addedExercise}`);
  await captureStep("day editor changed", ".plan-save-row button");

  await page.getByRole("button", { name: "Save this workout", exact: true }).click();
  await page.waitForTimeout(250);
  assert.equal(await sessionField.inputValue(), "Mobile audit strength");
  report.flow.push("Saved the edited day workout");

  await page.getByRole("button", { name: "Prepare this workout", exact: true }).click();
  await page.getByRole("heading", { name: "Ready when you are." }).waitFor();
  assert.match(await page.locator(".prepare-row").first().innerText(), /sets/i);
  assert.equal(await page.locator(".prepare-row").count() > 1, true, "Prepared workout did not retain multiple exercises");
  report.flow.push("Opened workout preparation with the edited plan");
  await captureStep("workout preparation", ".prepare-save-actions .primary-button");

  await page.getByRole("button", { name: "Adjust", exact: true }).first().click();
  const prescriptionEditor = page.locator(".prescription-editor").first();
  await prescriptionEditor.waitFor();
  await prescriptionEditor.locator('input[placeholder="3 sets · 8–12 reps"]').fill("4 sets · 10 controlled reps");
  await page.getByRole("button", { name: "Save workout setup", exact: true }).click();
  await page.waitForTimeout(200);
  report.flow.push("Adjusted and saved workout setup");
  await captureStep("workout setup adjusted", ".prepare-save-actions .primary-button");

  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.locator(".workout-screen").waitFor();
  assert.ok(await page.getByRole("button", { name: /Complete set 1/ }).count() > 0, "Active workout has no set-completion action");
  report.flow.push("Started the active workout");
  await captureStep("active workout start", ".workout-continue-button");

  await page.locator(".workout-continue-button").click();
  await page.getByRole("button", { name: "Add 15 seconds to rest" }).waitFor();
  report.flow.push("Completed the first set and opened the rest timer");
  await captureStep("first set completed", ".workout-continue-button");

  const activeState = await page.evaluate(() => ({
    title: document.querySelector(".workout-screen h1, .exercise-header-sticky h2")?.textContent?.trim() || "",
    completedSets: document.querySelectorAll(".set-check:has(svg)").length,
    restTimerVisible: Boolean(document.querySelector('[aria-label="Add 15 seconds to rest"]')),
    activeSessionStored: Boolean(localStorage.getItem("north-active-session-v1")),
  }));
  report.activeState = activeState;
  assert.equal(activeState.restTimerVisible, true);
  assert.equal(activeState.activeSessionStored, true);
  assert.deepEqual(report.consoleErrors, [], `Console errors: ${report.consoleErrors.join(" | ")}`);
  assert.deepEqual(report.pageErrors, [], `Page errors: ${report.pageErrors.join(" | ")}`);

  report.summary = {
    flowCompleted: true,
    screenshots: report.steps.length,
    zeroHorizontalOverflow: report.steps.every((step) => step.horizontalOverflow <= 1),
    noKeyActionDockOverlap: report.steps.every((step) => !step.keyActionOverlapsDock),
    targetViolationsByStep: report.steps.map((step) => ({ name: step.name, width: step.width, count: step.targetViolations.length })),
    textViolationsByStep: report.steps.map((step) => ({ name: step.name, width: step.width, count: step.textViolations.length })),
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    passed: true,
    reportPath,
    screenshots: report.steps.length,
    addedExercise,
    flow: report.flow,
    targetViolations: report.steps.reduce((total, step) => total + step.targetViolations.length, 0),
    textViolations: report.steps.reduce((total, step) => total + step.textViolations.length, 0),
  }, null, 2));
} finally {
  await browser?.close();
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}
