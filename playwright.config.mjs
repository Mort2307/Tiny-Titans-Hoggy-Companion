import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/app-bot",
  testMatch: "**/*.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "artifacts/app-bot-results.json" }]],
  use: {
    baseURL: process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
