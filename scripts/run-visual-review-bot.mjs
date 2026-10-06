import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-review");
const contractPath = path.resolve("docs/visual-design-contract.json");

const fallbackViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const defaultRoutes = [
  "/",
  "/snakes",
  "/weights",
  "/feeding",
  "/shedding",
  "/behaviour",
  "/health",
  "/husbandry",
  "/enclosure-intelligence",
  "/morph-library",
  "/calculator",
  "/breeding",
  "/learn",
  "/challenge",
  "/community",
  "/account",
  "/rescue",
  "/rescue/animals",
  "/rescue/qr",
  "/rescue/team",
];

function parseRoutes() {
  const raw = process.env.TINY_TITANS_VISUAL_ROUTES || defaultRoutes.join(",");
  return [...new Set(raw.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean).map((value) => value.startsWith("/") ? value : `/${value}`))];
}

function safeName(value) {
  return value === "/" ? "home" : value.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "route";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function dismissPrivacyConsent(page) {
  const dialog = page.locator('.privacy-consent-backdrop[role="dialog"]');
  if (!(await dialog.isVisible().catch(() => false))) return false;
  const decline = dialog.getByRole("button", { name: "Decline Optional Data", exact: true });
  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function completeAccountSetup(page) {
  if (!page.url().includes("/account-setup")) return false;
  const setup = page.locator(".account-setup-page");
  await setup.waitFor({ state: "visible", timeout: 10_000 });
  await setup.locator("#displayName").fill("Tiny Titans Visual Review BOT");
  const select = async (sectionText, buttonName) => {
    const section = setup.locator(".setup-section").filter({ hasText: sectionText });
    const button = section.getByRole("button", { name: buttonName });
    if (await button.count()) await button.first().click();
  };
  await select("How will you use Tiny Titans?", /Keeper/);
  await select("Who are you?", /^Adult/);
  await select("What learning level fits you?", /^Adult/);
  await select("What's your reptile experience?", /^Advanced/);
  await select("What else interests you?", /^Keeper/);
  await setup.locator("button.setup-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/account-setup"), { timeout: 15_000 });
  return true;
}

async function signIn(page) {
  if (!email || !password) throw new Error("Visual Review BOT requires TINY_TITANS_VISUAL_BOT_EMAIL and TINY_TITANS_VISUAL_BOT_PASSWORD (or the generic BOT variables).");
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  for (let attempt = 0; attempt < 3 && page.url().includes("/account-setup"); attempt += 1) await completeAccountSetup(page);
  await dismissPrivacyConsent(page);
  if (new URL(page.url()).pathname === "/login") throw new Error("Visual Review BOT could not authenticate.");
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const text = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const visibleElements = [...document.querySelectorAll("body *")].filter(visible);
    const interactive = [...document.querySelectorAll("button, a, input, select, textarea, [role='button']")].filter(visible);
    const chrome = (element) => Boolean(element.closest("header, nav, footer, aside, [role='navigation'], [data-visual-chrome], .sidebar, .app-sidebar, .bottom-nav"));
    const contentInteractive = interactive.filter((element) => !chrome(element));
    const headings = [...document.querySelectorAll("h1, h2, h3")].filter(visible).map((element) => text(element)).filter(Boolean).slice(0, 24);
    const main = [...document.querySelectorAll("main, [role='main'], .page-content, .app-content")].find(visible);
    const contentText = (main?.innerText || body?.innerText || "").replace(/\s+/g, " ").trim();
    const bodyRect = body?.getBoundingClientRect();
    const horizontalOverflow = Math.max(0, root.scrollWidth - viewportWidth, bodyRect ? bodyRect.width - viewportWidth : 0);
    const touchProblems = interactive.filter((element) => {
      const type = element.getAttribute("type")?.toLowerCase();
      if (type === "checkbox" || type === "radio") return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    }).length;
    const clipped = visibleElements.filter((element) => {
      if (["HTML", "BODY"].includes(element.tagName)) return false;
      const rect = element.getBoundingClientRect();
      return (rect.left < -2 || rect.right > viewportWidth + 2) && !["fixed", "sticky"].includes(getComputedStyle(element).position);
    });
    const hiddenOverflow = visibleElements.filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollWidth > element.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
    });
    const narrowTextRails = viewportWidth <= 640 ? visibleElements.filter((element) => {
      if (chrome(element)) return false;
      const content = text(element);
      if (content.length < 24) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width >= Math.min(96, viewportWidth * .24) || rect.height < 120) return false;
      const style = getComputedStyle(element);
      if (style.writingMode && style.writingMode !== "horizontal-tb") return false;
      if (style.whiteSpace === "nowrap") return false;
      return rect.height / Math.max(rect.width, 1) >= 4;
    }) : [];
    const workspace = root.dataset.ttWorkspace || "unset";
    const navigation = document.querySelector(".app-navigation");
    const navigationScroll = navigation ? {
      clientHeight: navigation.clientHeight,
      scrollHeight: navigation.scrollHeight,
      scrollable: navigation.scrollHeight > navigation.clientHeight + 2,
      overflowY: getComputedStyle(navigation).overflowY,
    } : null;
    const nextAction = document.querySelector(".tt-global-next-action");
    const nextActionRect = nextAction?.getBoundingClientRect();
    const nextActionStyle = nextAction ? getComputedStyle(nextAction) : null;
    return {
      primaryHeading: headings[0] || "",
      contentTextLength: contentText.length,
      contentInteractiveCount: contentInteractive.length,
      headingCount: headings.length,
      horizontalOverflow: Math.round(horizontalOverflow),
      viewportClippedCount: clipped.length,
      hiddenOverflowContainerCount: hiddenOverflow.length,
      narrowTextRailCount: narrowTextRails.length,
      narrowTextRailExamples: narrowTextRails.slice(0, 8).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 120),
          text: text(element).slice(0, 140),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }),
      smallTouchTargetCount: touchProblems,
      workspace,
      documentTitle: document.title,
      url: window.location.href,
      navigationScroll,
      nextAction: nextAction && nextActionRect ? {
        visible: visible(nextAction),
        zIndex: nextActionStyle?.zIndex || "auto",
        pointerEvents: nextActionStyle?.pointerEvents || "auto",
        top: Math.round(nextActionRect.top),
        bottom: Math.round(nextActionRect.bottom),
      } : null,
    };
  });
}

