import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const routerPath = path.resolve("src/routes/AppRouter.tsx");
const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-review");
const outputPath = path.join(outputDir, "route-set.json");
const maxPages = Number(process.env.TINY_TITANS_VISUAL_ROUTE_DISCOVERY_MAX_PAGES || 400);
const clickTimeout = Number(process.env.TINY_TITANS_VISUAL_ROUTE_DISCOVERY_CLICK_TIMEOUT_MS || 2500);

const layoutSpecialRoutes = [
  "/plans",
  "/account/billing",
  "/paid",
  "/paid/analytics",
  "/paid/timeline",
  "/paid/export",
  "/paid/seller",
  "/paid/marketplace",
  "/paid/business",
  "/paid/team",
  "/paid/automation",
  "/paid/support",
  "/paid/api",
  "/paid/branding",
  "/rescue/log",
];

const ignoredPathPatterns = [/^\/login(?:\/|$)/i, /^\/logout(?:\/|$)/i, /^\/account-setup(?:\/|$)/i];
const ignoredButtonText = /^(delete|remove|sign out|logout|submit|save|add |create |confirm|accept|deny|allow|send|publish|upload|buy|pay|checkout|revoke)/i;

function normaliseRoute(value) {
  try {
    const parsed = new URL(value, baseURL);
    const route = `${parsed.pathname}${parsed.search}`.replace(/#.*$/, "");
    return route || "/";
  } catch {
    return null;
  }
}

function extractDeclaredRoutes(router) {
  const routes = [];
  for (const match of router.matchAll(/<Route\s+path=["']([^"']+)["']/g)) routes.push(match[1]);
  return [...new Set(routes)];
}

function isConcreteRoute(route) {
  return Boolean(route) && !route.includes(":") && !route.includes("*") && route !== "/login" && route !== "/account-setup" && route !== "*";
}

function hrefsFromSnapshot(snapshot) {
  return snapshot.filter((href) => {
    const route = normaliseRoute(href);
    return route && route.startsWith("/") && !ignoredPathPatterns.some((pattern) => pattern.test(route));
  });
}

async function signIn(page) {
  if (!email || !password) throw new Error("Visual route discovery requires TINY_TITANS_VISUAL_BOT_EMAIL and TINY_TITANS_VISUAL_BOT_PASSWORD (or the legacy BOT variables).");
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) throw new Error("Visual route discovery could not authenticate.");
}

async function waitForStable(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(300);
}

async function collectSnapshot(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const text = (element) => (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140);
    const interactive = [...document.querySelectorAll("a[href],button,[role='button']")].filter(visible);
    const links = interactive.filter((element) => element.tagName === "A").map((element) => element.getAttribute("href") || "");
    const buttons = interactive.filter((element) => element.tagName === "BUTTON" || element.getAttribute("role") === "button").map((element) => ({ text: text(element), disabled: Boolean(element.disabled) }));
    return { links, buttons, title: document.title, heading: text(document.querySelector("main h1, [role='main'] h1, h1")) };
  });
}

async function markButtons(page) {
  await page.evaluate(() => {
    let index = 0;
    for (const element of document.querySelectorAll("button,[role='button']")) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      if (!visible || element.disabled || !text || /submit|reset/i.test(element.getAttribute("type") || "")) continue;
      if (element.closest("nav,header,footer,[role='navigation'],.sidebar,.app-sidebar,.bottom-nav")) continue;
      element.setAttribute("data-tt-visual-discovery-id", String(index++));
    }
  });
}

function runCapture(routes) {
  const env = { ...process.env, TINY_TITANS_VISUAL_ROUTES: routes.join(",") };
  const child = spawnSync(process.execPath, [path.resolve("scripts/run-visual-review-bot.mjs")], { stdio: "inherit", env });
  return child.status ?? 1;
}

