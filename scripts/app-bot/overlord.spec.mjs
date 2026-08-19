import { test, expect } from "@playwright/test";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD;
const syntheticName = `BOT Overlord ${Date.now()}`;

const coreRoutes = [
  "/",
  "/snakes",
  "/snakes/new",
  "/weights",
  "/feeding",
  "/shedding",
  "/behaviour",
  "/health",
  "/morph-library",
  "/calculator",
  "/knowledge-base",
  "/learn",
  "/adaptive-learning",
  "/challenge",
  "/learn/achievements",
  "/breeding",
  "/community",
  "/report-bug",
  "/feedback",
  "/account",
  "/account/profile",
  "/account/security",
  "/account/settings",
  "/account/data-privacy",
  "/account/personalise",
];

const snakeRoutes = (id) => [
  `/snakes/${id}`,
  `/snakes/${id}/master-record`,
  `/snakes/${id}/timeline`,
  `/snakes/${id}/edit`,
  `/snakes/${id}/weights`,
  `/snakes/${id}/feeding`,
  `/snakes/${id}/shedding`,
  `/snakes/${id}/behaviour`,
  `/snakes/${id}/health`,
];

function applicationErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function assertHealthy(page, errors) {
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Cannot read properties of undefined/i);
  expect(errors).toEqual([]);
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return;

  console.log("[OVERLORD] BOT account requires first-run setup; completing synthetic profile.");
  const setup = page.locator(".account-setup-page");

  const displayName = setup.locator("#displayName");
  await displayName.fill("Tiny Titans Overlord BOT");

  const profileSection = setup.locator(".setup-section").filter({ hasText: "How will you use Tiny Titans?" });
  await profileSection.getByRole("button", { name: /Keeper/ }).click();

  const categorySection = setup.locator(".setup-section").filter({ hasText: "Who are you?" });
  await categorySection.getByRole("button", { name: /^Adult/ }).click();

  const learningSection = setup.locator(".setup-section").filter({ hasText: "What learning level fits you?" });
  await learningSection.getByRole("button", { name: /^Adult/ }).click();

  const experienceSection = setup.locator(".setup-section").filter({ hasText: "What's your reptile experience?" });
  await experienceSection.getByRole("button", { name: /^Advanced/ }).click();

  const interestsSection = setup.locator(".setup-section").filter({ hasText: "What else interests you?" });
  await interestsSection.getByRole("button", { name: /^Keeper/ }).click();

  await setup.locator("button.setup-submit").click();
  await expect(page).not.toHaveURL(/\/account-setup\/?/);
  console.log(`[OVERLORD] BOT account setup complete → ${page.url()}`);
}

async function signIn(page) {
  if (!email || !password) {
    test.skip(true, "Authenticated Overlord BOT requires TINY_TITANS_BOT_EMAIL and TINY_TITANS_BOT_PASSWORD.");
    return;
  }
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/);
  await completeAccountSetup(page);
}

async function visit(page, route) {
  console.log(`[OVERLORD] Visiting: ${route}`);
  const targetUrl = new URL(route, baseURL).toString();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const currentUrl = page.url();
  console.log(`[OVERLORD] Navigation result: ${route} → ${currentUrl || "<empty URL>"}`);
  await expect(page).not.toHaveURL(/\/login\/?$/);
  await expect(page).not.toHaveURL(/\/account-setup(?:\/|\?|$)/);
  return currentUrl;
}

test.describe.serial("OVERLORD BOT — authenticated whole-app functional sweep", () => {
  test("boot, authenticate and prove the application shell is healthy", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await expect(page.locator("body")).not.toBeEmpty();
    await assertHealthy(page, errors);
  });

  test("core application routes render without runtime failures", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    for (const route of coreRoutes) {
      await visit(page, route);
      await expect(page.locator("body")).not.toBeEmpty();
      await assertHealthy(page, errors);
      console.log(`[OVERLORD] Passed core route: ${route}`);
    }
  });

  test("navigation links stay inside the declared application surface", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/");
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean));
    const internal = [...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")))];
    expect(internal.length).toBeGreaterThan(0);
    for (const href of internal.slice(0, 80)) {
      await visit(page, href);
      await assertHealthy(page, errors);
    }
  });

  test("Add Snake → save → reopen → edit → save is a real persistence journey", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/snakes/new");
    await page.getByLabel("Snake Name").fill(syntheticName);
    await page.getByLabel("Species").fill("Western Hognose");
    await page.getByLabel(/Current Weight/i).fill("42");
    await page.getByRole("button", { name: /save snake/i }).click();

    await expect(page).not.toHaveURL(/\/snakes\/new\/?$/);
    const snakePath = new URL(page.url()).pathname;
    const match = snakePath.match(/^\/snakes\/([^/]+)$/);
    expect(match, `Expected save to land on /snakes/:id, received ${snakePath}`).not.toBeNull();
    const snakeId = match?.[1];
    expect(snakeId).toBeTruthy();

    await visit(page, `/snakes/${snakeId}`);
    await expect(page.locator("body")).toContainText(syntheticName);

    await visit(page, `/snakes/${snakeId}/edit`);
    const name = page.getByLabel("Snake Name");
    await expect(name).toHaveValue(syntheticName);
    await name.fill(`${syntheticName} Edited`);
    await page.getByRole("button", { name: /save snake/i }).click();
    await expect(page).not.toHaveURL(/\/edit\/?$/);
    await expect(page.locator("body")).toContainText(`${syntheticName} Edited`);

    await visit(page, `/snakes/${snakeId}`);
    await expect(page.locator("body")).toContainText(`${syntheticName} Edited`);
    await assertHealthy(page, errors);
  });

  test("snake intelligence and event surfaces are reachable for a real snake ID", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/snakes");
    const snakeLink = page.locator('a[href^="/snakes/"]:not([href$="/new"])').first();
    await expect(snakeLink).toBeVisible();
    const href = await snakeLink.getAttribute("href");
    const match = href?.match(/^\/snakes\/([^/]+)$/);
    expect(match).not.toBeNull();
    const snakeId = match?.[1];
    expect(snakeId).toBeTruthy();
    for (const route of snakeRoutes(snakeId)) {
      await visit(page, route);
      await assertHealthy(page, errors);
    }
  });

  test("tracker entry points expose usable forms rather than dead pages", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    for (const route of ["/weights", "/feeding", "/shedding", "/behaviour", "/health"]) {
      await visit(page, route);
      const controls = page.locator("input, select, textarea, button");
      await expect(controls.first()).toBeVisible();
      await assertHealthy(page, errors);
    }
  });
});
