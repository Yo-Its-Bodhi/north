import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const port = 4176;
const base = `http://127.0.0.1:${port}`;
const baselineUrl = new URL("../tests/visual-baselines.json", import.meta.url);
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const server = spawn("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], { shell: true, stdio: "ignore" });
const account = { user: { id: "visual-user", username: "visual", displayName: "Visual Test", timezone: "America/Toronto" }, accessToken: "test", refreshToken: "test" };

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Visual regression server did not start");
}

try {
  await waitForServer();
  await mkdir("artifacts/visual-regression", { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const actual = {};
  for (const specification of [
    { name: "today-320", width: 320, height: 780, screen: "Today" },
    { name: "today-430", width: 430, height: 932, screen: "Today" },
    { name: "training-430", width: 430, height: 932, screen: "Training" },
    { name: "training-tablet-768", width: 768, height: 1024, screen: "Training" },
  ]) {
    const context = await browser.newContext({ viewport: { width: specification.width, height: specification.height }, reducedMotion: "reduce", colorScheme: "light" });
    await context.addInitScript(({ account }) => {
      localStorage.setItem("north-account-session-v1", JSON.stringify(account));
      localStorage.setItem(`north-onboarding-complete:${account.user.id}`, "complete");
      localStorage.setItem(`north-product-tour-v1:${account.user.id}`, "complete");
      localStorage.setItem("north-profile-v1", JSON.stringify({ name: "Visual Test", direction: "Build strength and consistency", trainingDays: 3, units: "imperial", bodyWeightUnit: "lb", distanceUnit: "km", reducedMotion: true, connectedServices: [], dismissedInsights: [], memoryCorrections: {} }));
    }, { account });
    await context.route("**/v1/**", (route) => route.fulfill({ json: { status: "applied", documents: [], devices: [], connections: [], types: [], currentDeviceId: "visual" } }));
    const page = await context.newPage();
    await page.goto(base);
    if (specification.screen === "Training") await page.getByRole("button", { name: "Training", exact: true }).last().click();
    await page.locator(".screen").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `artifacts/visual-regression/${specification.name}.png`, fullPage: true, animations: "disabled" });
    actual[specification.name] = await page.evaluate(() => {
      const signature = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height), display: style.display, fontSize: style.fontSize, color: style.color, background: style.backgroundColor };
      };
      return {
        viewport: [innerWidth, innerHeight],
        page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        shell: signature(".app-shell"),
        topbar: signature(".topbar"),
        screen: signature(".screen"),
        heading: signature(".screen h1"),
        hero: signature(".direction-panel, .training-hero"),
        navigation: signature(".bottom-nav"),
      };
    });
    await context.close();
  }
  await browser.close();
  if (process.env.UPDATE_VISUALS === "1") {
    await writeFile(baselineUrl, `${JSON.stringify(actual, null, 2)}\n`);
    console.log(`Updated ${Object.keys(actual).length} North visual baselines.`);
  } else {
    const expected = JSON.parse(await readFile(baselineUrl, "utf8"));
    assert.deepEqual(actual, expected, "Rendered North screens changed. Review them, then run npm run test:visual:update if intentional.");
    console.log(`Matched ${Object.keys(actual).length} North visual baselines.`);
  }
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}
process.exit(0);
