/**
 * E2E tests for the integrated HelpSystem (documentation popup + guided tour).
 * Uses bare Playwright (no @playwright/test runner) so no extra dependencies are needed.
 * Exit code 0 = all assertions passed, 1 = at least one failed.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

// ── Simple static file server ─────────────────────────────────────────────────
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".csv": "text/csv", ".json": "application/json", ".map": "application/json",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((r) => server.listen(8925, r));

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
page.on("pageerror", (e) => console.error("[page error]", e.message));

await page.goto("http://localhost:8925/example/index.html");

// ── 1. Help button ─────────────────────────────────────────────────────────────
console.log("\nHelp button");
const helpBtn = await page.waitForSelector(".__tw-help-btn", { timeout: 30000 }).catch(() => null);
assert("Help button rendered", !!helpBtn);

// ── 2. Documentation modal ────────────────────────────────────────────────────
console.log("\nDocumentation modal");
await page.click(".__tw-help-btn");
const modal = await page.waitForSelector(".__tw-help-modal", { timeout: 5000 }).catch(() => null);
assert("Modal opens on button click", !!modal);

const sectionCount = await page.$$eval(".__tw-help-section summary", (els) => els.length);
assert("Modal has 11 documentation sections", sectionCount === 11, `got ${sectionCount}`);

const hasLangSwitcher = await page.$(".__tw-lang-switcher") !== null;
assert("Language switcher (ES/EN) is present", hasLangSwitcher);

// ── 3. Language switch ────────────────────────────────────────────────────────
console.log("\nLanguage switch");
const titleBefore = await page.$eval(".__tw-help-modal h2", (el) => el.textContent);
assert("Modal title in Spanish by default", titleBefore.includes("Ayuda"));

await page.click(".__tw-lang-btn:has-text('EN')");
await page.waitForTimeout(400);
const titleAfter = await page.$eval(".__tw-help-modal h2", (el) => el.textContent).catch(() => "");
assert("Modal title switches to English", titleAfter.includes("Help"), `got "${titleAfter}"`);

// Switch back to ES for tour test
await page.click(".__tw-lang-btn:has-text('ES')");
await page.waitForTimeout(300);

// ── 4. ESC closes modal ───────────────────────────────────────────────────────
console.log("\nModal dismiss");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const modalGone = await page.$(".__tw-help-overlay") === null;
assert("ESC closes the modal", modalGone);

// ── 5. Guided tour ────────────────────────────────────────────────────────────
console.log("\nGuided tour");
await page.click(".__tw-help-btn");
await page.waitForSelector(".__tw-help-modal");
await page.click(".__tw-help-tour-cta");
const tourCard = await page.waitForSelector(".__tw-tour-card", { timeout: 5000 }).catch(() => null);
assert("Tour card appears after clicking 'Start guided tour'", !!tourCard);

const firstTitle = await page.$eval(".__tw-tour-card h3", (el) => el.textContent).catch(() => "");
assert("First tour step has a title", firstTitle.length > 0, `got "${firstTitle}"`);

const counter = await page.$eval(".__tw-tour-step-counter", (el) => el.textContent).catch(() => "");
assert("Tour step counter shown (1 / N)", counter.startsWith("1 /"), `got "${counter}"`);

// Navigate through all steps
let steps = 0;
for (let i = 0; i < 20; i++) {
  steps++;
  const btnText = await page.$eval(".__tw-tour-btn.__tw-primary", (el) => el.textContent).catch(() => "Finalizar");
  if (btnText.includes("Finalizar") || btnText.includes("Finish")) {
    await page.click(".__tw-tour-btn.__tw-primary");
    break;
  }
  await page.click(".__tw-tour-btn.__tw-primary");
  await page.waitForTimeout(200);
}
assert("Tour has at least 5 steps", steps >= 5, `counted ${steps}`);

const tourGone = await page.$(".__tw-tour-card") === null;
assert("Tour closes after finishing", tourGone);

// ── 6. Arrow key navigation ───────────────────────────────────────────────────
console.log("\nTour keyboard navigation");
await page.click(".__tw-help-btn");
await page.waitForSelector(".__tw-help-modal");
await page.click(".__tw-help-tour-cta");
await page.waitForSelector(".__tw-tour-card");

const counterStep1 = await page.$eval(".__tw-tour-step-counter", (el) => el.textContent);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(200);
const counterStep2 = await page.$eval(".__tw-tour-step-counter", (el) => el.textContent);
assert("ArrowRight advances tour step", counterStep1 !== counterStep2, `${counterStep1} → ${counterStep2}`);

await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const tourGone2 = await page.$(".__tw-tour-card") === null;
assert("ESC closes the tour", tourGone2);

// ── Results ───────────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