function findingsFor(metrics, viewportName) {
  const findings = [];
  if (metrics.horizontalOverflow > 2) findings.push({ severity: "error", code: "horizontal-overflow", message: `Rendered content exceeds ${viewportName} viewport by ${metrics.horizontalOverflow}px.` });
  if (metrics.viewportClippedCount > 0) findings.push({ severity: "error", code: "viewport-clipping", message: `${metrics.viewportClippedCount} visible element(s) extend beyond the viewport.` });
  if (metrics.hiddenOverflowContainerCount > 0) findings.push({ severity: "warning", code: "hidden-overflow", message: `${metrics.hiddenOverflowContainerCount} visible container(s) hide wider content.` });
  if (metrics.narrowTextRailCount > 0) findings.push({ severity: "error", code: "narrow-text-rail", message: `${metrics.narrowTextRailCount} long-text element(s) collapsed into a narrow vertical rail on ${viewportName}.` });
  if (metrics.contentInteractiveCount > 20) findings.push({ severity: "warning", code: "interaction-density", message: `${metrics.contentInteractiveCount} content controls are competing for attention.` });
  if (metrics.contentTextLength > 1500) findings.push({ severity: "warning", code: "text-density", message: `${metrics.contentTextLength} content characters are rendered in the active content area.` });
  if (metrics.smallTouchTargetCount > 0) findings.push({ severity: "warning", code: "touch-targets", message: `${metrics.smallTouchTargetCount} actionable controls are smaller than 44px in at least one dimension.` });
  if (!metrics.primaryHeading) findings.push({ severity: "warning", code: "missing-h1", message: "No visible primary heading was detected." });
  if (metrics.navigationScroll?.scrollable && metrics.navigationScroll.overflowY === "visible") findings.push({ severity: "error", code: "navigation-scroll-contract", message: "Navigation reports scrollable content but exposes visible vertical overflow." });
  if (metrics.nextAction && (metrics.nextAction.zIndex === "auto" || metrics.nextAction.pointerEvents === "none")) findings.push({ severity: "warning", code: "next-action-hit-area", message: "The global next-action control lacks explicit stacking/pointer evidence." });
  if (!findings.length) findings.push({ severity: "info", code: "visual-health", message: "No major automated visual-layout issue detected; screenshot review remains authoritative." });
  return findings;
}

