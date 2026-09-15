import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const ownsServer = !process.env.TINY_TITANS_TEST_URL;
const email = process.env.TINY_TITANS_QA_EMAIL || "";
const password = process.env.TINY_TITANS_QA_PASSWORD || "";
const reportDir = "reports";
const reportPath = `${reportDir}/rescue-qa-report.md`;
let server;

const checks = [];
const failures = [];
const notes = [];
const startedAt = new Date().toISOString();

function record(name, status, detail, evidence = "") {
  const item = { name, status, detail, evidence };
  checks.push(item);
  if (status === "FAIL") failures.push(item);
  else if (status === "NOTE") notes.push(item);
  console.log(`${status.padEnd(4)} ${name}: ${detail}${evidence ? ` | ${evidence}` : ""}`);
}

async function reachable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status > 0;
  } catch { return false; }
}

async function ensureServer() {
  if (await reachable(`${baseURL}/login`)) return;
  if (!ownsServer) throw new Error(`Test server is not reachable at ${baseURL}`);
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "inherit", env: process.env, shell: process.platform === "win32", windowsHide: true,
  });
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (await reachable(`${baseURL}/login`)) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Could not start Vite at ${baseURL}`);
}

function cleanup() {
  if (server && !server.killed) server.kill();
}
process.on("exit", cleanup);

function escapeMd(value) { return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " "); }

const routes = [
  "/rescue",
  "/rescue/animals",
  "/rescue/animals?intake=1",
  "/rescue/scan",
  "/rescue/team",
  "/rescue/reports",
  "/rescue/adoption",
  "/rescue/species-incubator",
];

const expectedRoutes = {
  "Animal Register": "/rescue/animals",
  "New Intake": "/rescue/animals?intake=1",
  "Scan QR": "/rescue/scan",
  "Team": "/rescue/team",
};

try {
  await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of routes) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const heading = await page.locator("h1").first().textContent().catch(() => "");
    const title = await page.title().catch(() => "");
    const url = page.url();
    const body = await page.locator("body").innerText().catch(() => "");
    const authRedirect = /\/login(?:\?|$)/.test(url);
    if (authRedirect) record(`Route ${route}`, "NOTE", "Authentication redirected this route before protected content could be exercised.", url);
    else if (!response || response.status() >= 500) record(`Route ${route}`, "FAIL", `HTTP ${response?.status() ?? "no response"}`, heading);
    else if (pageErrors.length || consoleErrors.length) record(`Route ${route}`, "FAIL", "Browser/runtime errors detected", [...pageErrors, ...consoleErrors].join(" || "));
    else record(`Route ${route}`, "PASS", `Rendered ${heading || title || "page"}`, url);
    if (!authRedirect && /internal \[0\]/i.test(body)) record(`Runtime text ${route}`, "FAIL", "Raw internal error leaked into Rescue UI", "internal [0]");
    if (!authRedirect && !heading) record(`Heading ${route}`, "FAIL", "No H1 was found", "");
  }

  await page.goto(`${baseURL}/rescue`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  if (!/\/login(?:\?|$)/.test(page.url())) {
    for (const [label, target] of Object.entries(expectedRoutes)) {
      const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
      if (await link.count() === 0) {
        record(`Command action ${label}`, "FAIL", "Command action is missing from the page", target);
        continue;
      }
      const href = await link.getAttribute("href");
      if (href !== target) record(`Command action ${label}`, "FAIL", `Expected ${target} but found ${href}`, href || "missing href");
      else record(`Command action ${label}`, "PASS", "Correct destination is wired", href);
    }

    const duplicateHrefLinks = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((a) => ({ text: (a.textContent || "").trim(), href: a.getAttribute("href") || "" })).filter((item) => /Animal Register|New Intake|Scan QR|Team/i.test(item.text)));
    for (const item of duplicateHrefLinks) {
      if (expectedRoutes[item.text] && item.href !== expectedRoutes[item.text]) record(`CTA href audit ${item.text}`, "FAIL", "Label and destination disagree", item.href);
    }
  } else {
    notes.push({ name: "Command action click audit", status: "NOTE", detail: "Requires authentication", evidence: "Set TINY_TITANS_QA_EMAIL and TINY_TITANS_QA_PASSWORD." });
  }

  if (email && password) {
    await page.goto(`${baseURL}/login?redirect=/rescue`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/rescue(?:$|\?)/, { timeout: 15000 });
    record("Authenticated Rescue login", "PASS", "QA credentials reached the Rescue route", page.url());

    await page.goto(`${baseURL}/rescue/animals?intake=1`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const intakeHeading = await page.locator("h2", { hasText: /add rescue animal/i }).count();
    const nameField = page.locator("input").filter({ has: undefined });
    const nameInput = page.getByLabel("Name").first();
    const speciesInput = page.getByLabel("Species").first();
    if (!intakeHeading) record("New Intake form opens", "FAIL", "Query route did not open the intake form", page.url());
    else record("New Intake form opens", "PASS", "Dedicated intake state rendered", page.url());
    if (await nameInput.count() === 0 || await speciesInput.count() === 0) record("Required intake fields", "FAIL", "Name and Species controls are not discoverable by label", "Name/Species");
    else record("Required intake fields", "PASS", "Name and Species controls are present", "");

    if (await nameInput.count() && await speciesInput.count()) {
      await nameInput.fill("BOT Rescue Test Animal");
      await speciesInput.fill("Western hognose");
      const createButton = page.getByRole("button", { name: /create animal record|add animal/i }).last();
      if (await createButton.count() === 0) record("Create animal control", "FAIL", "Could not find the intake submit button", "");
      else {
        await createButton.click();
        await page.waitForTimeout(1000);
        const body = await page.locator("body").innerText();
        if (/animal name and species are required/i.test(body)) record("Create animal validation", "FAIL", "Filled Name + Species still triggered required-field validation", body.match(/Animal name and species are required[^\n]*/i)?.[0] || "validation message");
        else if (/internal \[0\]|permission-denied|failed-precondition/i.test(body)) record("Create animal backend", "FAIL", "Backend rejected intake", body.match(/[^\n]*(internal \[0\]|permission-denied|failed-precondition)[^\n]*/i)?.[0] || "backend error");
        else record("Create animal submission", "PASS", "Form accepted the populated Name + Species path", "Inspect register for BOT Rescue Test Animal");
      }
    }

    await page.goto(`${baseURL}/rescue/scan`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const scanButton = page.getByRole("button", { name: /start camera scan/i });
    const manualInput = page.getByPlaceholder(/TinyTitans animal URL or ID/i);
    if (await scanButton.count() === 0 || await manualInput.count() === 0) record("QR scanner controls", "FAIL", "Camera and manual-resolution controls are incomplete", "");
    else record("QR scanner controls", "PASS", "Camera scan and manual ID/URL controls are present", "");

    const qrText = await page.locator("body").innerText();
    if (!/QR/i.test(qrText)) record("QR generator discoverability", "FAIL", "Scanner route does not expose QR generation as part of the workflow", "");
    else record("QR generator discoverability", "NOTE", "QR workflow text is present; generator is verified separately from a real animal passport", "");
  } else {
    record("Authenticated CRUD/QR pass", "NOTE", "Skipped authenticated feature execution", "Set TINY_TITANS_QA_EMAIL and TINY_TITANS_QA_PASSWORD to enable it.");
  }

  await browser.close();
} catch (error) {
  record("Rescue QA BOT runner", "FAIL", error instanceof Error ? error.message : String(error));
}

const finishedAt = new Date().toISOString();
const passCount = checks.filter((item) => item.status === "PASS").length;
const failCount = checks.filter((item) => item.status === "FAIL").length;
const noteCount = checks.filter((item) => item.status === "NOTE").length;

const report = `# TinyTitans Rescue QA BOT report\n\n` +
`Generated: ${finishedAt}\n` +
`Started: ${startedAt}\n` +
`Target: ${baseURL}\n\n` +
`## Summary\n\n` +
`| Result | Count |\n|---|---:|\n| PASS | ${passCount} |\n| FAIL | ${failCount} |\n| NOTE | ${noteCount} |\n\n` +
`## Detailed findings\n\n` +
(checks.length ? checks.map((item) => `### ${item.status} · ${item.name}\n${item.detail}${item.evidence ? `\n\n**Evidence:** \`${escapeMd(item.evidence)}\`` : ""}`).join("\n\n") : "No checks completed.") +
`\n\n## Fix queue\n\n` +
(failures.length ? failures.map((item, index) => `${index + 1}. **${item.name}** — ${item.detail}${item.evidence ? ` Evidence: ${item.evidence}` : ""}`).join("\n") : "No automated failures recorded.") +
`\n\n## Human follow-up\n\n` +
`Authenticated tests require a dedicated non-production QA account. Do not place real customer credentials in source control; provide them only as local environment variables.\n`;

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, report, "utf8");
console.log(`\nRescue QA BOT complete. Report: ${reportPath}`);
process.exitCode = failCount > 0 ? 1 : 0;
