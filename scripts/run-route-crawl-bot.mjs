import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_BOT_EMAIL || process.env.TINY_TITANS_VISUAL_BOT_EMAIL;
const password = process.env.TINY_TITANS_BOT_PASSWORD || process.env.TINY_TITANS_VISUAL_BOT_PASSWORD;
const outputDir = path.resolve(process.env.TINY_TITANS_ROUTE_CRAWL_OUTPUT || "artifacts/route-crawl");
const maxPages = Number(process.env.TINY_TITANS_ROUTE_CRAWL_MAX_PAGES || 250);
const clickTimeout = Number(process.env.TINY_TITANS_ROUTE_CRAWL_CLICK_TIMEOUT_MS || 5000);

const ignoredPathPatterns = [
  /\/login(?:\/|$)/i,
  /\/logout(?:\/|$)/i,
];
const ignoredButtonText = /^(delete|remove|sign out|logout|submit|save|add |create |confirm|accept|deny|allow|send|publish|upload|buy|pay|checkout)/i;

function normaliseUrl(url) {
  const parsed = new URL(url, baseURL);
  return `${parsed.pathname}${parsed.search}`;
}

function pageCategory(pathname) {
  const first = pathname.split("/").filter(Boolean)[0];
  const map = {
    account: "Account",
    snakes: "My Snakes",
    reminders: "Reminders",
    feeding: "Feeding",
    shedding: "Shedding",
    weights: "Weights",
    health: "Health",
    behaviour: "Behaviour",
    husbandry: "Husbandry",
    enclosure-intelligence: "Enclosure Intelligence",
    breeding: "Breeding",
    morph-library: "Morph Library",
    calculator: "Genetics Calculator",
    knowledge-base: "Knowledge Base",
    keeper-handbook: "Keeper Handbook",
    learn: "Learning",
    adaptive-learning: "Adaptive Learning",
    challenge: "Titans Challenge",
    community: "Community",
    feedback: "Feedback",
    report-bug: "Bug Reporting",
    report-issue: "Issue Reporting",
    creator: "Creator Centre",
    educator: "Educator",
    paid: "Paid Features",
    "titan-intelligence": "Titan Intelligence",
    "reptile-room": "Reptile Room",
    founder: "Founder",
    "become-a-titan": "Become a Titan",
    sandbox: "Sandbox",
    "behaviour-observatory": "Behaviour Observatory",
    "make-contribution": "Contributions",
    "submit-species": "Species Submission",
    conversations: "Conversations",
    "wall-of-titans": "Wall of Titans",
  };
  return map[first] || (pathname === "/" ? "Main Page" : first ? first.replaceAll("-", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Main Page");
}

function cleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, 180);
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

async function snapshotPage(page) {
  return page.evaluate(() => {
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
      return {
        text, href, aria, testId,
        tag: el.tagName.toLowerCase(),
        className: String(el.className || "").slice(0, 160),
        x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height),
      };
    };
    const heading = document.querySelector("main h1, [role='main'] h1, h1")?.textContent?.trim() || document.title || "Untitled page";
    const selectors = [
      "a[href]",
      "button",
      "[role='button']",
      "[data-testid*='tile']",
      "[class*='tile']",
      "[class*='card']",
    ];
    const seen = new Set();
    const items = [];
    for (const el of document.querySelectorAll(selectors.join(","))) {
      if (!visible(el)) continue;
      const info = identity(el);
      const key = `${info.tag}|${info.href}|${info.aria}|${info.testId}|${info.text}|${info.x}|${info.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isLink = info.tag === "a";
      const isNavigation = isLink && info.href && !info.href.startsWith("#") && !info.href.startsWith("mailto:") && !info.href.startsWith("tel:") && !info.href.startsWith("javascript:");
      const classes = `${info.className} ${info.testId}`.toLowerCase();
      const looksLikeTile = /tile|card|panel|feature|shortcut|action/.test(classes) || (info.width >= 120 && info.height >= 60 && !!info.text);
      const role = isNavigation ? "link" : "button";
      items.push({ ...info, role, isNavigation, looksLikeTile });
    }
    const tileCandidates = items.filter((item) => item.looksLikeTile);
    const navigationTargets = items.filter((item) => item.isNavigation && new URL(item.href, location.href).origin === location.origin);
    return { heading, title: document.title, tiles: tileCandidates, navigationTargets, allInteractive: items };
  });
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(250);
}

function classifyOutcome({ before, after, expectedHref, errors }) {
  const beforeState = normaliseUrl(before);
  const afterState = normaliseUrl(after);
  const expected = expectedHref ? normaliseUrl(new URL(expectedHref, before).toString()) : null;
  if (errors.length) return { status: "RUNTIME_ERROR", reason: `${errors.length} runtime/console error(s) captured.` };
  if (expected && afterState !== expected && afterState === beforeState) return { status: "NO_OP", reason: "Click produced no route/state change." };
  if (expected && afterState !== expected) return { status: "WRONG_DESTINATION", reason: `Expected ${expected}, reached ${afterState}.` };
  if (!expected && afterState === beforeState) return { status: "NO_OP", reason: "Click produced no observable route change." };
  return { status: "PASS", reason: `Destination reached: ${afterState}.` };
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

  page.on("pageerror", (error) => globalErrors.push({ type: "pageerror", message: error.message, url: page.url() }));
  page.on("console", (message) => {
    if (message.type() === "error") globalErrors.push({ type: "console", message: message.text(), url: page.url() });
  });

  try {
    await signIn(page);
    while (queued.length && visited.size < maxPages) {
      const route = queued.shift();
      if (visited.has(route)) continue;
      visited.add(route);
      const pageErrorsBefore = globalErrors.length;
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
      await waitForStablePage(page);
      const snapshot = await snapshotPage(page);
      const routeErrors = globalErrors.slice(pageErrorsBefore);
      const category = pageCategory(new URL(page.url()).pathname);

      const reportPage = {
        route: normaliseUrl(page.url()),
        category,
        heading: snapshot.heading,
        title: snapshot.title,
        tileCount: snapshot.tiles.length,
        navigationCount: snapshot.navigationTargets.length,
        runtimeErrors: routeErrors,
        tiles: snapshot.tiles.map((tile) => ({
          label: tile.text || tile.aria || tile.testId || "Unlabelled control",
          type: tile.role,
          href: tile.href || null,
          testId: tile.testId || null,
          className: tile.className,
        })),
      };
      pages.push(reportPage);

      for (const target of snapshot.navigationTargets) {
        const hrefUrl = new URL(target.href, page.url());
        if (ignoredPathPatterns.some((pattern) => pattern.test(hrefUrl.pathname))) continue;
        const before = page.url();
        const beforeSignature = `${normaliseUrl(before)}|${snapshot.heading}`;
        const beforeErrors = globalErrors.length;
        let clickError = null;
        try {
          const locator = page.locator(`a[href=${JSON.stringify(target.href)}]`).first();
          if (await locator.count()) {
            await locator.click({ timeout: clickTimeout });
          } else {
            continue;
          }
          await waitForStablePage(page);
        } catch (error) {
          clickError = error instanceof Error ? error.message : String(error);
        }
        const after = page.url();
        const destinationSnapshot = await snapshotPage(page).catch(() => ({ heading: "", title: "", navigationTargets: [], tiles: [], allInteractive: [] }));
        const errors = [...globalErrors.slice(beforeErrors), ...(clickError ? [{ type: "click", message: clickError }] : [])];
        const outcome = classifyOutcome({ before, after, expectedHref: hrefUrl.toString(), errors });
        const afterSignature = `${normaliseUrl(after)}|${destinationSnapshot.heading}`;
        const loopsBackToCurrent = outcome.status === "PASS" && afterSignature === beforeSignature;
        if (loopsBackToCurrent) outcome.status = "LOOP";
        const destinationPath = normaliseUrl(after);
        if (outcome.status === "PASS" && !visited.has(destinationPath)) queued.push(destinationPath);
        if (outcome.status === "PASS" || outcome.status === "LOOP") {
          // Verify a second hop cannot immediately return to the originating state.
          const destinationNav = destinationSnapshot.navigationTargets.find((item) => item.href && normaliseUrl(new URL(item.href, after).toString()) === normaliseUrl(before));
          if (destinationNav && afterSignature === beforeSignature) outcome.status = "LOOP";
        }
        clickResults.push({
          source: before,
          sourceCategory: category,
          label: target.text || target.aria || target.testId || target.href,
          href: hrefUrl.pathname + hrefUrl.search,
          status: outcome.status,
          reason: outcome.reason,
          destination: destinationPath,
          destinationHeading: destinationSnapshot.heading,
          runtimeErrors: errors,
          tileLike: target.looksLikeTile,
        });
        await page.goto(before, { waitUntil: "domcontentloaded" });
        await waitForStablePage(page);
      }
    }

    const categorySummary = [...new Set(pages.map((item) => item.category))].map((category) => {
      const categoryPages = pages.filter((item) => item.category === category);
      const categoryClicks = clickResults.filter((item) => item.sourceCategory === category);
      return {
        category,
        pageCount: categoryPages.length,
        totalTiles: categoryPages.reduce((sum, item) => sum + item.tileCount, 0),
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
      verdict: clickResults.some((item) => ["WRONG_DESTINATION", "LOOP", "RUNTIME_ERROR"].includes(item.status)) ? "FAILED" : clickResults.some((item) => item.status === "NO_OP") ? "INCOMPLETE" : "PASSED",
    };

    await fs.writeFile(path.join(outputDir, "route-crawl-report.json"), JSON.stringify(report, null, 2), "utf8");
    const lines = [
      "TINY TITANS · ROUTE CRAWL BOT REPORT",
      "======================================",
      `Generated: ${report.generatedAt}`,
      `Pages visited: ${report.pagesVisited}`,
      `Tiles detected: ${report.tileCount}`,
      `Navigation targets tested: ${report.navigationTargetsTested}`,
      `PASS: ${report.outcomes.pass}`,
      `NO-OP: ${report.outcomes.noOp}`,
      `LOOP: ${report.outcomes.loops}`,
      `WRONG DESTINATION: ${report.outcomes.wrongDestination}`,
      `RUNTIME ERROR: ${report.outcomes.runtimeErrors}`,
      `VERDICT: ${report.verdict}`,
      "",
      "PAGE INVENTORY",
      "==============",
      ...pages.map((item) => `${item.category} > ${item.heading} > ${item.tileCount} tiles > ${item.navigationCount} navigation targets`),
      "",
      "FAILURES / INCOMPLETE",
      "====================",
      ...clickResults.filter((item) => item.status !== "PASS").map((item) => `[${item.status}] ${item.source} > ${item.label} > ${item.href} :: ${item.reason}`),
    ];
    await fs.writeFile(path.join(outputDir, "route-crawl-report.txt"), `${lines.join("\n")}\n`, "utf8");
    console.log(lines.join("\n"));
    if (report.verdict === "FAILED") process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