async function captureRoute(page, route, viewport, outputDirForViewport, results) {
  const runtimeErrors = [];
  const requestFailures = [];
  const consoleErrors = [];
  const onPageError = (error) => runtimeErrors.push(error.message);
  const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text()); };
  const onRequestFailed = (request) => requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || "unknown"}`);
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);

  try {
    const response = await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(650);
    await dismissPrivacyConsent(page);
    await completeAccountSetup(page);

    const metrics = await collectMetrics(page);
    const name = `${safeName(route)}-${viewport.name}`;
    const viewportScreenshot = path.join(outputDirForViewport, `${name}-viewport.png`);
    const fullScreenshot = path.join(outputDirForViewport, `${name}-full.png`);
    await page.screenshot({ path: viewportScreenshot, fullPage: false });
    await page.screenshot({ path: fullScreenshot, fullPage: true });

    const findings = findingsFor(metrics, viewport.name);
    const allErrors = [...runtimeErrors, ...consoleErrors, ...requestFailures];
    if (allErrors.length) findings.unshift({ severity: "error", code: "runtime-errors", message: `${allErrors.length} browser/runtime error(s) were captured on this route.` });

    const result = {
      route,
      viewport: { ...viewport },
      requestedRoute: route,
      finalUrl: page.url(),
      responseStatus: response?.status() || null,
      metrics,
      findings,
      runtimeErrors,
      consoleErrors,
      requestFailures,
      viewportScreenshot: path.relative(outputDir, viewportScreenshot).replaceAll(path.sep, "/"),
      fullPageScreenshot: path.relative(outputDir, fullScreenshot).replaceAll(path.sep, "/"),
    };
    results.push(result);
    console.log(`${findings.some((item) => item.severity === "error") ? "🔴" : findings.some((item) => item.severity === "warning") ? "🟠" : "🟢"} ${viewport.name.padEnd(8)} ${route.padEnd(28)} ${metrics.workspace.padEnd(16)} ${metrics.primaryHeading.slice(0, 48)}`);
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
    page.off("requestfailed", onRequestFailed);
  }
}

async function writeGallery(results) {
  const rows = results.map((result) => `
    <article>
      <h2>${escapeHtml(result.route)} · ${escapeHtml(result.viewport.name)}</h2>
      <p>${escapeHtml(result.metrics.primaryHeading || result.metrics.documentTitle)} · ${result.viewport.width}×${result.viewport.height} · workspace: ${escapeHtml(result.metrics.workspace)}</p>
      <div class="shots">
        <figure><figcaption>Viewport</figcaption><a href="${escapeHtml(result.viewportScreenshot)}"><img loading="lazy" src="${escapeHtml(result.viewportScreenshot)}" alt="${escapeHtml(result.route)} viewport"></a></figure>
        <figure><figcaption>Full page</figcaption><a href="${escapeHtml(result.fullPageScreenshot)}"><img loading="lazy" src="${escapeHtml(result.fullPageScreenshot)}" alt="${escapeHtml(result.route)} full page"></a></figure>
      </div>
      <pre>${escapeHtml(JSON.stringify(result.findings, null, 2))}</pre>
    </article>`).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tiny Titans Visual Review</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.4;background:#101216;color:#eee}h1{margin-top:0}article{margin:0 0 40px;padding:20px;border:1px solid #343944;border-radius:16px;background:#181b20}.shots{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:12px;background:#0b0d10}figcaption{margin:0 0 8px;font-weight:700}pre{white-space:pre-wrap;font-size:.78rem;opacity:.72;margin:16px 0 0}@media(max-width:800px){.shots{grid-template-columns:1fr}}</style></head><body><h1>Tiny Titans · Visual Review BOT</h1><p>Rendered browser evidence: screenshots, viewport metrics, runtime errors and recorded viewport journeys.</p>${rows}</body></html>`;
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");
}

