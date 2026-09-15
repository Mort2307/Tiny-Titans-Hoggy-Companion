import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.BOT_EMAIL || "";
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.BOT_PASSWORD || "";
const outputDir = process.env.TINY_TITANS_NAV_OUTPUT || "artifacts/creator-navigation";

if (!email || !password) {
  console.error("Creator navigation BOT requires TINY_TITANS_VISUAL_BOT_EMAIL and TINY_TITANS_VISUAL_BOT_PASSWORD.");
  process.exit(2);
}

const expected = {
  "/creator/community": "/creator/community",
  "/creator/species-submissions": "/creator/species-submissions",
  "/creator/submissions": "/creator/submissions",
  "/morph-library/evidence": "/morph-library/evidence",
  "/creator/review-queues": "/creator/review-queues",
  "/creator/issues": "/creator/issues",
  "/creator/observations": "/creator/observations",
  "/creator/mentor-review": "/creator/mentor-review",
  "/creator/submission-conversations": "/creator/submission-conversations",
  "/creator/conversations": "/creator/conversations",
  "/creator/intelligence": "/creator/intelligence",
  "/creator/configuration": "/creator/configuration",
  "/creator/admin": "/creator/admin",
  "/creator/analytics": "/creator/analytics",
  "/creator/qa": "/creator/qa",
  "/creator/tester": "/creator/tester",
  "/creator/benchmarks": "/creator/benchmarks",
  "/creator/partner-branding": "/creator/partner-branding",
  "/rescue": "/rescue",
  "/marketplace": "/marketplace",
};

function normaliseHref(href) {
  try { return new URL(href, baseUrl).pathname + new URL(href, baseUrl).search; } catch { return href; }
}

async function isUsable(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  return !/Internal Server Error|Application Error|Cannot read properties of undefined|Unexpected Application Error/i.test(body);
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push({ type: "pageerror", message: error.message }));
page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push({ type: "console", message: message.text() }); });

const results = [];
try {
  await page.goto(`${baseUrl}/login?redirect=%2Fcreator`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/creator(?:$|[/?])/, { timeout: 30000 });
  if (!(await isUsable(page))) throw new Error("Creator Centre produced an application error after login.");

  const hubLinks = await page.locator("a.creator-ops-card").evaluateAll((anchors) => anchors.map((anchor) => ({
    text: anchor.textContent?.replace(/\s+/g, " ").trim() || "",
    href: anchor.getAttribute("href") || "",
  })));
  const seen = new Set();
  for (const link of hubLinks) {
    const target = normaliseHref(link.href);
    if (!target.startsWith("/")) continue;
    const pathname = new URL(target, baseUrl).pathname;
    if (seen.has(target)) continue;
    seen.add(target);
    const expectedPath = expected[pathname] || pathname;
    const started = Date.now();
    let status = "PASS";
    let finalUrl = "";
    let issue = "";
    try {
      await page.goto(new URL(target, baseUrl).toString(), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(350);
      finalUrl = page.url();
      const finalPath = new URL(finalUrl).pathname;
      if (finalPath !== expectedPath) {
        status = "FAIL";
        issue = `Expected ${expectedPath} but landed on ${finalPath}`;
      } else if (!(await isUsable(page))) {
        status = "FAIL";
        issue = "Application error detected in page body.";
      }
    } catch (error) {
      status = "FAIL";
      issue = error instanceof Error ? error.message : String(error);
    }
    results.push({ target, label: link.text, status, finalUrl, issue, durationMs: Date.now() - started });
    await page.goto(`${baseUrl}/creator`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
  }

  const tapTargets = await page.locator("a.creator-ops-card").count();
  const duplicateTargets = hubLinks.map((item) => normaliseHref(item.href)).filter((href, index, all) => all.indexOf(href) !== index);
  const failures = results.filter((item) => item.status === "FAIL");
  const report = {
    bot: "Creator Navigation BOT",
    baseUrl,
    completedAt: new Date().toISOString(),
    hub: "/creator",
    tapTargets,
    tested: results.length,
    passed: results.filter((item) => item.status === "PASS").length,
    failed: failures.length,
    duplicateTargets: [...new Set(duplicateTargets)],
    loops: results.filter((item) => item.status === "FAIL" && /\/creator\/?$/.test(new URL(item.finalUrl || baseUrl).pathname) && !/\/creator\/?$/.test(new URL(item.target, baseUrl).pathname)),
    runtimeErrors,
    results,
  };
  await fs.writeFile(path.join(outputDir, "navigation-report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outputDir, "navigation-report.txt"), [
    "TINY TITANS · CREATOR NAVIGATION BOT",
    "===================================",
    `Completed: ${report.completedAt}`,
    `Targets: ${report.tapTargets}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    `Duplicate targets: ${report.duplicateTargets.length}`,
    `Runtime errors: ${report.runtimeErrors.length}`,
    "",
    ...results.map((item) => `${item.status.padEnd(5)} ${item.target} -> ${item.finalUrl || "(none)"}${item.issue ? ` :: ${item.issue}` : ""}`),
  ].join("\n"));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
}
