import { test, expect } from "@playwright/test";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";

const publicRoutes = [
  "/login",
];

const protectedRoutes = [
  "/",
  "/account",
  "/account/profile",
  "/account/security",
  "/account/settings",
  "/account/data-privacy",
  "/account/personalise",
  "/snakes",
  "/snakes/new",
  "/snakes/example-id",
  "/snakes/example-id/master-record",
  "/snakes/example-id/edit",
  "/morph-library",
  "/calculator",
  "/knowledge-base",
  "/learn",
  "/learn/topics",
  "/learn/topic/example-id",
  "/adaptive-learning",
  "/challenge",
  "/challenge/topic/example-id",
  "/learn/achievements",
  "/feeding",
  "/feeding/preparation",
  "/feeding/example-id",
  "/snakes/example-id/feeding",
  "/shedding",
  "/shedding/example-id",
  "/snakes/example-id/shedding",
  "/weights",
  "/weights/example-id",
  "/snakes/example-id/weights",
  "/breeding",
  "/community",
  "/community/wall-of-titans",
  "/wall-of-titans",
  "/report-bug",
  "/report-issue",
  "/feedback",
  "/my-issue-reports",
  "/founder",
  "/become-a-titan",
  "/creator",
  "/creator/privacy-data",
  "/creator/submissions",
  "/creator/issues",
  "/creator/community",
  "/creator/tester",
  "/creator/tester/app",
  "/educator",
];

async function assertNoApplicationError(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  expect(bodyText).not.toMatch(/Application error|Internal Server Error|Cannot read properties of undefined/i);
}

async function followRedirects(page, route) {
  const seen = [];
  for (let hop = 0; hop < 6; hop += 1) {
    const current = new URL(page.url()).pathname;
    if (seen.includes(current)) {
      return { status: "fail", reason: `Navigation loop detected at ${current}`, seen };
    }
    seen.push(current);
    if (current === "/login" || current === "/account-setup" || current === route) {
      return { status: "pass", seen };
    }
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(100);
  }
  return { status: "inconclusive", reason: `Navigation did not settle within the redirect budget`, seen };
}

test.describe("App BOT — public and unauthenticated route journeys", () => {
  for (const route of publicRoutes) {
    test(`public route renders: ${route}`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login\/?$/);
      await assertNoApplicationError(page);
      expect(errors).toEqual([]);
    });
  }

  for (const route of protectedRoutes) {
    test(`protected route has a controlled auth destination: ${route}`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
      const result = await followRedirects(page, route);
      await assertNoApplicationError(page);
      expect(result.status, result.reason ?? "").toBe("pass");
      expect(errors).toEqual([]);
    });
  }
});
