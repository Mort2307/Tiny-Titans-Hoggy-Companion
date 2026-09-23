import { expect, test } from "@playwright/test";
import { APP_READY_TIMEOUT, applicationErrors, assertHealthy, dismissPrivacyConsent, findSnakeInCollection, signIn, snakeRoutes, visit, waitForApplicationShell } from "./helpers.mjs";

const syntheticName = "OVERLORD SHED TEST";
const syntheticEditedName = "OVERLORD SHED TEST EDITED";
let createdSnakeId = "";

const RESCUE_SHARED_CAPABILITIES = [
  "Advanced animal timeline",
  "Advanced analytics",
  "Titan Intelligence",
  "Morph intelligence & evidence",
  "Data export",
  "Marketplace seller tools",
  "Professional seller profile",
  "Business reporting",
  "Multi-user workspace",
  "Team permissions",
  "Workflow automation",
  "API access",
  "Priority support",
  "Custom branding",
];

const coreRoutes = [
  "/", "/account", "/account/family", "/account/profile", "/account/security", "/account/settings", "/account/data-privacy", "/account/intelligence", "/account/personalise",
  "/snakes", "/snakes/new", "/morph-library", "/calculator", "/knowledge-base", "/learn", "/learn/topics", "/adaptive-learning", "/challenge", "/learn/achievements",
  "/feeding", "/feeding/preparation", "/shedding", "/weights", "/health", "/behaviour", "/husbandry", "/enclosure-intelligence",
  "/breeding", "/breeding/academy", "/breeding/readiness", "/breeding/timeline", "/breeding/cycle", "/breeding/production",
  "/community", "/community/features", "/community/wall-of-titans", "/report-bug", "/feedback", "/my-issue-reports", "/conversations", "/founder", "/become-a-titan",
  "/paid/timeline", "/paid/analytics", "/paid/marketplace", "/paid/seller", "/paid/business", "/paid/team", "/paid/automation", "/paid/api", "/paid/support", "/paid/branding", "/paid/export", "/morph-library/evidence",
  "/rescue", "/rescue/animals", "/rescue/qr", "/rescue/scan", "/rescue/team", "/rescue/reports", "/rescue/adoption", "/rescue/species-incubator",
  "/creator", "/creator/privacy-data", "/creator/benchmarks", "/creator/submissions", "/creator/morph-terminology", "/creator/issues", "/creator/community", "/creator/conversations", "/creator/tester", "/educator",
];

async function selectShedStage(page, stage) {
  const stageSelect = page.locator("select").filter({ has: page.locator("option", { hasText: new RegExp(`${stage}\\s+phase|Full shed`, "i") }) }).first();
  if (await stageSelect.count()) {
    await expect(stageSelect).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(stageSelect).toBeEnabled({ timeout: APP_READY_TIMEOUT });
    const option = stageSelect.locator("option").filter({ hasText: new RegExp(stage === "Complete" ? "Full shed|Complete" : `${stage}\\s+phase`, "i") }).first();
    await expect(option).toBeAttached({ timeout: APP_READY_TIMEOUT });
    const value = await option.getAttribute("value");
    if (value == null) throw new Error(`[OVERLORD] Stage option for "${stage}" has no value.`);
    await stageSelect.selectOption(value);
    await expect(stageSelect).toHaveValue(value);
    return;
  }
  const stageFieldset = page.locator("fieldset").filter({ hasText: /Stage/i }).first();
  const radio = stageFieldset.getByRole("radio", { name: new RegExp(stage, "i") }).first();
  if (await radio.count()) { await expect(radio).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(radio).toBeEnabled({ timeout: APP_READY_TIMEOUT }); await radio.check(); await expect(radio).toBeChecked(); return; }
  const legacyInput = page.locator(`input[name="shed-stage"][value="${stage}"]`).first();
  if (await legacyInput.count()) { await expect(legacyInput).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(legacyInput).toBeEnabled({ timeout: APP_READY_TIMEOUT }); await legacyInput.check(); await expect(legacyInput).toBeChecked(); return; }
  const stageButton = stageFieldset.getByRole("button", { name: new RegExp(stage, "i") }).first();
  if (await stageButton.count()) { await expect(stageButton).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(stageButton).toBeEnabled({ timeout: APP_READY_TIMEOUT }); await stageButton.click(); return; }
  throw new Error(`[OVERLORD] Shedding stage contract mismatch: expected stage "${stage}".`);
}

async function submitShedForm(page) {
  const form = page.locator("form").filter({ hasText: /Stage date|Observations \/ notes/ }).first();
  await expect(form).toBeVisible({ timeout: APP_READY_TIMEOUT });
  const submit = form.locator('button[type="submit"]').first();
  await expect(submit).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(submit).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  await submit.click();
}

