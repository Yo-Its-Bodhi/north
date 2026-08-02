import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const port = 4174;
const base = `http://127.0.0.1:${port}`;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const torontoDateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
const testDate = `${torontoDateParts.year}-${torontoDateParts.month}-${torontoDateParts.day}`;
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
const checkFilter = process.env.NORTH_BROWSER_CHECK?.toLowerCase();
async function check(name, operation) {
  if (checkFilter && !name.toLowerCase().includes(checkFilter)) return;
  const started = performance.now();
  await operation();
  results.push({ name, milliseconds: Math.round(performance.now() - started) });
}

try {
  await waitForServer();
  await mkdir("artifacts/visual", { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: "reduce", serviceWorkers: "block" });
  await context.addInitScript(({ account }) => {
    localStorage.setItem("north-account-session-v1", JSON.stringify(account));
    localStorage.setItem(`north-onboarding-complete:${account.user.id}`, new Date().toISOString());
    localStorage.setItem(`north-product-tour-v1:${account.user.id}`, new Date().toISOString());
    localStorage.setItem("north-release-notes-dismissed", "north-0.6-the-whole-picture");
    localStorage.setItem("north-profile-v1", JSON.stringify({ name: "Browser Test", direction: "Build strength and consistency", trainingDays: 3, units: "imperial", language: "English", tone: "Encouraging and direct", notifications: false, memoryEnabled: true, reducedMotion: true, largeText: false, highContrast: false, connectedServices: [], dismissedInsights: [], memoryCorrections: {} }));
  }, { account });
  await context.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/me/devices") return route.fulfill({ json: { devices: [], currentDeviceId: "test-device" } });
    if (path === "/v1/health/connections") return route.fulfill({ json: { connections: [{ provider: "health_connect", status: "connected", scopes: ["steps", "sleep", "exercise"], source_apps: ["Samsung Health"], preferences: { workouts: true, dailyMovement: true, sleepRecovery: true, bodyMeasurements: false }, connected_at: `${testDate}T06:00:00.000Z`, import_from: `${testDate}T06:00:00.000Z`, last_sync_at: `${testDate}T12:00:00.000Z` }] } });
    if (path === "/v1/health/summary") return route.fulfill({ json: { days: 30, types: [] } });
    if (path === "/v1/health/activities") return route.fulfill({ json: { activities: [{ id: "browser-health-ride", started_at: `${testDate}T07:00:00.000Z`, ended_at: `${testDate}T07:46:00.000Z`, title: "Morning ride", notes: "Steady ride", recording_method: "actively_recorded", kind: "bike", exercise_type: 8, distance_metres: 18400, duration_minutes: 46, source_app: "Samsung Health" }] } });
    if (path === "/v1/health/context") return route.fulfill({ json: { days: 14, daily: [{ date: testDate, steps: 7842, distance_metres: 6200, active_calories: 430, total_calories: 2180, active_minutes: 64, sleep_minutes: 448 }], latest_weight: null } });
    if (path === "/v1/nova/status") return route.fulfill({ json: { available: true, model: "test-model", mode: "connected", usage: { period: "this_month", replies: 0, tokens: 0, estimatedCostMicros: 0 } } });
    if (path === "/v1/nova/bootstrap") return route.fulfill({ json: { conversations: [], goals: [], memories: [], pendingProposals: [] } });
    if (path === "/v1/nova/conversations" && route.request().method() === "POST") return route.fulfill({ json: { id: "browser-conversation" } });
    if (path === "/v1/nova/conversations/browser-conversation/messages") return route.fulfill({ json: { messages: [] } });
    if (path === "/v1/nova/conversations/browser-conversation/respond") {
      const text = JSON.parse(route.request().postData() ?? "{}").text;
      if (text === "Add a 60-minute bike ride after my lift") return route.fulfill({ json: { userMessage: { id: "bike-user-message", role: "user", content: text, created_at: new Date().toISOString() }, assistant: { id: "bike-assistant-message", role: "assistant", content: "I prepared the ride for your approval.", evidence: ["Today's saved strength plan"], confidence: "high", created_at: new Date().toISOString() }, proposal: { id: "bike-proposal", source_message_id: "bike-assistant-message", action_type: "adjust_plan_day", risk_level: "meaningful", summary: "Add a 60-minute steady bike ride after today’s strength session", reason: "You explicitly asked to add this ride.", payload: { date: testDate, title: "Upper body strength", sessions: [{ kind: "bike", title: "60-minute steady bike ride", role: "secondary", duration: "60", distance: "", note: "5 min easy warm-up · 50 min steady Zone 2 · 5 min easy cool-down" }] }, status: "pending" } } });
      return route.fulfill({ json: { userMessage: { id: "test-user-message", role: "user", content: "I am short on time today", created_at: new Date().toISOString() }, assistant: { id: "test-assistant-message", role: "assistant", content: "I can record how you are arriving, but you stay in control.", evidence: ["Today's saved plan"], confidence: "moderate", created_at: new Date().toISOString() }, proposal: { id: "test-proposal", source_message_id: "test-assistant-message", action_type: "add_check_in", risk_level: "meaningful", summary: "Record today's check-in", reason: "This gives the plan useful recovery context.", payload: { date: "2026-07-18", energy: 3, soreness: 2, note: "Short on time" }, status: "pending" } } });
    }
    if (path === "/v1/nova/proposals/test-proposal/approve") return route.fulfill({ json: { id: "test-proposal", action_type: "add_check_in", risk_level: "meaningful", summary: "Record today's check-in", reason: "This gives the plan useful recovery context.", payload: { date: "2026-07-18", energy: 3, soreness: 2, note: "Short on time" }, status: "approved" } });
    if (path === "/v1/nova/proposals/test-proposal/applied") return route.fulfill({ json: { proposalId: "test-proposal", status: "applied" } });
    if (path === "/v1/nova/proposals/bike-proposal/approve") return route.fulfill({ json: { id: "bike-proposal", action_type: "adjust_plan_day", risk_level: "meaningful", summary: "Add a 60-minute steady bike ride after today’s strength session", reason: "You explicitly asked to add this ride.", payload: { date: testDate, title: "Upper body strength", sessions: [{ kind: "bike", title: "60-minute steady bike ride", role: "secondary", duration: "60", distance: "", note: "5 min easy warm-up · 50 min steady Zone 2 · 5 min easy cool-down" }] }, status: "approved" } });
    if (path === "/v1/nova/proposals/bike-proposal/applied") return route.fulfill({ json: { proposalId: "bike-proposal", status: "applied" } });
    if (path.includes("/resolve")) return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: { status: "applied", documents: [], serverTime: new Date().toISOString() } });
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("ERR_INTERNET_DISCONNECTED")) consoleErrors.push(`console: ${message.text()}`); });

  await check("primary destinations are reachable and free of horizontal overflow", async () => {
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    for (const destination of ["Today", "Journey", "Training", "Nova", "You"]) {
      await page.getByRole("button", { name: destination, exact: true }).last().click();
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${destination} overflows horizontally`);
      const nativeControls = await page.evaluate(() => [...document.querySelectorAll("button,input,textarea,select")].filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (box.width === 0 || box.height === 0 || style.display === "none" || style.visibility === "hidden") return false;
        if (element instanceof HTMLInputElement && ["checkbox", "radio", "file", "range"].includes(element.type)) return false;
        return style.borderStyle === "outset" || style.backgroundColor === "rgb(240, 240, 240)";
      }).map((element) => element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName));
      assert.deepEqual(nativeControls, [], `${destination} contains browser-default controls: ${nativeControls.join(", ")}`);
      await page.screenshot({ path: `artifacts/visual/mobile-${destination.toLowerCase()}.png`, fullPage: true });
    }
  });

  await check("mobile shell geometry and typography stay stable across every palette", async () => {
    const palettes = [
      ["off-white", "morning"], ["rosewater", "morning"], ["cloud", "morning"], ["sage", "morning"],
      ["teal", "night"], ["carbon", "night"], ["midnight", "night"], ["plum", "night"], ["pine", "night"],
      ["fuchsia", "night"], ["gold", "night"], ["solstice", "morning"], ["lavender", "morning"], ["spectrum", "morning"],
    ];
    await page.getByRole("button", { name: "Journey", exact: true }).last().click();
    for (const [palette, mode] of palettes) {
      const metrics = await page.evaluate(({ palette, mode }) => {
        document.documentElement.dataset.palette = palette;
        document.documentElement.dataset.theme = mode;
        const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
        const header = box(".destination-brand-header");
        const nav = box(".primary-nav");
        const topbar = box(".topbar");
        const title = getComputedStyle(document.querySelector(".destination-brand-header h1"));
        const buttons = [...document.querySelectorAll(".primary-nav > button")];
        const visibleButtons = buttons.filter((button) => getComputedStyle(button).display !== "none");
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const parse = (value, background = [255, 255, 255]) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const [red, green, blue, alphaByte] = context.getImageData(0, 0, 1, 1).data;
          const alpha = alphaByte / 255;
          return [red, green, blue].map((channel, index) => channel * alpha + background[index] * (1 - alpha));
        };
        const luminance = (rgb) => {
          const values = rgb.map((value) => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
          return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
        };
        const surfaceProbe = document.createElement("span");
        surfaceProbe.style.backgroundColor = "var(--north-rail-surface)";
        document.body.append(surfaceProbe);
        const surfaceColor = parse(getComputedStyle(surfaceProbe).backgroundColor);
        const surfaceLuminance = luminance(surfaceColor);
        surfaceProbe.remove();
        const labelContrast = visibleButtons.map((button) => {
          const textLuminance = luminance(parse(getComputedStyle(button).color, surfaceColor));
          return (Math.max(surfaceLuminance, textLuminance) + .05) / (Math.min(surfaceLuminance, textLuminance) + .05);
        });
        return {
          destinations: buttons.map((button) => button.getAttribute("data-nav-destination")),
          visibleDestinations: visibleButtons.map((button) => button.getAttribute("data-nav-destination")),
          minimumTargetHeight: Math.min(...visibleButtons.map((button) => button.getBoundingClientRect().height)),
          minimumLabelSize: Math.min(...visibleButtons.map((button) => Number.parseFloat(getComputedStyle(button).fontSize))),
          minimumLabelContrast: Math.min(...labelContrast),
          topbarHeight: topbar?.height,
          headerHeight: header?.height,
          titleSize: title.fontSize,
          navHeight: nav?.height,
          navBottom: nav?.bottom,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, { palette, mode });
      assert.deepEqual(metrics.destinations, ["today", "journey", "training", "nova-workout-builder", "nova", "you"], `${palette} nav identity drifted`);
      assert.deepEqual(metrics.visibleDestinations, ["today", "journey", "training", "nova", "you"], `${palette} mobile nav composition drifted`);
      assert.equal(metrics.topbarHeight, 78, `${palette} topbar height drifted`);
      assert.equal(metrics.headerHeight, 148, `${palette} destination header height drifted`);
      assert.equal(metrics.titleSize, "42px", `${palette} destination title size drifted`);
      assert.equal(metrics.navHeight, 76, `${palette} dock height drifted`);
      assert.equal(metrics.navBottom, 932, `${palette} dock detached from the viewport`);
      assert.ok(metrics.minimumTargetHeight >= 56, `${palette} dock target is ${metrics.minimumTargetHeight}px high`);
      assert.ok(metrics.minimumLabelSize >= 10, `${palette} dock label is ${metrics.minimumLabelSize}px`);
      assert.ok(metrics.minimumLabelContrast >= 4.5, `${palette} dock label contrast is ${metrics.minimumLabelContrast.toFixed(2)}:1`);
      assert.ok(metrics.overflow <= 1, `${palette} shell overflows by ${metrics.overflow}px`);
    }
  });

  await check("universal mobile footer stays compact and clears the dock", async () => {
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    for (const width of [320, 430, 768]) {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 932 });
      await page.evaluate(async () => {
        for (let frame = 0; frame < 5; frame += 1) {
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
      const geometry = await page.evaluate(() => {
        const footer = document.querySelector(".global-report-footer").getBoundingClientRect();
        const report = document.querySelector(".global-report-footer .test-note-button").getBoundingClientRect();
        const nav = document.querySelector(".primary-nav").getBoundingClientRect();
        const brand = document.querySelector(".global-footer-brand").getBoundingClientRect();
        const copyright = document.querySelector(".global-footer-copyright").getBoundingClientRect();
        const compactText = [".global-footer-brand span", ".global-footer-copyright"].map((selector) => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize));
        return { footerHeight: footer.height, footerBottom: footer.bottom, reportWidth: report.width, reportHeight: report.height, minimumTextSize: Math.min(...compactText), navTop: nav.top, brandVisible: brand.width > 0 && brand.height > 0, copyrightVisible: copyright.width > 0 && copyright.height > 0, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.ok(geometry.footerHeight <= 80, `Footer is ${geometry.footerHeight}px tall at ${width}px`);
      assert.ok(geometry.reportWidth >= 44 && geometry.reportHeight >= 44, `Footer report target is ${geometry.reportWidth}x${geometry.reportHeight}px at ${width}px`);
      assert.ok(geometry.minimumTextSize >= 10, `Footer text is ${geometry.minimumTextSize}px at ${width}px`);
      assert.equal(geometry.brandVisible && geometry.copyrightVisible, true, `Footer identity is missing at ${width}px`);
      assert.ok(geometry.footerBottom <= geometry.navTop, `Footer overlaps the dock at ${width}px (${geometry.footerBottom} > ${geometry.navTop})`);
      assert.ok(geometry.overflow <= 1, `Footer overflows by ${geometry.overflow}px at ${width}px`);
      await page.screenshot({ path: `artifacts/visual/mobile-footer-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("primary mobile actions meet the touch target floor", async () => {
    await page.setViewportSize({ width: 320, height: 932 });
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    const destinations = [
      ["Journey", ".timeline-toolbar summary, .timeline-toolbar-menu button"],
      ["Training", ".training-rhythm-heading .choice-row button, .training-rhythm-heading > .text-button"],
      ["Nova", ".nova-error button"],
      ["You", ".you-edit-profile, .you-wellbeing > header button, .you-training-record > header button"],
    ];
    for (const [destination, selector] of destinations) {
      await page.getByRole("button", { name: destination, exact: true }).last().click();
      await page.waitForTimeout(80);
      const targets = await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      }).map((element) => {
        const box = element.getBoundingClientRect();
        return { label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName, width: box.width, height: box.height };
      }));
      for (const target of targets) assert.ok(target.height >= 44, `${destination} ${target.label} target is ${target.width}x${target.height}px`);
      if (destination === "Journey") {
        const sort = await page.locator(".timeline-sort-control").evaluate((element) => element.getBoundingClientRect().width);
        assert.ok(sort >= 44, `Journey sort target is ${sort}px wide`);
      }
    }
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("primary mobile destinations keep meaningful text legible", async () => {
    await page.setViewportSize({ width: 320, height: 932 });
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    for (const destination of ["Today", "Journey", "Training", "Nova", "You"]) {
      await page.getByRole("button", { name: destination, exact: true }).last().click();
      await page.waitForTimeout(80);
      const undersized = await page.locator("main *").evaluateAll((elements) => elements.filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const text = element.textContent?.trim() ?? "";
        const hasDirectText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
        return hasDirectText && style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && Number.parseFloat(style.fontSize) < 10 && !element.closest(".global-report-footer") && !["●", "·", "—"].includes(text);
      }).map((element) => ({ text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 60), size: getComputedStyle(element).fontSize })));
      assert.deepEqual(undersized, [], `${destination} has undersized meaningful text: ${JSON.stringify(undersized)}`);
    }
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("Nova keeps its mobile conversation and composer within the usable viewport", async () => {
    await page.getByRole("button", { name: "Nova", exact: true }).last().click();
    await page.locator(".nova-screen").waitFor();
    const geometry = await page.evaluate(() => {
      const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      const header = box(".nova-page-heading");
      const transcript = document.querySelector(".conversation-surface");
      const message = document.querySelector(".nova-message p");
      const input = box(".nova-input input");
      const send = box(".nova-input button");
      const composer = box(".nova-input");
      const navigation = box(".primary-nav");
      return {
        headerHeight: header?.height ?? 0,
        messageFontSize: message ? Number.parseFloat(getComputedStyle(message).fontSize) : 0,
        transcriptOverflow: transcript ? getComputedStyle(transcript).overflowY : "",
        inputHeight: input?.height ?? 0,
        sendWidth: send?.width ?? 0,
        sendHeight: send?.height ?? 0,
        composerBottom: composer?.bottom ?? Infinity,
        navigationTop: navigation?.top ?? 0,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.ok(geometry.headerHeight > 0 && geometry.headerHeight <= 100, `Nova mobile header is ${geometry.headerHeight}px tall`);
    assert.ok(geometry.messageFontSize > 0 && geometry.messageFontSize <= 14, `Nova message copy is ${geometry.messageFontSize}px`);
    assert.equal(geometry.transcriptOverflow, "auto");
    assert.ok(geometry.inputHeight >= 44, `Nova input is only ${geometry.inputHeight}px tall`);
    assert.ok(geometry.sendWidth >= 44 && geometry.sendHeight >= 44, `Nova send target is ${geometry.sendWidth}x${geometry.sendHeight}px`);
    assert.ok(geometry.composerBottom <= geometry.navigationTop, "Nova composer overlaps the mobile navigation");
    assert.ok(geometry.horizontalOverflow <= 1, `Nova overflows horizontally by ${geometry.horizontalOverflow}px`);
  });

  await check("Journey progressively discloses secondary analysis on mobile only", async () => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.getByRole("button", { name: "Journey", exact: true }).last().click();
    await page.getByRole("button", { name: "Insights", exact: true }).click();
    const atlasDisclosure = page.getByRole("button", { name: /Explore chart and evidence/ });
    const atlasDetail = page.locator("#atlas-detail-content");
    const disclosure = page.getByRole("button", { name: /More analysis/ });
    const secondaryAnalysis = page.locator("#journey-secondary-analysis");
    await atlasDisclosure.waitFor();
    assert.equal(await atlasDisclosure.getAttribute("aria-expanded"), "false");
    assert.equal(await atlasDetail.isVisible(), false, "Atlas detail should start collapsed on mobile");
    await atlasDisclosure.click();
    assert.equal(await atlasDetail.isVisible(), true, "Atlas chart and evidence should open on request");
    await atlasDisclosure.click();
    assert.equal(await atlasDetail.isVisible(), false, "Atlas chart and evidence should close again");
    await disclosure.waitFor();
    assert.equal(await disclosure.getAttribute("aria-expanded"), "false");
    assert.equal(await secondaryAnalysis.isVisible(), false, "Journey secondary analysis should start collapsed on mobile");
    await disclosure.click();
    assert.equal(await disclosure.getAttribute("aria-expanded"), "true");
    assert.equal(await secondaryAnalysis.isVisible(), true, "Journey secondary analysis should open on request");

    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await atlasDisclosure.isVisible(), false, "Atlas disclosure should remain mobile-only");
    assert.equal(await atlasDetail.isVisible(), true, "Atlas chart and evidence should remain visible on desktop");
    assert.equal(await disclosure.isVisible(), false, "Journey disclosure should remain mobile-only");
    assert.equal(await secondaryAnalysis.isVisible(), true, "Journey analysis should remain fully visible on desktop");
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("Training composes build and quick-log tools for tablet without compressing mobile", async () => {
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    const choices = page.locator(".training-desktop-choices");
    for (const [width, expectedDisplay] of [[759, "block"], [760, "grid"], [1023, "grid"]]) {
      await page.setViewportSize({ width, height: 1024 });
      const geometry = await choices.evaluate((element) => {
        const style = getComputedStyle(element);
        const children = [...element.children].map((child) => {
          const box = child.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, scrollWidth: child.scrollWidth, clientWidth: child.clientWidth };
        });
        return { display: style.display, columns: style.gridTemplateColumns.split(" ").length, children };
      });
      assert.equal(geometry.display, expectedDisplay, `Training tools use ${geometry.display} at ${width}px`);
      assert.equal(geometry.columns, expectedDisplay === "grid" ? 2 : 1, `Training tools use ${geometry.columns} columns at ${width}px`);
      assert.equal(geometry.children.every((child) => child.scrollWidth <= child.clientWidth), true, `Training tools clip at ${width}px`);
      assert.equal(Math.abs(geometry.children[0].y - geometry.children[1].y) <= 1, expectedDisplay === "grid", `Training tool order drifts at ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `Training overflows at ${width}px`);
    }
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("You and Settings disclose secondary mobile content without changing desktop", async () => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(base);
    await page.locator(".today-screen").waitFor();
    await page.getByRole("button", { name: "You", exact: true }).last().click();
    const trendsDisclosure = page.getByRole("button", { name: /View trends/ });
    const trends = page.locator("#you-trend-evidence");
    assert.equal(await trendsDisclosure.isVisible(), true, "You trend disclosure should be visible on mobile");
    assert.equal(await trends.isVisible(), false, "You trend evidence should start collapsed on mobile");
    await trendsDisclosure.click();
    assert.equal(await trends.isVisible(), true, "You trend evidence should open on request");

    await page.getByRole("button", { name: "Open account and app settings" }).click();
    const settingsMenu = page.getByRole("navigation", { name: "Settings sections" });
    assert.equal(await settingsMenu.isVisible(), true, "Settings should open on its mobile section index");
    assert.ok((await page.locator(".settings-screen").evaluate((element) => element.getBoundingClientRect().height)) < 1400, "Settings index should remain compact");
    await page.screenshot({ path: "artifacts/visual/mobile-settings-index.png", fullPage: true });
    for (const [name, visibleSelector] of [["Appearance", ".theme-picker"], ["App & updates", ".install-app-card"], ["Preferences & accessibility", ".preference-panel"], ["Privacy & services", ".privacy-panel"], ["Your data", ".data-controls"]]) {
      await settingsMenu.getByRole("button", { name: new RegExp(`^${name}`) }).click();
      assert.equal(await page.locator(visibleSelector).first().isVisible(), true, `${name} content should be visible`);
      assert.equal(await settingsMenu.isVisible(), false, `${name} should replace the Settings index`);
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      assert.equal(await settingsMenu.isVisible(), true, `${name} Back should return to the Settings index`);
    }
    await page.getByRole("button", { name: "You", exact: true }).first().click();
    assert.equal(await page.locator(".you-screen").isVisible(), true, "Settings index Back should return to You");

    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await trendsDisclosure.isVisible(), false, "You trend disclosure should remain mobile-only");
    assert.equal(await trends.isVisible(), true, "You trends should remain visible on desktop");
    await page.getByRole("button", { name: "Open account and app settings" }).click();
    assert.equal(await settingsMenu.isVisible(), false, "Settings section index should remain mobile-only");
    assert.equal(await page.locator(".install-app-card").isVisible(), true, "Desktop Settings should retain its full document layout");
    assert.equal(await page.locator(".privacy-panel").isVisible(), true, "Desktop privacy controls should remain visible");
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("connected Samsung context appears only on its intended product surfaces", async () => {
    for (const viewport of [{ width: 430, height: 932 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      await page.getByRole("button", { name: "Today", exact: true }).last().click();
      assert.match(await page.locator(".today-health-context").innerText(), /7,842\s*STEPS\s*64\s*MINS\s*2,180\s*KCAL\s*3\.9 mi\s*DISTANCE/);
      await page.getByRole("button", { name: "Journey", exact: true }).last().click();
      await page.getByText("Morning ride", { exact: true }).waitFor();
      await page.getByRole("button", { name: "You", exact: true }).last().click();
      assert.match(await page.locator(".you-health-hub").innerText(), /Purposeful sessions only/);
      await page.getByRole("button", { name: "Open account and app settings" }).click();
      if (viewport.width <= 700) await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: /^Privacy & services/ }).click();
      assert.equal(await page.locator(".health-permission-controls").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `Health settings overflow at ${viewport.width}px`);
    }
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("weekly plan can be selected, edited, and opened for preparation", async () => {
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("heading", { name: "Own the work." }).waitFor();
    await page.getByRole("button", { name: /Edit workout|Plan a workout/ }).click();
    await page.locator(".kind-picker button").filter({ hasText: /^strength$/i }).click();
    await page.getByRole("button", { name: "Edit this workout", exact: true }).click();
    const exercisePicker=page.locator(".exercise-picker-v2:visible");
    await exercisePicker.locator("input").fill("Dumbbell lateral raise");
    await page.getByRole("button", {name:/Filters/}).click();
    await page.locator(".exercise-filter-drawer").getByLabel("Equipment").selectOption({label:"Dumbbell"});
    await page.locator(".picker-filter-close").click();
    const addExercise=exercisePicker.getByRole("button", {name:/Add Dumbbell lateral raise/i});
    if (await addExercise.isEnabled()) await addExercise.click();
    const sessionInput = page.getByLabel("Session", {exact:true});
    await sessionInput.fill("Automated strength session");
    await page.getByRole("button", { name: /Prepare this workout|Edit and prepare/ }).first().click();
    await page.getByRole("heading", { name: "Ready when you are." }).waitFor();
    await page.getByText("Add an exercise", { exact: false }).waitFor();
  });

  await check("exercise profiles provide honest media, anatomy, history and technique", async () => {
    const anatomyStarted = performance.now();
    await page.getByRole("button", { name: /View exercise/ }).first().click();
    await page.getByText("EXERCISE", { exact: true }).waitFor();
    await page.getByText("Muscles worked", { exact: true }).click();
    await page.locator(".holo-anatomy").waitFor();
    await page.locator("#exercise-technique summary").click();
    await page.getByText("COMMON MISTAKES", { exact: true }).waitFor();
    assert.ok(await page.getByText("SAFETY", { exact: true }).count() === 1);
    assert.ok(await page.locator(".exercise-detail-demo, .exercise-demo-fallback").count() <= 1);
    assert.ok(await page.locator(".holo-active-muscles path").count() > 0);
    assert.ok(performance.now() - anatomyStarted < 2000, "exercise profile and anatomy should render within 2 seconds");
    for (const filter of ["Primary", "All", "Antagonists"]) await page.locator(".holo-role-filters").getByRole("button", { name: filter, exact: true }).click();
    await page.getByRole("button", { name: /Workout/ }).first().click();
  });

  await check("dark theme keeps core text contrast and reduced motion disables anatomy animation", async () => {
    await page.evaluate(() => localStorage.setItem("north-theme", "teal"));
    await page.reload();
    const result = await page.evaluate(() => {
      const probe=document.createElement("div");probe.style.cssText="color:var(--ink);background:var(--surface-solid)";document.body.append(probe);const computed=getComputedStyle(probe);
      const parse = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      const luminance = (rgb) => { const values=rgb.map((value)=>{const channel=value/255;return channel<=.03928?channel/12.92:((channel+.055)/1.055)**2.4});return .2126*values[0]+.7152*values[1]+.0722*values[2]; };
      const foreground=luminance(parse(computed.color)),background=luminance(parse(computed.backgroundColor));probe.remove();
      const contrast=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
      return { contrast, reducedAnimations:getComputedStyle(document.querySelector(".holo-scan") ?? document.body).animationName };
    });
    assert.ok(result.contrast >= 4.5, `dark theme text contrast is ${result.contrast.toFixed(2)}:1`);
    assert.equal(result.reducedAnimations, "none");
    await page.evaluate(() => localStorage.setItem("north-theme", "off-white"));
  });

  await check("desktop navigation rail keeps every destination label legible", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const contrast = await page.locator(".primary-nav").evaluate((rail) => {
      const parse = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      const luminance = (rgb) => {
        const values = rgb.map((value) => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
        return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
      };
      const railLuminance = luminance(parse(getComputedStyle(rail).backgroundColor));
      return [...rail.querySelectorAll("button")].map((button) => {
        const label = button.textContent?.trim() ?? "unnamed destination";
        const textLuminance = luminance(parse(getComputedStyle(button).color));
        return { label, ratio: (Math.max(railLuminance, textLuminance) + .05) / (Math.min(railLuminance, textLuminance) + .05) };
      });
    });
    for (const destination of contrast) assert.ok(destination.ratio >= 4.5, `${destination.label} rail contrast is ${destination.ratio.toFixed(2)}:1`);
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("Build workout keeps routine libraries and desktop navigation available", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base);
    await page.getByRole("button", { name: "Build workout", exact: true }).click();
    for (const action of ["My workouts", "Premade workouts", "Edit existing"]) await page.getByRole("button", { name: action, exact: true }).waitFor();
    await page.locator(".routine-library-switcher").getByRole("button", { name: "Premade workouts", exact: true }).click();
    await page.locator(".workout-library-screen").waitFor();
    const libraryColumns = await page.locator(".workout-library-screen .template-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    assert.equal(libraryColumns, 4, "wide desktop workout library should use four card columns");
    await page.getByRole("button", { name: "Build workout", exact: true }).click();
    await page.getByRole("button", { name: "Open Expert Studio", exact: true }).click();
    await page.locator(".workout-template-screen").waitFor();
    assert.equal(await page.locator(".primary-nav:visible").count(), 1, "desktop rail must remain available in Expert Studio");
    await page.setViewportSize({ width: 430, height: 932 });
  });

  await check("workout library supports search, preview, schedule, and start actions", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("button", { name: /Edit workout/ }).click();
    await page.getByRole("button", { name: /Premade workouts/ }).click();
    await page.getByRole("heading", { name: "Find the right session." }).waitFor();
    await page.locator('.workout-library-screen:visible input[placeholder="Search workouts, exercises, or equipment"]').fill("dumbbell");
    assert.ok(await page.locator(".template-grid > article").count() > 0);
    const card = page.locator(".template-grid > article").first();
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    await page.locator(".template-metrics").waitFor();
    await page.getByRole("button", { name: /Library/ }).click();
    const actions = page.locator(".template-grid > article").first().locator(".template-quick-actions button");
    assert.equal(await actions.count(), 3);
  });

  await check("scheduling workouts on separate days survives an immediate refresh", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.getByRole("button", { name: /Edit workout/ }).click();
    await page.getByRole("button", { name: /Premade workouts/ }).click();
    await page.getByRole("heading", { name: "Find the right session." }).waitFor();
    const templates = page.locator(".template-grid > article");
    const firstTemplate = templates.nth(0);
    const secondTemplate = templates.nth(1);
    const firstName = (await firstTemplate.locator(".template-open > strong").textContent())?.trim();
    const secondName = (await secondTemplate.locator(".template-open > strong").textContent())?.trim();
    assert.ok(firstName && secondName, "scheduled templates need visible names");
    await firstTemplate.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.locator(".schedule-picker > div > button").first().click();
    await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.locator(".workout-builder-option.premade").click();
    await page.getByRole("heading", { name: "Find the right session." }).waitFor();
    await secondTemplate.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.locator(".schedule-picker > div > button").nth(1).click();
    await page.reload();
    const scheduledTitles = await page.evaluate(() => JSON.parse(localStorage.getItem("north-week-plan-v1") ?? "[]").slice(0, 2).map((day) => day.title));
    assert.deepEqual(scheduledTitles, [firstName, secondName]);
  });

  await check("Nova creates an evidence-linked reply and an approval-gated action", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Nova", exact: true }).last().click();
    const input = page.getByPlaceholder("Ask about today, recovery, or your week");
    await input.fill("I am short on time today");
    await page.getByRole("button", { name: "Send to Nova" }).click();
    await page.getByText("NOVA PROPOSAL · YOUR APPROVAL REQUIRED").waitFor();
    await page.getByText("Evidence and limits").last().click();
    assert.ok(await page.locator(".nova-evidence li").count() >= 1);
    await page.getByRole("button", { name: "Review & confirm" }).click();
    await page.getByText("CHANGE APPLIED").waitFor();
    await page.getByText(/Saved to your North account/).waitFor();
  });

  await check("Nova adds an approved bike session without replacing today's strength workout", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Nova", exact: true }).last().click();
    const input = page.getByPlaceholder("Ask about today, recovery, or your week");
    await input.fill("Add a 60-minute bike ride after my lift");
    await page.getByRole("button", { name: "Send to Nova" }).click();
    await page.getByText("Add a 60-minute steady bike ride after today’s strength session").waitFor();
    await page.getByRole("button", { name: "Review & confirm" }).click();
    await page.waitForFunction((date) => JSON.parse(localStorage.getItem("north-week-plan-v1") ?? "[]").find((item) => item.date === date)?.sessions?.some((session) => session.title === "60-minute steady bike ride"), testDate);
    const day = await page.evaluate((date) => JSON.parse(localStorage.getItem("north-week-plan-v1") ?? "[]").find((item) => item.date === date), testDate);
    assert.equal(day.kind, "strength");
    assert.ok(Array.isArray(day.workout) && day.workout.length > 0);
    assert.equal(day.sessions?.[0]?.title, "60-minute steady bike ride");
  });

  await check("Today keeps a completed strength session visible beside a logged bike ride", async () => {
    await page.goto(base);
    await page.evaluate((date) => {
      const plan = JSON.parse(localStorage.getItem("north-week-plan-v1") ?? "[]");
      const today = plan.find((item) => item.date === date);
      today.kind = "strength";
      today.title = "Upper body strength";
      today.status = "completed";
      localStorage.setItem("north-week-plan-v1", JSON.stringify(plan));
      localStorage.setItem("north-activities-v1", JSON.stringify([{ id: "browser-test-bike", date, kind: "bike", duration: "35", distance: "10", effort: 3, note: "Easy ride" }]));
    }, testDate);
    await page.reload();
    await page.getByRole("button", { name: "Today", exact: true }).last().click();
    await page.getByRole("region", { name: "Today's completed sessions" }).waitFor();
    await page.getByText("Upper body strength", { exact: true }).last().waitFor();
    await page.getByText("Bike ride", { exact: true }).waitFor();
    await page.getByText("Completed", { exact: true }).last().waitFor();
    await page.getByRole("button", { name: /Add a session/ }).click();
    await page.getByText("Session complete", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Start workout|Edit workout|Add session/ }).count(), 0, "Completed Training should not compete with start, edit, or add actions");
    assert.equal(await page.getByRole("button", { name: "Open Journey", exact: true }).count(), 1, "Completed Training should offer one clear follow-up");
    await page.screenshot({ path: "artifacts/visual/mobile-training-complete.png", fullPage: true });
    await page.getByRole("button", { name: "Open Journey", exact: true }).click();
    await page.getByRole("button", { name: "Milestones", exact: true }).click();
    assert.equal(await page.locator(".chapter-milestone-list strong").evaluateAll((titles) => titles.some((title) => /^Chapter\s+\d+:/i.test(title.textContent ?? ""))), false, "Milestone titles should not repeat their chapter navigation label");
    await page.screenshot({ path: "artifacts/visual/mobile-milestones.png", fullPage: true });
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
    const unnamedFields = await page.locator("input:visible, select:visible, textarea:visible").evaluateAll((fields) => fields.filter((field) => !(field.getAttribute("aria-label") || field.getAttribute("aria-labelledby") || field.getAttribute("placeholder") || field.closest("label"))).map((field) => field.outerHTML));
    assert.equal(unnamedFields.length, 0, `visible form fields need accessible names: ${unnamedFields.join(" | ")}`);
  });

  await check("responsive layouts render at every audited width", async () => {
    for (const width of [320, 375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 900 : 1000 });
      await page.goto(base);
      await page.getByRole("heading", { name: "Browser Test" }).waitFor();
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
    if (!await page.locator(".training-details-drawer .kind-picker").isVisible().catch(() => false)) await page.getByRole("button", { name: /Edit workout/ }).click();
    await page.locator(".training-details-drawer .kind-picker button").filter({ hasText: /^strength$/i }).click();
    await page.getByRole("button", { name: /Start workout|Continue setup/ }).click();
    await page.getByRole("heading", { name: /Ready when you are|Record what happened/ }).waitFor();
    await page.locator(".prepare-save-actions").getByRole("button", { name: /Start workout/ }).click();
    await page.locator(".workout-screen").waitFor();
    const firstInput = page.locator(".simple-set-logger input, .set-row:not(.set-head) input").first();
    await firstInput.fill("77");
    await firstInput.press("Tab");
    await page.waitForTimeout(100);
    await page.reload();
    if (await page.locator(".workout-screen").count() === 0) {
      await page.getByRole("button", { name: "Training", exact: true }).last().click();
      if (!await page.getByRole("button", { name: /Resume workout/ }).isVisible().catch(() => false)) {
        const days = page.locator(".training-rhythm-strip button");
        for (let index = 0; index < await days.count(); index += 1) {
          await days.nth(index).click();
          await page.waitForTimeout(50);
          if (await page.getByRole("button", { name: /Resume workout/ }).isVisible().catch(() => false)) break;
        }
      }
      await page.getByRole("button", { name: /Resume workout/ }).click();
    }
    await page.locator(".workout-screen").waitFor();
    assert.equal(Number.parseFloat(await page.locator(".simple-set-logger input, .set-row:not(.set-head) input").first().inputValue()), 77);
    const canonicalComplete = page.locator(".dynamic-set-top button").first();
    if (await canonicalComplete.count()) await canonicalComplete.click(); else await page.getByRole("button", { name: /Complete set 1/ }).last().click();
    if (await page.getByRole("button", { name: "Add 15 seconds to rest" }).count() === 0) await page.getByRole("button", { name: /Rest timer:/ }).click();
    assert.equal(await page.getByRole("button", { name: "Add 15 seconds to rest" }).count(), 1);
  });

  await check("public welcome and account form are usable without an existing session", async () => {
    const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(base);
    await publicPage.getByText("Welcome", { exact: true }).waitFor();
    await publicPage.getByRole("button", { name: /Create your North/ }).click();
    await publicPage.getByRole("heading", { name: "Create your North." }).waitFor();
    assert.equal(await publicPage.locator('input[autocomplete="username"]').count(), 1);
    assert.equal(await publicPage.locator('input[type="password"]').count(), 1);
    await publicPage.screenshot({ path: "artifacts/visual/onboarding-mobile.png", fullPage: true });
    await publicContext.close();
  });

  assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join(" | ")}`);

  await browser.close();
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}
process.exit(0);
