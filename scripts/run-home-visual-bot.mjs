import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const outputDir = path.resolve("artifacts/home-visual");

const viewports = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "tablet", width: 768, height: 1024, deviceScaleFactor: 1 },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
];

async function visibleText(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return;
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  if (await decline.isVisible().catch(() => false)) await decline.click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return;
  const setup = page.locator(".account-setup-page");
  await setup.waitFor({ state: "visible", timeout: 10_000 });
  await setup.locator("#displayName").fill("Tiny Titans Visual BOT");
  await setup.locator(".setup-section").filter({ hasText: "How will you use Tiny Titans?" }).getByRole("button", { name: /Keeper/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "Who are you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What learning level fits you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What's your reptile experience?" }).getByRole("button", { name: /^Advanced/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What else interests you?" }).getByRole("button", { name: /^Keeper/ }).click();
  await setup.locator("button.setup-submit").click();
  await page.waitForURL((url) => !url.pathname.includes("/account-setup"), { timeout: 15_000 });
}

async function signIn(page) {
  if (!email || !password) throw new Error("Home Visual BOT requires TINY_TITANS_VISUAL_BOT_EMAIL/TINY_TITANS_VISUAL_BOT_PASSWORD or the generic bot credentials.");
  await page.goto(new URL("/login", baseURL).toString(), { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  await completeAccountSetup(page);
  await dismissPrivacyConsent(page);
}

async function audit(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(new URL("/", baseURL).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(900);

  const evidence = await page.evaluate(() => {
    const body = document.body;
    const root = document.documentElement;
    const visible = (selector) => [...document.querySelectorAll(selector)].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    });
    const brand = document.querySelector(".tt-home-brand")?.textContent?.trim() || "";
    const h1 = document.querySelector(".tt-home-welcome h1")?.textContent?.trim() || "";
    const current = document.querySelector(".tt-home-current-card")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const viewportWidth = window.innerWidth;
    const horizontalOverflow = Math.max(0, root.scrollWidth - viewportWidth);
    const tinyScrollbars = visible("*").filter((element) => {
      if (element === body || element === document.documentElement) return false;
      return element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).overflowX !== "auto";
    }).length;
    const viewportClipped = visible("main *").filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > viewportWidth + 2 || rect.left < -2;
    }).length;
    return {
      brand,
      h1,
      current,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pageHeight: Math.max(root.scrollHeight, body.scrollHeight),
      horizontalOverflow,
      clippedVisibleElements: viewportClipped,
      possibleHiddenOverflowContainers: tinyScrollbars,
      visibleLinks: visible("main a").length,
      visibleButtons: visible("main button").length,
    };
  });

  const screenshotPath = path.join(outputDir, `home-${viewport.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return { ...evidence, screenshot: screenshotPath.replaceAll(path.sep, "/") };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await signIn(page);
    const results = [];
    for (const viewport of viewports) {
      const result = await audit(page, viewport);
      results.push({ viewport: viewport.name, ...result });
      console.log(`HOME VISUAL ${viewport.name}: ${result.horizontalOverflow === 0 && result.clippedVisibleElements === 0 ? "PASS" : "CHECK"} · ${result.pageHeight}px page`);
    }

    const report = {
      bot: "Tiny Titans Home Visual BOT",
      generatedAt: new Date().toISOString(),
      baseURL,
      route: "/",
      viewports,
      results,
      purpose: "Provide rendered visual evidence of Home at repeatable mobile, tablet and desktop viewport sizes.",
    };

    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
    await fs.writeFile(
      path.join(outputDir, "README.md"),
      [
        "# Tiny Titans Home Visual BOT",
        "",
        "This artifact contains rendered screenshots and geometry evidence for the Home route.",
        "",
        ...results.map((item) => `- **${item.viewport}** — ${item.screenshot}`),
        "",
        "Use the PNG files for visual inspection. report.json contains viewport, overflow and clipping evidence.",
        "",
      ].join("\n"),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Home Visual BOT failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
