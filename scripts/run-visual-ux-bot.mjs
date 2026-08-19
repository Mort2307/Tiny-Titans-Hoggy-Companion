import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD;
const outputDir = path.resolve("artifacts/visual-ux");
const contractPath = path.resolve("docs/visual-design-contract.json");

const routes = [
  "/", "/snakes", "/weights", "/feeding", "/shedding", "/behaviour", "/health",
  "/husbandry", "/enclosure-intelligence", "/morph-library", "/calculator", "/sandbox",
  "/breeding", "/knowledge-base", "/learn", "/adaptive-learning", "/challenge",
  "/learn/achievements", "/community", "/report-bug", "/feedback", "/account",
];

const concepts = {
  "/": { name: "Intelligence Dashboard", reason: "Prioritise what the keeper should know or do next; move secondary information behind purposeful destinations." },
  "/snakes": { name: "Visual Collection", reason: "Make the snakes themselves the visual anchors with quick intelligence and clear actions." },
  "/weights": { name: "Data Timeline", reason: "Make the current measurement, trajectory and history visually dominant." },
  "/feeding": { name: "Care Log", reason: "Present feeding as a repeatable care workflow rather than a generic dashboard." },
  "/shedding": { name: "Lifecycle Timeline", reason: "Represent blue → clear → full shed as one coherent cycle with editable stages." },
  "/husbandry": { name: "Guided Field Guide", reason: "Combine personalised interpretation with sourceable care guidance and progressive disclosure." },
  "/enclosure-intelligence": { name: "Environment Control Panel", reason: "Make live conditions, enclosure completeness and editable readings the visual centre." },
  "/calculator": { name: "Genetics Workbench", reason: "Separate inputs, calculation output and interpretation so the pairing workflow is obvious." },
  "/breeding": { name: "Project Workspace", reason: "Treat breeding as a project with milestones, pairings, genetics and hatchlings." },
  "/learn": { name: "Digital Field Guide", reason: "Use topic discovery, progression and learning context instead of dense dashboard cards." },
};

async function signIn(page) {
  if (!email || !password) throw new Error("Visual UX BOT requires TINY_TITANS_BOT_EMAIL and TINY_TITANS_BOT_PASSWORD.");
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) throw new Error("Visual UX BOT could not authenticate.");
}

