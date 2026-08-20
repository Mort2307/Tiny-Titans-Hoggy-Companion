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
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Cannot read properties of undefined|Unsupported field value: undefined/i);
  expect(errors).toEqual([]);
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return false;

  console.log("[OVERLORD] BOT account requires first-run setup; completing synthetic profile.");
  const setup = page.locator(".account-setup-page");
  await expect(setup).toBeVisible({ timeout: 10000 });

  await setup.locator("#displayName").fill("Tiny Titans Overlord BOT");

  await setup.locator(".setup-section").filter({ hasText: "How will you use Tiny Titans?" }).getByRole("button", { name: /Keeper/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "Who are you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What learning level fits you?" }).getByRole("button", { name: /^Adult/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What's your reptile experience?" }).getByRole("button", { name: /^Advanced/ }).click();
  await setup.locator(".setup-section").filter({ hasText: "What else interests you?" }).getByRole("button", { name: /^Keeper/ }).click();

  await setup.locator("button.setup-submit").click();
  await expect(page).not.toHaveURL(/\/account-setup(?:\/|\?|$)/, { timeout: 15000 });
  console.log(`[OVERLORD] BOT account setup complete → ${page.url()}`);
  return true;
}

async function establishAuthenticatedApp(page) {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const currentUrl = page.url();
    console.log(`[OVERLORD] Authenticated bootstrap attempt ${attempt}: ${currentUrl}`);

    if (currentUrl.includes("/login")) {
      throw new Error(`[OVERLORD] Authentication unexpectedly returned to login: ${currentUrl}`);
    }

    if (currentUrl.includes("/account-setup")) {
      await completeAccountSetup(page);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      continue;
    }

    return currentUrl;
  }

  throw new Error(`[OVERLORD] Account setup did not complete after 3 bootstrap attempts. Current URL: ${page.url()}`);
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
  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 15000 });
  await establishAuthenticatedApp(page);
}

async function visit(page, route) {
  console.log(`[OVERLORD] Visiting: ${route}`);
  const targetUrl = new URL(route, baseURL).toString();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const currentUrl = page.url();
  console.log(`[OVERLORD] Navigation result: ${route} → ${currentUrl || "<empty URL>"}`);

  if (currentUrl.includes("/login")) {
    throw new Error(`[OVERLORD] Route ${route} redirected to login: ${currentUrl}`);
  }
  if (currentUrl.includes("/account-setup")) {
    throw new Error(`[OVERLORD] Route ${route} is still blocked by account setup: ${currentUrl}`);
  }

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

  test("shedding is a real single-cycle persistence journey", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/shedding");

    const snakeSelect = page.locator("#shed-snake");
    await expect(snakeSelect).toBeVisible();
    const snakeOptions = await snakeSelect.locator("option").allTextContents();
    expect(snakeOptions.length).toBeGreaterThan(0);
    const snakeId = await snakeSelect.inputValue();
    expect(snakeId).toBeTruthy();

    const stageDate = page.locator("#shed-stage-date");
    await expect(stageDate).toBeVisible();
    const originalDate = await stageDate.inputValue();

    await page.getByRole("radio", { name: /Blue Phase/i }).check();
    await page.getByRole("button", { name: /Start Cycle/i }).click();
    await expect(page.getByRole("status")).toContainText(/Blue Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await expect(page.getByText(/Active shedding cycle/i)).toBeVisible();
    await expect(page.getByText(/Blue Phase/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Record Next Stage/i }).click();
    await page.getByRole("radio", { name: /Clear Phase/i }).check();
    await page.getByRole("button", { name: /Record Stage/i }).click();
    await expect(page.getByRole("status")).toContainText(/Clear Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await expect(page.getByText(/Active shedding cycle/i)).toBeVisible();
    await page.getByRole("button", { name: /Record Next Stage/i }).click();
    await page.getByRole("radio", { name: /Full Shed/i }).check();
    await page.getByRole("combobox", { name: "Final outcome" }).selectOption("Complete");
    await page.getByRole("button", { name: /Record Stage/i }).click();
    await expect(page.getByRole("status")).toContainText(/Full shed recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await expect(page.getByText(/Shed Cycle History/i)).toBeVisible();
    await expect(page.getByText(/Full Shed/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Unsupported field value: undefined|Cannot update this snake|Unable to save this shedding cycle/i);
    expect(await snakeSelect.inputValue().catch(() => "")).toBe(snakeId);
    expect(originalDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    console.log(`[OVERLORD] Shedding single-cycle journey passed for snake ${snakeId}.`);
  });
});
