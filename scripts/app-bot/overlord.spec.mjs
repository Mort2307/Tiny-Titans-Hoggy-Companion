import { expect, test } from "@playwright/test";
import { APP_READY_TIMEOUT, applicationErrors, assertHealthy, dismissPrivacyConsent, findSnakeInCollection, signIn, snakeRoutes, visit, waitForApplicationShell } from "./helpers.mjs";

const syntheticName = "OVERLORD SHED TEST";
const syntheticEditedName = "OVERLORD SHED TEST EDITED";
let createdSnakeId = "";

async function selectShedStage(page, stage) {
  // Current Shed Tracker uses a semantic <select> for the stage. Prefer the
  // option text/value contract over brittle assumptions about input names.
  const stageSelect = page.locator("select").filter({
    has: page.locator("option", { hasText: new RegExp(`${stage}\\s+phase|Full shed`, "i") }),
  }).first();
  if (await stageSelect.count()) {
    await expect(stageSelect).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(stageSelect).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    const option = stageSelect.locator("option").filter({ hasText: new RegExp(stage === "Complete" ? "Full shed|Complete" : `${stage}\\s+phase`, "i") }).first();
    await expect(option).toBeAttached({ timeout: APP_READY_TIMEOUT });
    const value = await option.getAttribute("value");
    if (value == null) throw new Error(`[OVERLORD] Stage option for "${stage}" has no value.`);
    await stageSelect.selectOption(value);
    await expect(stageSelect).toHaveValue(value);
    console.log(`[OVERLORD] Shedding stage selected via semantic select option: ${stage}.`);
    return;
  }

  const stageFieldset = page.locator("fieldset").filter({ hasText: /Stage/i }).first();
  const radio = stageFieldset.getByRole("radio", { name: new RegExp(stage, "i") }).first();
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

  const stageButton = stageFieldset.getByRole("button", { name: new RegExp(stage, "i") }).first();
  if (await stageButton.count()) {
    await expect(stageButton).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(stageButton).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    await stageButton.click();
    console.log(`[OVERLORD] Shedding stage selected semantically via button: ${stage}.`);
    return;
  }

  const availableControls = await page.locator("input, select, button, [role='radio'], [role='button']").evaluateAll((controls) => controls.map((control) => ({
    tag: control.tagName.toLowerCase(),
    role: control.getAttribute("role"),
    name: control.getAttribute("aria-label") || control.textContent?.trim() || "",
    value: control.getAttribute("value"),
    type: control.getAttribute("type"),
  })).filter((control) => /blue|clear|complete|stage/i.test(`${control.name} ${control.value || ""}`)).slice(0, 40));
  throw new Error(`[OVERLORD] Shedding stage contract mismatch: expected stage "${stage}" but no compatible semantic control was discovered. Candidate controls: ${JSON.stringify(availableControls)}`);
}

async function submitShedForm(page, expectedAction = "stage") {
  const form = page.locator("form").filter({ hasText: /Stage date|Observations \/ notes/ }).first();
  await expect(form).toBeVisible({ timeout: APP_READY_TIMEOUT });
  const submit = form.locator('button[type="submit"]').first();
  await expect(submit).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(submit).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  const label = ((await submit.innerText()) || (await submit.getAttribute("aria-label")) || "").trim();
  console.log(`[OVERLORD] Shedding submit control discovered (${expectedAction}): ${JSON.stringify(label)}.`);
  await submit.click();
}

async function waitForActiveShedCycle(page, stage = "Blue") {
  await expect(page.getByText(/Active shedding cycle/i).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(page.getByText(new RegExp(`${stage} Phase`, "i")).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

async function continueActiveShedCycle(page) {
  const button = page.getByRole("button", { name: /Continue to (Clear|Full Shed)/i }).first();
  await expect(button).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(button).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  await button.click();
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
    for (const route of ["/", "/snakes", "/snakes/new", "/weights", "/feeding", "/shedding", "/behaviour", "/health", "/morph-library", "/calculator", "/knowledge-base", "/learn", "/adaptive-learning", "/challenge", "/learn/achievements", "/breeding", "/community", "/report-bug", "/feedback", "/account", "/account/profile", "/account/security", "/account/settings", "/account/data-privacy", "/account/personalise"]) {
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
    const targets = internal.length ? internal.slice(0, 80) : ["/", "/snakes", "/snakes/new", "/weights", "/feeding", "/shedding", "/behaviour", "/health", "/morph-library", "/calculator", "/knowledge-base", "/learn", "/adaptive-learning", "/challenge", "/learn/achievements", "/breeding", "/community", "/report-bug", "/feedback", "/account", "/account/profile", "/account/security", "/account/settings", "/account/data-privacy", "/account/personalise"];
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
    await submitShedForm(page, "Blue/start");
    await expect(page.getByRole("status")).toContainText(/Blue Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding reload after Blue Phase");
    await dismissPrivacyConsent(page);
    await waitForActiveShedCycle(page, "Blue");

    await continueActiveShedCycle(page);
    await selectShedStage(page, "Clear");
    await submitShedForm(page, "Clear/stage");
    await expect(page.getByRole("status")).toContainText(/Clear Phase recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding reload after Clear Phase");
    await dismissPrivacyConsent(page);
    await waitForActiveShedCycle(page, "Clear");

    await continueActiveShedCycle(page);
    await selectShedStage(page, "Complete");
    await page.getByLabel("Final outcome").selectOption("Complete");
    await submitShedForm(page, "Complete/stage");
    await expect(page.getByRole("status")).toContainText(/Full shed recorded/i);
    await assertHealthy(page, errors);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForApplicationShell(page, "shedding final reload");
    await dismissPrivacyConsent(page);
    await expect(page.getByText(/Shed Cycle History/i)).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(page.getByText(/Full Shed/i).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(page.locator("body")).not.toContainText(/Unsupported field value: undefined|Cannot update this snake|Unable to save this shedding cycle/i);
    await expect(page.locator("#shed-snake")).toHaveValue(snakeId);
    console.log(`[OVERLORD] Shedding single-cycle journey passed for snake ${snakeId}.`);
  });
});