async function auditPage(page, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const errors = [];
  const consoleErrors = [];
  const onPageError = (error) => errors.push(error.message);
  const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text()); };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  try {
    await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      const text = body?.innerText || "";
      const interactive = [...document.querySelectorAll("button, a, input, select, textarea, [role='button']")];
      const clickable = [...document.querySelectorAll("button, a, [role='button']")];
      const touchProblems = interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      }).length;
      const cards = [...document.querySelectorAll("[class*='card'], [class*='tile'], [class*='panel']")];
      const headings = document.querySelectorAll("h1, h2, h3").length;
      const primaryHeading = document.querySelector("h1")?.textContent?.trim() || "";
      const styles = getComputedStyle(root);
      const brandSignals = [
        styles.getPropertyValue("--tt-brand").trim(),
        styles.getPropertyValue("--tt-brand-strong").trim(),
        styles.getPropertyValue("--tt-accent").trim(),
        styles.getPropertyValue("--tt-warning").trim(),
      ].filter(Boolean);
      const bodyRect = body?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const overflow = Math.max(root.scrollWidth - viewportWidth, bodyRect ? bodyRect.width - viewportWidth : 0);
      const links = clickable.filter((element) => element.tagName === "A").filter((element) => !(element.getAttribute("href") || "").trim()).length;
      const buttons = clickable.filter((element) => element.tagName === "BUTTON");
      const suspiciousButtons = buttons.filter((button) => !button.disabled && !button.getAttribute("aria-label") && !(button.textContent || "").trim()).length;
      return { textLength: text.length, interactiveCount: interactive.length, cardCount: cards.length, headingCount: headings, primaryHeading, touchProblems, overflow: Math.max(0, overflow), emptyLinks: links, suspiciousButtons, brandSignals, bodyWidth: bodyRect?.width || 0, viewportWidth };
    });

    const findings = [];
    if (metrics.overflow > 2) findings.push({ severity: "error", code: "horizontal-overflow", message: `Rendered content exceeds the ${viewport.name} viewport by ${Math.round(metrics.overflow)}px.` });
    if (!metrics.primaryHeading) findings.push({ severity: "warning", code: "missing-h1", message: "No primary h1 heading was detected." });
    if (metrics.interactiveCount > 18) findings.push({ severity: "warning", code: "interaction-density", message: `${metrics.interactiveCount} interactive controls are competing for attention.` });
    if (metrics.textLength > 1200) findings.push({ severity: "warning", code: "text-density", message: `${metrics.textLength} rendered text characters suggest the page may benefit from progressive disclosure.` });
    if (metrics.touchProblems > 0) findings.push({ severity: "warning", code: "touch-targets", message: `${metrics.touchProblems} visible controls are smaller than the 44px touch-target guideline.` });
    if (metrics.brandSignals.length < 3) findings.push({ severity: "warning", code: "brand-signal", message: "The rendered page does not expose the full Tiny Titans brand token set." });
    if (metrics.suspiciousButtons > 0 || metrics.emptyLinks > 0) findings.push({ severity: "warning", code: "ambiguous-actions", message: `${metrics.suspiciousButtons + metrics.emptyLinks} controls/links appear to lack useful visible or semantic action cues.` });
    if (!findings.length) findings.push({ severity: "info", code: "visual-health", message: "No major heuristic visual issues detected at this viewport. Screenshot review remains recommended." });

    const concept = concepts[route] || { name: "Purpose-led composition", reason: "Keep the Tiny Titans design language while choosing a layout that matches the page's primary job." };
    const score = Math.max(0, Math.min(100, 100 - findings.reduce((total, finding) => total + (finding.severity === "error" ? 22 : finding.severity === "warning" ? 9 : 0), 0)));
    return { route, viewport: viewport.name, score, metrics, findings, alternativeConcept: concept, screenshot: null, runtimeErrors: [...errors, ...consoleErrors] };
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
  }
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await signIn(page);
    const results = [];
    for (const viewport of contract.responsiveViewports) {
      for (const route of routes) {
        const result = await auditPage(page, route, viewport);
        const safeRoute = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
        const screenshotPath = path.join(outputDir, `${safeRoute}-${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshot = screenshotPath.replaceAll(path.sep, "/");
        results.push(result);
        console.log(`${result.score >= 85 ? "🟢" : result.score >= 70 ? "🟠" : "🔴"} ${viewport.name.padEnd(7)} ${route.padEnd(28)} ${result.score}%`);
      }
    }
    const routeSummary = routes.map((route) => {
      const routeResults = results.filter((result) => result.route === route);
      const average = Math.round(routeResults.reduce((sum, result) => sum + result.score, 0) / routeResults.length);
      const findings = [...new Map(routeResults.flatMap((result) => result.findings.map((finding) => [finding.code, finding])).values())];
      const concept = concepts[route] || { name: "Purpose-led composition", reason: "Choose a composition based on the page's primary job." };
      return { route, averageScore: average, findings, recommendedConcept: concept, screenshots: routeResults.map((result) => result.screenshot) };
    });
    const report = { bot: "Tiny Titans Visual UX BOT", generatedAt: new Date().toISOString(), baseURL, routesInspected: routes.length, viewports: contract.responsiveViewports, screenshotCount: results.length, results, routeSummary, methodology: ["Rendered evidence is captured with Playwright at mobile, tablet and desktop sizes.", "Heuristics flag overflow, hierarchy, density, touch-target and action-clarity problems.", "Alternative page concepts are selected by page purpose rather than applying one template everywhere.", "The Tiny Titans visual contract remains authoritative for brand identity.", "The bot recommends changes; it never silently mutates production code."] };
    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(outputDir, "README.md"), `# Tiny Titans Visual UX BOT\n\nGenerated: ${report.generatedAt}\n\nRoutes: ${report.routesInspected}\nScreenshots: ${report.screenshotCount}\n\nOpen \\`report.json\\` for route-level findings and recommended alternative page concepts. Screenshots are stored beside the report.\n`);
    console.log(`\\nVisual UX BOT complete: ${results.length} rendered page/viewport audits and ${results.length} screenshots.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(`Visual UX BOT failed: ${error instanceof Error ? error.message : error}`); process.exit(1); });