async function annotateCaptureReport(routeSource) {
  const reportPath = path.join(outputDir, "report.json");
  try {
    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    const routeSet = JSON.parse(await fs.readFile(outputPath, "utf8"));
    report.routeSource = routeSource;
    report.routeSet = {
      discoveredRouteCount: Number(routeSet.discoveredRouteCount || routeSet.routes?.length || 0),
      declaredRouteCount: Number(routeSet.declaredRouteCount || 0),
      discoveryPages: Number(routeSet.discoveryPages?.length || 0),
      dynamicDeclaredRoutes: Array.isArray(routeSet.dynamicDeclaredRoutes) ? routeSet.dynamicDeclaredRoutes : [],
    };
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } catch (error) {
    console.warn(`Could not annotate visual report with route provenance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const explicitRoutes = String(process.env.TINY_TITANS_VISUAL_ROUTES || "").trim();
  if (explicitRoutes) {
    const routes = [...new Set(explicitRoutes.split(/[\n,;]+/).map((item) => normaliseRoute(item)).filter(Boolean))];
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify({ source: "explicit", generatedAt: new Date().toISOString(), routes, skippedPatterns: [], discoveryPages: 0 }, null, 2)}\n`, "utf8");
    console.log(`Using ${routes.length} explicit visual routes.`);
    const exitCode = runCapture(routes);
    if (exitCode === 0) await annotateCaptureReport("explicit-route-list");
    process.exitCode = exitCode;
    return;
  }

  const router = await fs.readFile(routerPath, "utf8");
  const declared = extractDeclaredRoutes(router);
  const seedRoutes = [...new Set([...declared.filter(isConcreteRoute), ...layoutSpecialRoutes])];
  const queued = [...seedRoutes];
  const discovered = new Set(seedRoutes);
  const visited = new Set();
  const discoveryPages = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    await signIn(page);
    while (queued.length && visited.size < maxPages) {
      const route = queued.shift();
      if (!route || visited.has(route)) continue;
      visited.add(route);
      let navigationError = null;
      try {
        await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });
        await waitForStable(page);
      } catch (error) {
        navigationError = error instanceof Error ? error.message : String(error);
      }

      const finalRoute = normaliseRoute(page.url()) || route;
      const snapshot = await collectSnapshot(page).catch(() => ({ links: [], buttons: [], title: "", heading: "" }));
      const linkRoutes = hrefsFromSnapshot(snapshot.links).map(normaliseRoute).filter(Boolean);
      for (const candidate of linkRoutes) {
        if (!discovered.has(candidate)) {
          discovered.add(candidate);
          queued.push(candidate);
        }
      }

      await markButtons(page).catch(() => undefined);
      const buttonCount = await page.locator("[data-tt-visual-discovery-id]").count().catch(() => 0);
      const buttonRoutes = new Set();
      for (let index = 0; index < buttonCount; index += 1) {
        const button = page.locator(`[data-tt-visual-discovery-id=\"${index}\"]`).first();
        if (!(await button.count())) continue;
        const label = await button.innerText().catch(() => "");
        if (!label || ignoredButtonText.test(label.trim())) continue;
        const before = page.url();
        try {
          await button.click({ timeout: clickTimeout });
          await waitForStable(page);
          const after = normaliseRoute(page.url());
          if (after && after !== normaliseRoute(before)) buttonRoutes.add(after);
          if (after && !discovered.has(after)) {
            discovered.add(after);
            queued.push(after);
          }
        } catch {
        }
        await page.goto(before, { waitUntil: "domcontentloaded" }).catch(() => undefined);
        await waitForStable(page);
      }

      discoveryPages.push({ requestedRoute: route, finalRoute, title: snapshot.title, heading: snapshot.heading, linkCount: linkRoutes.length, buttonRouteCount: buttonRoutes.size, navigationError });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const routes = [...discovered].sort((left, right) => left.localeCompare(right));
  const dynamicDeclaredRoutes = declared.filter((route) => !isConcreteRoute(route));
  const routeReport = {
    source: "router-plus-authenticated-runtime-discovery",
    generatedAt: new Date().toISOString(),
    baseURL,
    declaredRouteCount: declared.length,
    seedRouteCount: seedRoutes.length,
    discoveredRouteCount: routes.length,
    routes,
    dynamicDeclaredRoutes,
    discoveryPages,
    skippedPatterns: ignoredPathPatterns.map((pattern) => String(pattern)),
  };
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(routeReport, null, 2)}\n`, "utf8");
  console.log(`Discovered ${routes.length} concrete visual routes from ${seedRoutes.length} declared/layout-special seeds.`);
  const exitCode = runCapture(routes);
  if (exitCode === 0) await annotateCaptureReport("router-plus-authenticated-runtime-discovery");
  process.exitCode = exitCode;
}

await main();