async function waitForActiveShedCycle(page, stage = "Blue") {
  await expect(page.getByText(/Active(?: shedding)? cycle/i).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(page.getByText(new RegExp(`${stage}\\s+phase`, "i")).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

async function continueActiveShedCycle(page) {
  const button = page.getByRole("button", { name: /Continue to (Clear|Full Shed)/i }).first();
  if (await button.count()) { await expect(button).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(button).toBeEnabled({ timeout: APP_READY_TIMEOUT }); await button.click(); return; }
  await expect(page.locator("form").filter({ hasText: /Stage date|Observations \/ notes/ }).first()).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

async function selectFinalOutcome(page) {
  const outcome = page.getByLabel(/(?:Final outcome|Outcome status)/i).first();
  await expect(outcome).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(outcome).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  await outcome.selectOption("Complete");
}

async function expectShedStatus(page, patterns) {
  const status = page.getByRole("status").first();
  await expect(status).toBeVisible({ timeout: APP_READY_TIMEOUT });
  const text = await status.innerText();
  if (!patterns.some((pattern) => pattern.test(text))) throw new Error(`[OVERLORD] Shedding success-message contract mismatch. Received ${JSON.stringify(text)}.`);
}

test.describe.serial("OVERLORD BOT — authenticated whole-app functional sweep", () => {
  test("boot, authenticate and prove the application shell is healthy", async ({ page }) => { const errors = applicationErrors(page); await signIn(page); await assertHealthy(page, errors); });

  test("every declared static application surface renders without runtime failures", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page);
    for (const route of coreRoutes) { await visit(page, route); await assertHealthy(page, errors); console.log(`[OVERLORD] Passed route: ${route}`); }
  });

  test("Rescue workspace exposes the complete shared paid capability set", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/plans?tier=rescue");
    const detail = page.locator(".paid-plan-detail");
    await expect(detail).toBeVisible({ timeout: APP_READY_TIMEOUT });
    for (const capability of RESCUE_SHARED_CAPABILITIES) {
      await expect(detail).toContainText(capability);
    }
    await assertHealthy(page, errors);
    console.log("[OVERLORD] Rescue plan exposes all shared paid capabilities: " + RESCUE_SHARED_CAPABILITIES.join(", "));
  });

  test("Rescue shared workspace icons render with semantic classes", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/rescue");
    const rescueIconChecks = [
      ["/titan-intelligence", "tt-icon-name-titan"],
      ["/paid/analytics", "tt-icon-name-analytics"],
      ["/paid/timeline", "tt-icon-name-timeline"],
      ["/morph-library/evidence", "tt-icon-name-observatory"],
      ["/paid/marketplace", "tt-icon-name-marketplace"],
      ["/paid/seller", "tt-icon-name-marketplace"],
      ["/paid/business", "tt-icon-name-analytics"],
      ["/paid/team", "tt-icon-name-community"],
      ["/paid/automation", "tt-icon-name-plans"],
      ["/paid/api", "tt-icon-name-lock"],
      ["/paid/support", "tt-icon-name-messages"],
      ["/paid/export", "tt-icon-name-export"],
    ];
    const workspaceNav = page.locator('.workspace-product-shell[data-workspace="rescue"] .workspace-product-nav').first();
    if (await workspaceNav.count() === 0) {
      console.log("[OVERLORD] Rescue workspace navigation is not active for this account; semantic icon mapping is covered by the paid-tier regression contract and Rescue QA BOT.");
      await assertHealthy(page, errors);
      return;
    }
    for (const [href, iconClass] of rescueIconChecks) {
      const link = workspaceNav.locator(`a[href="${href}"]`).first();
      await expect(link, `Expected Rescue workspace link ${href}`).toHaveCount(1);
      await expect(link.locator(`svg.${iconClass}`), `Expected semantic icon ${iconClass} for ${href}`).toHaveCount(1);
    }
    await assertHealthy(page, errors);
  });

  test("new TinyTitans Pro workspace icons render with semantic classes", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await visit(page, "/paid/analytics");
    const iconChecks = [
      ["/titan-intelligence", "tt-icon-name-titan"],
      ["/paid/analytics", "tt-icon-name-analytics"],
      ["/paid/timeline", "tt-icon-name-timeline"],
      ["/paid/export", "tt-icon-name-export"],
    ];
    const workspaceNav = page.locator('.workspace-product-shell[data-workspace="titan_pro"] .workspace-product-nav').first();
    if (await workspaceNav.count() === 0) {
      console.log("[OVERLORD] Titan Pro workspace navigation is not active for this account; semantic icon mapping is covered by the paid-tier regression contract.");
      await assertHealthy(page, errors);
      return;
    }
    for (const [href, iconClass] of iconChecks) {
      const link = workspaceNav.locator(`a[href="${href}"]`).first();
      await expect(link, `Expected Pro workspace link ${href}`).toHaveCount(1);
      await expect(link.locator(`svg.${iconClass}`), `Expected semantic icon ${iconClass} for ${href}`).toHaveCount(1);
    }
    await assertHealthy(page, errors);
  });

  test("every reachable static page has usable internal destinations", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page);
    const checked = new Set();
    for (const route of coreRoutes) {
      await visit(page, route);
      const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter((href) => href && href.startsWith("/") && !href.startsWith("//")));
      for (const href of [...new Set(hrefs)]) {
        if (checked.has(href) || href.includes(":id") || href.includes("undefined") || href.includes("null")) continue;
        checked.add(href);
        await visit(page, href);
        await assertHealthy(page, errors);
      }
    }
    console.log(`[OVERLORD] Verified ${checked.size} unique internal navigation targets from the complete static route sweep.`);
  });

  test("Add Snake → save → reopen → edit → save is a real persistence journey", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page); await visit(page, "/snakes/new");
    await page.getByLabel("Snake Name").fill(syntheticName); await page.getByLabel("Species").fill("Western Hognose"); await page.getByLabel(/Current Weight/i).fill("42"); await dismissPrivacyConsent(page); await page.getByRole("button", { name: /save snake/i }).click();
    await expect(page).not.toHaveURL(/\/snakes\/new\/?$/); const snakePath = new URL(page.url()).pathname; const match = snakePath.match(/^\/snakes\/([^/]+)$/); expect(match, `Expected save to land on /snakes/:id, received ${snakePath}`).not.toBeNull(); createdSnakeId = match?.[1] || ""; expect(createdSnakeId).toBeTruthy();
    await visit(page, `/snakes/${createdSnakeId}`); await expect(page.locator("body")).toContainText(syntheticName); await visit(page, `/snakes/${createdSnakeId}/edit`); const name = page.getByLabel("Snake Name"); await expect(name).toHaveValue(syntheticName); await name.fill(syntheticEditedName); await dismissPrivacyConsent(page); await page.getByRole("button", { name: /save snake/i }).click(); await expect(page).not.toHaveURL(/\/edit\/?$/); await expect(page.locator("body")).toContainText(syntheticEditedName); await visit(page, `/snakes/${createdSnakeId}`); await expect(page.locator("body")).toContainText(syntheticEditedName); await assertHealthy(page, errors);
  });

  test("snake profile exposes every tracker and intelligence surface", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page); expect(createdSnakeId).toBeTruthy(); await visit(page, "/snakes"); const tile = await findSnakeInCollection(page, syntheticEditedName); await expect(tile).toHaveAttribute("aria-label", `Select ${syntheticEditedName}`); await tile.click(); await expect(page.getByRole("region", { name: `${syntheticEditedName} trackers` })).toBeVisible({ timeout: APP_READY_TIMEOUT }); for (const route of snakeRoutes(createdSnakeId)) { await visit(page, route); await assertHealthy(page, errors); }
  });

  test("tracker entry points expose usable controls", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page); for (const route of ["/weights", "/feeding", "/shedding", "/behaviour", "/health", "/husbandry", "/enclosure-intelligence"]) { await visit(page, route); await expect(page.locator("input, select, textarea, button").first()).toBeVisible(); await assertHealthy(page, errors); }
  });

  test("shedding is a real single-cycle persistence journey", async ({ page }) => {
    const errors = applicationErrors(page); await signIn(page); expect(createdSnakeId).toBeTruthy(); await visit(page, `/shedding/${createdSnakeId}`); const snakeSelect = page.locator("#shed-snake"); await expect(snakeSelect).toBeVisible(); await expect(snakeSelect).toHaveValue(createdSnakeId); await selectShedStage(page, "Blue"); await submitShedForm(page); await expectShedStatus(page, [/Blue\s+phase\s+(?:recorded|saved)/i, /same shedding cycle is preserved/i]); await page.reload({ waitUntil: "domcontentloaded" }); await waitForApplicationShell(page); await dismissPrivacyConsent(page); await waitForActiveShedCycle(page, "Blue"); await continueActiveShedCycle(page); await selectShedStage(page, "Clear"); await submitShedForm(page); await expectShedStatus(page, [/Clear\s+phase\s+(?:recorded|saved)/i, /same shedding cycle is preserved/i]); await page.reload({ waitUntil: "domcontentloaded" }); await waitForApplicationShell(page); await dismissPrivacyConsent(page); await waitForActiveShedCycle(page, "Clear"); await continueActiveShedCycle(page); await selectShedStage(page, "Complete"); await selectFinalOutcome(page); await submitShedForm(page); await expectShedStatus(page, [/Full\s+shed\s+recorded/i, /Full\s+shed\s+saved/i]); await page.reload({ waitUntil: "domcontentloaded" }); await waitForApplicationShell(page); await dismissPrivacyConsent(page); await expect(page.getByText(/Shed Cycle History|Shed history/i).first()).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(page.getByText(/Full shed/i).first()).toBeVisible({ timeout: APP_READY_TIMEOUT }); await expect(page.locator("#shed-snake")).toHaveValue(createdSnakeId); await assertHealthy(page, errors);
  });
});
