import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-review");

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const defaultRoutes = [
  "/", "/snakes", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
  "/husbandry", "/enclosure-intelligence", "/morph-library", "/calculator", "/breeding",
  "/learn", "/challenge", "/community", "/account", "/rescue", "/rescue/animals",
  "/rescue/qr", "/rescue/team",
];

function routes() {
  const raw = process.env.TINY_TITANS_VISUAL_ROUTES || defaultRoutes.join(",");
  return [...new Set(raw.split(/[\n,;]+/).map((route) => route.trim()).filter(Boolean).map((route) => route.startsWith("/") ? route : `/${route}`))];
}

async function signIn(page) {
  if (!email || !password) throw new Error("Visual journey recorder requires TINY_TITANS_VISUAL_BOT_EMAIL and TINY_TITANS_VISUAL_BOT_PASSWORD (or the generic BOT variables).");
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) throw new Error("Visual journey recorder could not authenticate.");
}

async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return;
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  if (await decline.isVisible().catch(() => false)) await decline.click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return;
  const setup = page.locator(".account-setup-page");
  await setup.waitFor({ state: "visible", timeout: 10_000 });
  await setup.locator("#displayName").fill("Tiny Titans Visual Review BOT");
  const select = async (sectionText, buttonName) => {
    const section = setup.locator(".setup-section").filter({ hasText: sectionText });
    const button = section.getByRole("button", { name: buttonName });
    if (await button.count()) await button.first().click();
  };
  await select("How will you use Tiny Titans?", /Keeper/);
  await select("Who are you?", /^Adult/);
  await select("What learning level fits you?", /^Adult/);
  await select("What's your reptile experience?", /^Advanced/);
  await select("What else interests you?", /^Keeper/);
  await setup.locator("button.setup-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/account-setup"), { timeout: 15_000 });
}

await fs.mkdir(outputDir, { recursive: true });
const generated = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const viewportDir = path.join(outputDir, "journeys");
    await fs.mkdir(viewportDir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      recordVideo: { dir: viewportDir, size: { width: viewport.width, height: viewport.height } },
    });
    const page = await context.newPage();

    try {
      await signIn(page);
      await completeAccountSetup(page);
      await dismissPrivacyConsent(page);

      for (const route of routes()) {
        console.log(`[VISUAL JOURNEY] ${viewport.name} · ${route}`);
        await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await page.waitForTimeout(550);
        await dismissPrivacyConsent(page);
        await completeAccountSetup(page);
        await page.waitForTimeout(250);
      }
    } finally {
      const video = page.video();
      await context.close();
      if (video) {
        const sourcePath = await video.path().catch(() => null);
        if (sourcePath) {
          const finalPath = path.join(viewportDir, `${viewport.name}-journey.webm`);
          await fs.rename(sourcePath, finalPath).catch(async () => {
            await fs.copyFile(sourcePath, finalPath);
            await fs.rm(sourcePath, { force: true });
          });
          generated.push({ viewport, path: path.relative(outputDir, finalPath).replaceAll(path.sep, "/") });
        }
      }
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(
  path.join(outputDir, "journey-recordings.json"),
  `${JSON.stringify({ bot: "Tiny Titans Visual Journey Recorder BOT", generatedAt: new Date().toISOString(), baseURL, routes: routes(), viewports, recordings: generated }, null, 2)}\n`,
  "utf8",
);

console.log(`[VISUAL JOURNEY] Generated ${generated.length} viewport journey recording(s).`);
