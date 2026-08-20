import { test, expect } from "@playwright/test";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD;
const syntheticName = `BOT Overlord ${Date.now()}`;
const syntheticEditedName = `${syntheticName} Edited`;
let createdSnakeId = "";

const APP_READY_TIMEOUT = 20000;

const coreRoutes = [
  "/", "/snakes", "/snakes/new", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
  "/morph-library", "/calculator", "/knowledge-base", "/learn", "/adaptive-learning", "/challenge",
  "/learn/achievements", "/breeding", "/community", "/report-bug", "/feedback", "/account",
  "/account/profile", "/account/security", "/account/settings", "/account/data-privacy", "/account/personalise",
];

const snakeRoutes = (id) => [
  `/snakes/${id}`, `/snakes/${id}/master-record`, `/snakes/${id}/timeline`, `/snakes/${id}/edit`,
  `/snakes/${id}/weights`, `/snakes/${id}/feeding`, `/snakes/${id}/shedding`, `/snakes/${id}/behaviour`, `/snakes/${id}/health`,
];

function applicationErrors(page) {
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

async function waitForApplicationShell(page, label = "application shell") {
  await expect.poll(async () => page.locator("#root > *").count(), {
    timeout: APP_READY_TIMEOUT,
    message: `[OVERLORD] ${label} never mounted a React root child.`,
  }).toBeGreaterThan(0);
  await expect(page.locator("body")).not.toBeEmpty({ timeout: APP_READY_TIMEOUT });
  await expect(page.locator("#root")).toContainText(/\S/, { timeout: APP_READY_TIMEOUT });
}

async function assertHealthy(page, errors) {
  await waitForApplicationShell(page);
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

async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return false;
  console.log("[OVERLORD] Privacy consent is blocking interaction; declining optional data for the test account.");
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  await expect(decline).toBeVisible({ timeout: 5000 });
  await decline.click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
  console.log("[OVERLORD] Privacy consent dismissed.");
  return true;
}

async function establishAuthenticatedApp(page) {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const currentUrl = page.url();
    console.log(`[OVERLORD] Authenticated bootstrap attempt ${attempt}: ${currentUrl}`);
    if (currentUrl.includes("/login")) throw new Error(`[OVERLORD] Authentication unexpectedly returned to login: ${currentUrl}`);
    if (currentUrl.includes("/account-setup")) {
      await completeAccountSetup(page);
      continue;
    }
    await waitForApplicationShell(page, `authenticated bootstrap attempt ${attempt}`);
    await dismissPrivacyConsent(page);
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
  await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 10000 });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 15000 });
  await establishAuthenticatedApp(page);
  await dismissPrivacyConsent(page);
}

async function visit(page, route) {
  console.log(`[OVERLORD] Visiting: ${route}`);
  await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
  const currentUrl = page.url();
  console.log(`[OVERLORD] Navigation result: ${route} → ${currentUrl || "<empty URL>"}`);
  if (currentUrl.includes("/login")) throw new Error(`[OVERLORD] Route ${route} redirected to login: ${currentUrl}`);
  if (currentUrl.includes("/account-setup")) throw new Error(`[OVERLORD] Route ${route} is still blocked by account setup: ${currentUrl}`);
  await waitForApplicationShell(page, `route ${route}`);
  await dismissPrivacyConsent(page);
  return currentUrl;
}

async function findSnakeInCollection(page, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tile = page.getByRole("button", { name: new RegExp(`^Select ${escaped}$`) }).first();
  await expect(tile).toBeVisible({ timeout: APP_READY_TIMEOUT });
  return tile;
}

async function selectShedStage(page, stage) {
  // The shedding UI has changed implementation over time. Overlord must test
  // the user-facing Stage contract, not a particular fieldset/DOM structure.
  // Prefer semantic controls globally, then compatible legacy controls.
  const stagePattern = new RegExp(`^${stage}$`, "i");

  const radio = page.getByRole("radio", { name: stagePattern }).first();
  if (await radio.count()) {
    await expect(radio).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(radio).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    await radio.check();
    await expect(radio).toBeChecked();
    console.log(`[OVERLORD] Shedding stage selected semantically via radio: ${stage}.`);
    return;
  }

  const legacyInput = page.locator(`input[name="shed-stage"][value="${stage}"]`).first();
  if (await legacyInput.count()) {
    await expect(legacyInput).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(legacyInput).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    await legacyInput.check();
    await expect(legacyInput).toBeChecked();
    console.log(`[OVERLORD] Shedding stage selected via compatible input contract: ${stage}.`);
    return;
  }

  const stageButton = page.getByRole("button", { name: stagePattern }).first();
  if (await stageButton.count()) {
    await expect(stageButton).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(stageButton).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    await stageButton.click();
    console.log(`[OVERLORD] Shedding stage selected semantically via button: ${stage}.`);
    return;
  }

  const availableControls = await page.locator("input, button, [role='radio'], [role='button']").evaluateAll((controls) => controls.map((control) => ({
    tag: control.tagName.toLowerCase(),
    role: control.getAttribute("role"),
    name: control.getAttribute("aria-label") || control.textContent?.trim() || "",
    value: control.getAttribute("value"),
    type: control.getAttribute("type"),
  })).filter((control) => /blue|clear|complete|stage/i.test(`${control.name} ${control.value || ""}`)).slice(0, 30));
  throw new Error(`[OVERLORD] Shedding stage contract mismatch: expected stage "${stage}" but no compatible semantic control was discovered. Candidate controls: ${JSON.stringify(availableControls)}`);
}

