import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes("north.bodhix.io"));

if (!page) {
  console.error("North tab not found");
  process.exit(1);
}

page.on("console", (message) => {
  console.log("CONSOLE", message.type(), message.text());
});
page.on("pageerror", (error) => {
  console.log("PAGEERROR", error.stack || error.message);
});
page.on("requestfailed", (request) => {
  console.log("REQUESTFAILED", request.url(), request.failure()?.errorText);
});

console.log("ATTACHED", page.url());
await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForTimeout(5_000);
console.log("BODY", (await page.locator("body").innerText()).slice(0, 2_000));
process.exit(0);
