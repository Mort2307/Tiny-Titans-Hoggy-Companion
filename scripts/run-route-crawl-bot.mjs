import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:5173";
const email = process.env.TINY_TITANS_BOT_EMAIL || process.env.TINY_TITANS_VISUAL_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD || process.env.TINY_TITANS_VISUAL_BOT_PASSWORD;
const outputDir = path.resolve(process.env.TINY_TITANS_ROUTE_CRAWL_OUTPUT || "artifacts/route-crawl");
const maxPages = Number(process.env.TINY_TITANS_ROUTE_CRAWL_MAX_PAGES || 250);
const clickTimeout = Number(process.env.TINY_TITANS_ROUTE_CRAWL_CLICK_TIMEOUT_MS || 5000);

const ignoredPathPatterns = [/\/login(?:\/|$)/i, /\/logout(?:\/|$)/i];
const ignoredButtonText = /^(delete|remove|sign out|logout|submit|save|add |create |confirm|accept|deny|allow|send|publish|upload|buy|pay|checkout)/i;

function normaliseUrl(url) {
  const parsed = new URL(url, baseURL);
  return `${parsed.pathname}${parsed.search}`;
}

function pageCategory(pathname) {
  const first = pathname.split("/").filter(Boolean)[0];
  const map = {
    account: "Account", snakes: "My Snakes", reminders: "Reminders", feeding: "Feeding", shedding: "Shedding", weights: "Weights",
    health: "Health", behaviour: "Behaviour", husbandry: "Husbandry", "enclosure-intelligence": "Enclosure Intelligence",
    breeding: "Breeding", "morph-library": "Morph Library", calculator: "Genetics Calculator", "knowledge-base": "Knowledge Base",
    "keeper-handbook": "Keeper Handbook", learn: "Learning", "adaptive-learning": "Adaptive Learning", challenge: "Titans Challenge",
    community: "Community", feedback: "Feedback", "report-bug": "Bug Reporting", "report-issue": "Issue Reporting", creator: "Creator Centre",
    educator: "Educator", paid: "Paid Features", "titan-intelligence": "Titan Intelligence", "reptile-room": "Reptile Room", founder: "Founder",
    "become-a-titan": "Become a Titan", sandbox: "Sandbox", "behaviour-observatory": "Behaviour Observatory", "make-contribution": "Contributions",
    "submit-species": "Species Submission", conversations: "Conversations", "wall-of-titans": "Wall of Titans", marketplace: "Marketplace",
  };
  return map[first] || (pathname === "/" ? "Main Page" : first ? first.replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Main Page");
}

async function signIn(page) {
  if (!email || !password) throw new Error("Route Crawl BOT requires TINY_TITANS_BOT_EMAIL and TINY_TITANS_BOT_PASSWORD.");
  await page.goto(new URL("/login", baseURL).toString(), { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) throw new Error("Route Crawl BOT could not authenticate.");
}

async function snapshotPage(page, markCandidates = false) {
  return page.evaluate((mark) => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const identity = (el) => {
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140);
      const href = el.tagName === "A" ? (el.getAttribute("href") || "") : "";
      const aria = el.getAttribute("aria-label") || "";
      const testId = el.getAttribute("data-testid") || "";
      const rect = el.getBoundingClientRect();
      return { text, href, aria, testId, tag: el.tagName.toLowerCase(), className: String(el.className || "").slice(0, 160), x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
    };
    const heading = document.querySelector("main h1, [role='main'] h1, h1")?.textContent?.trim() || document.title || "Untitled page";
    const selectors = ["a[href]", "button:not([type='submit'])", "[role='button']", "[data-testid*='tile']", "[class*='tile']", "[class*='card']"];
    const seen = new Set();
    const items = [];
    let candidateIndex = 0;
    for (const el of document.querySelectorAll(selectors.join(","))) {
      if (!visible(el)) continue;
      const info = identity(el);
      const key = `${info.tag}|${info.href}|${info.aria}|${info.testId}|${info.text}|${info.x}|${info.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const classes = `${info.className} ${info.testId}`.toLowerCase();
      const isLink = info.tag === "a";
      const hrefIsNavigable = isLink && info.href && !info.href.startsWith("#") && !info.href.startsWith("mailto:") && !info.href.startsWith("tel:") && !info.href.startsWith("javascript:");
      const buttonText = info.text || info.aria || info.testId || "";
      const safeButton = (info.tag === "button" || el.getAttribute("role") === "button") && !el.disabled && !/submit|reset/i.test(el.getAttribute("type") || "") && !ignoredButtonText.test(buttonText);
      const looksLikeTile = /tile|card|panel|feature|shortcut|action/.test(classes) || (info.width >= 120 && info.height >= 60 && !!info.text);
      const actionable = Boolean(hrefIsNavigable || safeButton);
      if (mark && actionable) el.setAttribute("data-tt-route-crawl-id", String(candidateIndex));
      items.push({ ...info, hrefIsNavigable: Boolean(hrefIsNavigable), safeButton, looksLikeTile, actionable, crawlId: actionable ? candidateIndex : null });
      if (actionable) candidateIndex += 1;
    }
    const tileCandidates = items.filter((item) => item.looksLikeTile);
    return {
      heading,
      title: document.title,
      pageSignature: `${heading}|${document.querySelector("main, [role='main']")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 900) || document.body.innerText.slice(0, 900)}`,
      tiles: tileCandidates,
      navigationTargets: items.filter((item) => item.actionable && (!item.href || new URL(item.href, location.href).origin === location.origin)),
      allInteractive: items,
    };
  }, markCandidates);
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(300);
}

async function clickCandidate(page, target) {
  const locator = page.locator(`[data-tt-route-crawl-id="${target.crawlId}"]`).first();
  if (!(await locator.count())) throw new Error("The targeted tile/control disappeared before it could be clicked.");
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click({ timeout: clickTimeout });
}

function classifyOutcome({ beforeUrl, afterUrl, beforeSignature, afterSignature, expectedHref, errors, returnedToEarlierState }) {
  if (errors.length) return { status: "RUNTIME_ERROR", reason: `${errors.length} runtime/console/click error(s) captured.` };
  const before = normaliseUrl(beforeUrl);
  const after = normaliseUrl(afterUrl);
  const expected = expectedHref ? normaliseUrl(new URL(expectedHref, beforeUrl).toString()) : null;
  if (expected && after === expected && afterSignature === beforeSignature) return { status: "LOOP", reason: "The click returned to an equivalent page state instead of reaching a new destination." };
  if (expected && after !== expected) {
    if (returnedToEarlierState || after === before) return { status: "LOOP", reason: `Expected ${expected}, but navigation returned to an earlier state (${after}).` };
    return { status: "WRONG_DESTINATION", reason: `Expected ${expected}, reached ${after}.` };
  }
  if (!expected && after === before && afterSignature === beforeSignature) return { status: "NO_OP", reason: "Click produced no observable route or page-state change." };
  if (!expected && after === before) return { status: "PASS", reason: "Control produced a measurable in-page state change without changing the URL." };
  return { status: "PASS", reason: `Destination/state reached: ${after}.` };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const visited = new Set();
  const queued = ["/"];
  const pages = [];
  const clickResults = [];
  const globalErrors = [];
  const stateHistory = new Map();

  page.on("pageerror", (error) => globalErrors.push({ type: "pageerror", message: error.message, url: page.url() }));
  page.on("console", (message) => { if (message.type() === "error") globalErrors.push({ type: "console", message: message.text(), url: page.url() }); });

  try {
    await signIn(page);
    while (queued.length && visited.size < maxPages) {
      const route = queued.shift();
      if (visited.has(route)) continue;
      visited.add(route);
      const pageErrorsBefore = globalErrors.length;
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
      await waitForStablePage(page);
      const snapshot = await snapshotPage(page, true);
      const routeErrors = globalErrors.slice(pageErrorsBefore);
      const currentUrl = normaliseUrl(page.url());
      const category = pageCategory(new URL(page.url()).pathname);
      const signature = `${currentUrl}|${snapshot.pageSignature}`;
      stateHistory.set(signature, (stateHistory.get(signature) || 0) + 1);

      pages.push({
        route: currentUrl, category, heading: snapshot.heading, title: snapshot.title,
        tileCount: snapshot.tiles.length,
        navigationCount: snapshot.navigationTargets.length,
        runtimeErrors: routeErrors,
        tiles: snapshot.tiles.map((tile) => ({ label: tile.text || tile.aria || tile.testId || "Unlabelled control", type: tile.href ? "link" : "button", href: tile.href || null, testId: tile.testId || null, className: tile.className })),
      });

      for (const target of snapshot.navigationTargets) {
        const hrefUrl = target.href ? new URL(target.href, page.url()) : null;
        if (hrefUrl && ignoredPathPatterns.some((pattern) => pattern.test(hrefUrl.pathname))) continue;
        const before = page.url();
        const beforeSnapshot = await snapshotPage(page, false);
        const beforeSignature = `${normaliseUrl(before)}|${beforeSnapshot.pageSignature}`;
        const beforeErrors = globalErrors.length;
        let clickError = null;
        try {
          await clickCandidate(page, target);
          await waitForStablePage(page);
        } catch (error) {
          clickError = error instanceof Error ? error.message : String(error);
        }
        const after = page.url();
        const destinationSnapshot = await snapshotPage(page, false).catch(() => ({ heading: "", title: "", pageSignature: "", navigationTargets: [], tiles: [], allInteractive: [] }));
        const afterSignature = `${normaliseUrl(after)}|${destinationSnapshot.pageSignature}`;
        const errors = [...globalErrors.slice(beforeErrors), ...(clickError ? [{ type: "click", message: clickError }] : [])];
        const returnedToEarlierState = Boolean(stateHistory.get(afterSignature));
        const outcome = classifyOutcome({ beforeUrl: before, afterUrl: after, beforeSignature, afterSignature, expectedHref: hrefUrl?.toString() || null, errors, returnedToEarlierState });
        const destinationPath = normaliseUrl(after);
        const isDiscoverable = outcome.status === "PASS" && destinationPath !== normaliseUrl(before) && !visited.has(destinationPath);
        if (isDiscoverable) queued.push(destinationPath);
        if (outcome.status === "PASS") stateHistory.set(afterSignature, (stateHistory.get(afterSignature) || 0) + 1);

        clickResults.push({
          source: before, sourceCategory: category, sourceHeading: beforeSnapshot.heading,
          label: target.text || target.aria || target.testId || target.href || "Unlabelled control",
          elementType: target.href ? "link" : "button", href: hrefUrl ? hrefUrl.pathname + hrefUrl.search : null,
          status: outcome.status, reason: outcome.reason, destination: destinationPath,
          destinationHeading: destinationSnapshot.heading, runtimeErrors: errors, tileLike: target.looksLikeTile,
        });

        await page.goto(before, { waitUntil: "domcontentloaded" });
        await waitForStablePage(page);
        await snapshotPage(page, true);
      }
    }

    const categoryNames = [...new Set(pages.map((item) => item.category))];
    const categorySummary = categoryNames.map((category) => {
      const categoryPages = pages.filter((item) => item.category === category);
      const categoryClicks = clickResults.filter((item) => item.sourceCategory === category);
      return {
        category,
        pageCount: categoryPages.length,
        totalTiles: categoryPages.reduce((sum, item) => sum + item.tileCount, 0),
        averageTilesPerPage: categoryPages.length ? Number((categoryPages.reduce((sum, item) => sum + item.tileCount, 0) / categoryPages.length).toFixed(1)) : 0,
        totalNavigationTargets: categoryPages.reduce((sum, item) => sum + item.navigationCount, 0),
        passed: categoryClicks.filter((item) => item.status === "PASS").length,
        noOp: categoryClicks.filter((item) => item.status === "NO_OP").length,
        loops: categoryClicks.filter((item) => item.status === "LOOP").length,
        wrongDestination: categoryClicks.filter((item) => item.status === "WRONG_DESTINATION").length,
        runtimeErrors: categoryClicks.filter((item) => item.status === "RUNTIME_ERROR").length,
      };
    });

    const report = {
      bot: "Tiny Titans Route Crawl BOT",
      generatedAt: new Date().toISOString(),
      baseURL,
      authenticated: true,
      pagesVisited: pages.length,
      tileCount: pages.reduce((sum, item) => sum + item.tileCount, 0),
      navigationTargetsTested: clickResults.length,
      outcomes: {
        pass: clickResults.filter((item) => item.status === "PASS").length,
        noOp: clickResults.filter((item) => item.status === "NO_OP").length,
        loops: clickResults.filter((item) => item.status === "LOOP").length,
        wrongDestination: clickResults.filter((item) => item.status === "WRONG_DESTINATION").length,
        runtimeErrors: clickResults.filter((item) => item.status === "RUNTIME_ERROR").length,
      },
      categories: categorySummary,
      pages,
      clickResults,
      globalRuntimeErrors: globalErrors,
      methodology: [
        "Links and safe React/button controls are exercised, not merely inspected.",
        "A PASS requires a new expected route or a measurable in-page state change.",
        "NO_OP means the control produced no observable change.",
        "LOOP means the control returns to an already-seen equivalent state or unexpected earlier state.",
      ],
    };
    await fs.writeFile(path.join(outputDir, "route-crawl-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ bot: report.bot, pagesVisited: report.pagesVisited, navigationTargetsTested: report.navigationTargetsTested, outcomes: report.outcomes }, null, 2));
    if (report.outcomes.loops || report.outcomes.wrongDestination || report.outcomes.runtimeErrors) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