test.describe.serial("OVERLORD BOT — authenticated whole-app functional sweep", () => {
  test("boot, authenticate and prove the application shell is healthy", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await assertHealthy(page, errors);
  });

  test("core application routes render without runtime failures", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    for (const route of coreRoutes) {
      await visit(page, route);
      await assertHealthy(page, errors);
      console.log(`[OVERLORD] Passed core route: ${route}`);
    }
  });

  test("navigation stays inside the declared application surface", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/");
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean));
    const internal = [...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")))];
    const targets = internal.length ? internal.slice(0, 80) : coreRoutes;
    console.log(`[OVERLORD] Navigation audit discovered ${internal.length} internal anchor target(s); validating ${targets.length} declared/discovered route(s).`);
    for (const href of targets) {
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
    await dismissPrivacyConsent(page);
    await page.getByRole("button", { name: /save snake/i }).click();
    await expect(page).not.toHaveURL(/\/snakes\/new\/?$/);
    const snakePath = new URL(page.url()).pathname;
    const match = snakePath.match(/^\/snakes\/([^/]+)$/);
    expect(match, `Expected save to land on /snakes/:id, received ${snakePath}`).not.toBeNull();
    createdSnakeId = match?.[1] || "";
    expect(createdSnakeId).toBeTruthy();
    await visit(page, `/snakes/${createdSnakeId}`);
    await expect(page.locator("body")).toContainText(syntheticName);
    await visit(page, `/snakes/${createdSnakeId}/edit`);
    const name = page.getByLabel("Snake Name");
    await expect(name).toHaveValue(syntheticName);
    await name.fill(syntheticEditedName);
    await dismissPrivacyConsent(page);
    await page.getByRole("button", { name: /save snake/i }).click();
    await expect(page).not.toHaveURL(/\/edit\/?$/);
    await expect(page.locator("body")).toContainText(syntheticEditedName);
    await visit(page, `/snakes/${createdSnakeId}`);
    await expect(page.locator("body")).toContainText(syntheticEditedName);
    await assertHealthy(page, errors);
    console.log(`[OVERLORD] Persistence journey passed for known snake ID ${createdSnakeId}.`);
  });

  test("snake intelligence and event surfaces are reachable for the exact persisted snake", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    expect(createdSnakeId, "The persistence journey must produce a real snake ID before this dependent test runs.").toBeTruthy();
    await visit(page, "/snakes");
    const tile = await findSnakeInCollection(page, syntheticEditedName);
    await expect(tile).toHaveAttribute("aria-label", `Select ${syntheticEditedName}`);
    await tile.click();
    await expect(page.getByRole("region", { name: `${syntheticEditedName} trackers` })).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await visit(page, `/snakes/${createdSnakeId}`);
    await expect(page.locator("body")).toContainText(syntheticEditedName);
    for (const route of snakeRoutes(createdSnakeId)) {
      await visit(page, route);
      await assertHealthy(page, errors);
    }
    console.log(`[OVERLORD] Snake collection → profile → intelligence/event surfaces passed for ${createdSnakeId}.`);
  });

  test("tracker entry points expose usable forms rather than dead pages", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    expect(createdSnakeId, "Tracker journey requires the persisted Overlord snake.").toBeTruthy();
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
    expect(createdSnakeId, "Shedding journey requires the persisted Overlord snake.").toBeTruthy();
    await visit(page, "/shedding");
    const snakeSelect = page.locator("#shed-snake");
    await expect(snakeSelect).toBeVisible();
    await expect(snakeSelect.locator(`option[value="${createdSnakeId}"]`)).toBeAttached();
    await snakeSelect.selectOption(createdSnakeId);
    const snakeId = await snakeSelect.inputValue();
    expect(snakeId).toBe(createdSnakeId);

    await selectShedStage(page, "Blue");
    await page.getByRole("button", { name: /Start Cycle/i }).click();
    await expect(page.getByRole("status")).toContainText(/Blue Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding reload after Blue Phase");
    await dismissPrivacyConsent(page);
    await expect(page.getByText(/Active shedding cycle/i)).toBeVisible();
    await expect(page.getByText(/Blue Phase/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Record Next Stage/i }).click();
    await selectShedStage(page, "Clear");
    await page.getByRole("button", { name: /Record Stage/i }).click();
    await expect(page.getByRole("status")).toContainText(/Clear Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding reload after Clear Phase");
    await dismissPrivacyConsent(page);
    await expect(page.getByText(/Active shedding cycle/i)).toBeVisible();

    await page.getByRole("button", { name: /Record Next Stage/i }).click();
    await selectShedStage(page, "Complete");
    await page.getByLabel("Final outcome").selectOption("Complete");
    await page.getByRole("button", { name: /Record Stage/i }).click();
    await expect(page.getByRole("status")).toContainText(/Full shed recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding final reload");
    await dismissPrivacyConsent(page);
    await expect(page.getByText(/Shed Cycle History/i)).toBeVisible();
    await expect(page.getByText(/Full Shed/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Unsupported field value: undefined|Cannot update this snake|Unable to save this shedding cycle/i);
    await expect(page.locator("#shed-snake")).toHaveValue(snakeId);
    console.log(`[OVERLORD] Shedding single-cycle journey passed for snake ${snakeId}.`);
  });
});
