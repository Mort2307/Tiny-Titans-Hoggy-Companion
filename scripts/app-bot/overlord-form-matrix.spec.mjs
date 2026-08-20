import { test, expect } from "@playwright/test";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD;
const APP_READY_TIMEOUT = 20000;

function applicationErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.method()} ${request.url()} — ${request.failure()?.errorText || "unknown"}`));
  return errors;
}

async function waitForShell(page) {
  await expect.poll(() => page.locator("#root > *").count(), { timeout: APP_READY_TIMEOUT }).toBeGreaterThan(0);
  await expect(page.locator("#root")).toContainText(/\S/, { timeout: APP_READY_TIMEOUT });
}

async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return;
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  if (await decline.isVisible().catch(() => false)) await decline.click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return;
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
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await waitForShell(page);
  await completeAccountSetup(page);
  await dismissPrivacyConsent(page);
}

async function openHets(page) {
  const selector = page.locator(".multi-select").filter({ has: page.getByRole("button", { name: "Select Hets", exact: true }) }).first();
  await expect(selector).toBeVisible({ timeout: APP_READY_TIMEOUT });
  const trigger = selector.getByRole("button", { name: "Select Hets", exact: true });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(selector.locator(".multi-select-menu")).toBeVisible();
  return selector;
}

async function inspectHetsState(selector, label) {
  const menu = selector.locator(".multi-select-menu");
  const optionCount = await selector.locator(".het-option").count();
  const checkboxCount = await selector.locator('input[type="checkbox"]').count();
  const visibleText = (await menu.innerText().catch(() => "")).trim();
  const emptyState = /No het genes found\./i.test(visibleText);
  const menuVisible = await menu.isVisible().catch(() => false);

  if (!menuVisible || optionCount === 0 || checkboxCount === 0 || emptyState) {
    throw new Error(`[OVERLORD] Hets selector state corruption after ${label}: menuVisible=${menuVisible}, genes=${optionCount}, checkboxes=${checkboxCount}, emptyState=${emptyState}.`);
  }
  return { optionCount, checkboxCount };
}

async function captureCheckboxDescriptors(selector) {
  return selector.locator('input[type="checkbox"]').evaluateAll((inputs) => inputs.map((input) => {
    const label = input.closest("label");
    const gene = input.closest(".het-option")?.querySelector(".het-gene-name")?.textContent?.trim() || "unknown gene";
    return {
      gene,
      label: label?.textContent?.replace(/\s+/g, " ").trim() || "unknown option",
      disabled: input.hasAttribute("disabled"),
    };
  }));
}

async function exerciseHetOption(page, selector, descriptor, index) {
  const checkboxes = selector.locator('input[type="checkbox"]');
  if (index >= await checkboxes.count()) {
    throw new Error(`[OVERLORD] Hets option disappeared before it could be exercised: ${descriptor.gene} / ${descriptor.label}.`);
  }

  const checkbox = checkboxes.nth(index);
  const disabled = await checkbox.isDisabled();
  if (disabled) {
    console.log(`[OVERLORD] Hets option skipped as legitimately disabled: ${descriptor.gene} / ${descriptor.label}.`);
    return "skipped";
  }

  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await inspectHetsState(selector, `selecting ${descriptor.gene} / ${descriptor.label}`);

  const selectedAfter = await checkbox.isChecked().catch(() => false);
  if (!selectedAfter) throw new Error(`[OVERLORD] Hets option lost its checked state: ${descriptor.gene} / ${descriptor.label}.`);

  await checkbox.uncheck();
  await inspectHetsState(selector, `deselecting ${descriptor.gene} / ${descriptor.label}`);
  return "tested";
}

test.describe.serial("OVERLORD BOT — exhaustive interactive form matrix", () => {
  test("Add Snake controls: exercise every available Hets option and detect state corruption", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await page.goto(`${baseURL}/snakes/new`, { waitUntil: "domcontentloaded" });
    await waitForShell(page);
    await dismissPrivacyConsent(page);

    const selector = await openHets(page);
    const initial = await inspectHetsState(selector, "opening Hets selector");
    const descriptors = await captureCheckboxDescriptors(selector);
    const enabled = descriptors.filter((item) => !item.disabled);

    console.log(`[OVERLORD] Hets matrix discovered ${initial.optionCount} genes, ${initial.checkboxCount} checkbox options, ${enabled.length} initially enabled options.`);
    expect(initial.checkboxCount).toBeGreaterThan(0);

    let tested = 0;
    let skipped = 0;

    // Exercise each initially exposed option independently. The index is intentionally
    // re-resolved after every interaction so a React re-render cannot hide a broken menu.
    for (let index = 0; index < descriptors.length; index += 1) {
      const descriptor = descriptors[index];
      const result = await exerciseHetOption(page, selector, descriptor, index);
      if (result === "tested") tested += 1;
      else skipped += 1;
    }

    // Explicit regression probe for the real-world failure reported against Dutch Hypo.
    await openHets(page);
    const dutchHypo = selector.locator(".het-option").filter({ hasText: /^Dutch Hypo\s*$/m }).first();
    await expect(dutchHypo).toBeVisible({ timeout: APP_READY_TIMEOUT });
    const dutchCheckbox = dutchHypo.locator('input[type="checkbox"]').first();
    await expect(dutchCheckbox).toBeEnabled();
    await dutchCheckbox.check();
    await expect(dutchCheckbox).toBeChecked();
    await inspectHetsState(selector, "selecting Dutch Hypo");
    await expect(selector.locator(".het-option").filter({ hasText: /^Dutch Hypo\s*$/m }).first()).toBeVisible();
    await dutchCheckbox.uncheck();
    await inspectHetsState(selector, "deselecting Dutch Hypo");

    expect(errors).toEqual([]);
    console.log(`[OVERLORD] Hets matrix passed: ${tested} options exercised, ${skipped} legitimately disabled/skipped, Dutch Hypo regression probe passed.`);
  });

  test("Add Snake interactive-control inventory reports all selectable surfaces", async ({ page }) => {
    const errors = applicationErrors(page);
    await signIn(page);
    await page.goto(`${baseURL}/snakes/new`, { waitUntil: "domcontentloaded" });
    await waitForShell(page);
    await dismissPrivacyConsent(page);

    const inventory = await page.locator("input, select, textarea, button, [role='combobox'], [role='listbox'], [role='radio'], [role='checkbox']").evaluateAll((elements) => elements.map((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      name: element.getAttribute("aria-label") || element.getAttribute("name") || (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
      disabled: element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true",
    })).filter((item) => item.name));

    const enabled = inventory.filter((item) => !item.disabled);
    expect(enabled.length).toBeGreaterThan(0);
    console.log(`[OVERLORD] Add Snake interactive inventory: ${inventory.length} controls discovered, ${enabled.length} enabled.`);
    console.log(`[OVERLORD] Control surfaces: ${JSON.stringify(inventory)}`);
    expect(errors).toEqual([]);
  });
});