async function writeSummary(report) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const errors = report.results.flatMap((result) => result.findings.filter((item) => item.severity === "error").map((item) => `${result.viewport.name} ${result.route}: ${item.code} — ${item.message}`));
  const warnings = report.results.flatMap((result) => result.findings.filter((item) => item.severity === "warning").map((item) => `${result.viewport.name} ${result.route}: ${item.code} — ${item.message}`));
  const lines = [
    "# Tiny Titans Visual Review BOT",
    "",
    `Captured **${report.screenshotCount} screenshots** and **${report.videoCount} recorded viewport journeys** across **${report.routes.length} routes** and **${report.viewports.length} viewports**.`,
    "",
    `Commit: \`${process.env.GITHUB_SHA || "local"}\``,
    `Base URL: \`${report.baseURL}\``,
    "",
    `## Automated findings\n\n- Errors: **${errors.length}**\n- Warnings: **${warnings.length}**`,
    "",
    errors.length ? `### Errors\n\n${errors.slice(0, 30).map((item) => `- ${item}`).join("\n")}` : "### Errors\n\nNone captured.",
    "",
    warnings.length ? `### Warnings\n\n${warnings.slice(0, 30).map((item) => `- ${item}`).join("\n")}` : "### Warnings\n\nNone captured.",
    "",
    "The uploaded visual artifact contains the viewport screenshots, full-page screenshots, JSON report, HTML gallery and WebM journey recordings.",
    "",
  ];
  await fs.appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const routes = parseRoutes();
  let viewports = fallbackViewports;
  try {
    const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
    if (Array.isArray(contract.responsiveViewports) && contract.responsiveViewports.length) viewports = contract.responsiveViewports;
  } catch {
    // Keep the bot standalone when the visual contract is unavailable.
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const videoPaths = [];

  try {
    for (const viewport of viewports) {
      const viewportDir = path.join(outputDir, viewport.name);
      await fs.mkdir(viewportDir, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        recordVideo: { dir: viewportDir, size: { width: viewport.width, height: viewport.height } },
      });
      const page = await context.newPage();
      try {
        await signIn(page);
        for (const route of routes) await captureRoute(page, route, viewport, viewportDir, results);
      } finally {
        const video = page.video();
        await context.close();
        if (video) {
          const source = await video.path().catch(() => null);
          if (source) {
            const destination = path.join(outputDir, `${viewport.name}-journey.webm`);
            await fs.rename(source, destination).catch(async () => { await fs.copyFile(source, destination); await fs.rm(source, { force: true }); });
            videoPaths.push(path.relative(outputDir, destination).replaceAll(path.sep, "/"));
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    bot: "Tiny Titans Visual Review BOT",
    generatedAt: new Date().toISOString(),
    baseURL,
    routes,
    viewports,
    screenshotCount: results.length * 2,
    videoCount: videoPaths.length,
    videoPaths,
    results,
    purpose: "Rendered evidence for visual page review, hierarchy, spacing, clipping, navigation, stacking, touch targets and runtime behaviour.",
    reviewGuidance: {
      viewportScreenshots: "What the user sees at the captured viewport size.",
      fullPageScreenshots: "Complete page composition including content below the fold.",
      journeyVideos: "One continuous recorded browser journey per viewport covering all requested routes.",
      heuristics: "Automated findings highlight likely problems; screenshot/video review remains authoritative.",
    },
  };

  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeGallery(results);
  await fs.writeFile(path.join(outputDir, "README.md"), "# Tiny Titans Visual Review BOT\n\nContains viewport screenshots, full-page screenshots, journey WebM recordings and report.json.\n", "utf8");
  await writeSummary(report);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
