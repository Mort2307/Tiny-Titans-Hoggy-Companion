import { expect, test } from "@playwright/test";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD;

export const APP_READY_TIMEOUT = 15_000;

export function applicationErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    errors.push(`requestfailed: ${request.method()} ${request.url()} — ${request.failure()?.errorText || "unknown"}`);
  });
  return errors;
}

export async function waitForApplicationShell(page, label = "application shell") {
  await expect.poll(async () => page.locator("#root > *").count(), {
    timeout: APP_READY_TIMEOUT,
    message: `[OVERLORD] ${label} never mounted a React root child.`,
  }).toBeGreaterThan(0);
  await expect(page.locator("body")).not.toBeEmpty({ timeout: APP_READY_TIMEOUT });
  await expect(page.locator("#root")).toContainText(/\S/, { timeout: APP_READY_TIMEOUT });
}

export async function assertHealthy(page, errors) {
  await waitForApplicationShell(page);
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Cannot read properties of undefined|Unsupported field value: undefined/i);
  expect(errors).toEqual([]);
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return false;
  console.log("[OVERLORD] BOT account requires first-run setup; completing synthetic profile.");
  const setup = page.locator(".account-setup-page");
  await expect(setup).toBeVisible({ timeout: 10_000 });
  await setup.locator("#displayName").fill("Tiny Titans Overlord BOT");
  await setup.locator(".setup-section").filter({ hasText: "How will you use Tiny Titans?" }).getByRole("button", { name: /Keeper/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "Who are you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What learning level fits you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What's your reptile experience?" }).getByRole("button", { name: /^Advanced/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What else interests you?" }).getByRole("button", { name: /^Keeper/ }).click();
  await setup.locator("button.setup-submit").click();
  await expect(page).not.toHaveURL(/\/account-setup(?:\/|\?|$)/, { timeout: 15_000 });
  return true;
}

export async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return false;
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  await expect(decline).toBeVisible({ timeout: 5_000 });
  await decline.click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  return true;
}

async function establishAuthenticatedApp(page) {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`[OVERLORD] Authenticated bootstrap attempt ${attempt}: ${page.url()}`);
    if (page.url().includes("/login")) throw new Error(`[OVERLORD] Authentication unexpectedly returned to login: ${page.url()}`);
    if (page.url().includes("/account-setup")) {
      await completeAccountSetup(page);
      continue;
    }
    await waitForApplicationShell(page, `authenticated bootstrap attempt ${attempt}`);
    await dismissPrivacyConsent(page);
    return page.url();
  }
  throw new Error(`[OVERLORD] Account setup did not complete after 3 bootstrap attempts. Current URL: ${page.url()}`);
}

export async function signIn(page) {
  if (!email || !password) {
    test.skip(true, "Authenticated Overlord BOT requires TINY_TITANS_BOT_EMAIL and TINY_TITANS_BOT_PASSWORD.");
    return;
  }
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 15_000 });
  await establishAuthenticatedApp(page);
  await dismissPrivacyConsent(page);
}

export async function visit(page, route) {
  console.log(`[OVERLORD] Visiting: ${route}`);
  await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
  const currentUrl = page.url();
  console.log(`[OVERLORD] Navigation result: ${route} → ${currentUrl || "<empty URL>"}`);
  if (currentUrl.includes("/login")) throw new Error(`[OVERLORD] Route ${route} redirected to login: ${currentUrl}`);
  if (currentUrl.includes("/account-setup")) throw new Error(`[OVERLORD] Route ${route} is still blocked by account setup: ${currentUrl}`);
  await waitForApplicationShell(page, `route ${route}`);
  await dismissPrivacyConsent(page);
}

export async function findSnakeInCollection(page, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tile = page.getByRole("button", { name: new RegExp(`^Select ${escaped}$`) }).first();
  await expect(tile).toBeVisible({ timeout: APP_READY_TIMEOUT });
  return tile;
}
