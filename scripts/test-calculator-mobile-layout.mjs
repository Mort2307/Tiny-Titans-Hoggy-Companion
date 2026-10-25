import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.TINY_TITANS_TEST_URL ?? "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD;
const out = "artifacts/calculator-mobile";
if (!email || !password) throw new Error("Calculator mobile QA requires dedicated visual bot credentials; no unverified pass will be recorded.");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const observations = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.match(/^\/login\/?$/), { timeout: 30000 });

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + "/calculator", { waitUntil: "domcontentloaded" });
    await page.locator(".calculator-page").waitFor({ timeout: 30000 });
    const speciesContext = page.locator(".tt-species-context--compact");
    await speciesContext.waitFor({ timeout: 10000 });
    const parents = page.locator(".genetics-parent-selector");
    await parents.first().waitFor();
    assert.equal(await parents.count(), 2, "Expected both parent panels");

    const measures = await page.evaluate(() => {
      const selectors = [".tt-species-context--compact", ".calculator-page", ".calculator-parents", ".calculator-results"];
      return {
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        sections: Object.fromEntries(selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [selector, null];
          const rect = element.getBoundingClientRect();
          return [selector, { left: rect.left, right: rect.right, width: rect.width, scrollWidth: element.scrollWidth }];
        })),
        parentsCollapsed: [...document.querySelectorAll(".genetics-parent-advanced")].map((el) => !el.open),
      };
    });
    observations.push({ width, ...measures });
    assert.equal(measures.parentsCollapsed.length, 2, "Both genetics editors should be accessible");
    assert.ok(measures.parentsCollapsed.every(Boolean), "Manual genetics details should start collapsed");
    for (const [selector, data] of Object.entries(measures.sections)) {
      assert.ok(data, "Missing calculator section " + selector);
      assert.ok(data.right <= width + 4, selector + " extends past viewport: " + JSON.stringify(data));
      assert.ok(data.left >= -4, selector + " starts outside viewport: " + JSON.stringify(data));
    }
    await page.screenshot({ path: `${out}/calculator-${width}-compact.png`, fullPage: true });
    if (width === 390) {
      await page.locator(".genetics-parent-advanced").first().locator("summary").click();
      assert.ok(await page.locator(".genetics-parent-advanced").first().evaluate((el) => el.open), "Genetics editor must expand when tapped");
      await page.screenshot({ path: `${out}/calculator-390-expanded.png`, fullPage: true });
    }
    console.log(`PASS calculator ${width}px: two collapsed parent editors, compact species context, no calculator section overflowing viewport`);
  }
  await writeFile(`${out}/measurements.json`, JSON.stringify(observations, null, 2));
  await context.close();
} finally {
  await browser.close();
}
