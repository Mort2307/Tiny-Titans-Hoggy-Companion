import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.TINY_TITANS_TEST_URL || "http://127.0.0.1:4173";
const email = process.env.TINY_TITANS_VISUAL_BOT_EMAIL || process.env.TINY_TITANS_BOT_EMAIL;
const password = process.env.TINY_TITANS_VISUAL_BOT_PASSWORD || process.env.TINY_TITANS_BOT_PASSWORD;
const outputDir = path.resolve(process.env.TINY_TITANS_VISUAL_OUTPUT || "artifacts/visual-capture");
const contractPath = path.resolve("docs/visual-design-contract.json");

const fallbackViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const defaultRoutes = ["/"];

function parseRoutes() {
  const raw = process.env.TINY_TITANS_VISUAL_ROUTES || defaultRoutes.join(",");
  const routes = raw
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("/") ? value : `/${value}`));
  return [...new Set(routes)];
}

function safeRoute(route) {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "route";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function signIn(page) {
  if (!email || !password) {
    throw new Error("Visual Capture BOT requires TINY_TITANS_VISUAL_BOT_EMAIL and TINY_TITANS_VISUAL_BOT_PASSWORD (or the legacy generic BOT variables).");
  }

  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);

  if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
    throw new Error("Visual Capture BOT could not authenticate.");
  }
}

async function collectEvidence(page, route, viewport) {
  const runtimeErrors = [];
  const consoleErrors = [];
  const onPageError = (error) => runtimeErrors.push(error.message);
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };

  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  try {
    const targetURL = new URL(route, baseURL).toString();
    const response = await page.goto(targetURL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(500);

    const evidence = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const text = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const root = document.documentElement;
      const body = document.body;
      const visibleElements = [...document.querySelectorAll("body *")].filter(visible);
      const interactive = [...document.querySelectorAll("button, a, input, select, textarea, [role='button']")].filter(visible);
      const contentInteractive = interactive.filter((element) => !element.closest("header, nav, footer, aside, [role='navigation'], [data-visual-chrome], .sidebar, .app-sidebar, .bottom-nav"));
      const visibleHeadings = [...document.querySelectorAll("h1, h2, h3")].filter(visible).map((element) => text(element)).filter(Boolean).slice(0, 20);
      const visibleSections = [...document.querySelectorAll("main section, [role='main'] section")].filter(visible).map((element) => text(element).slice(0, 180)).filter(Boolean).slice(0, 20);
      const visibleButtons = interactive.filter((element) => element.tagName === "BUTTON").map((element) => ({
        text: text(element).slice(0, 100),
        ariaLabel: element.getAttribute("aria-label") || "",
        disabled: Boolean(element.disabled),
      })).slice(0, 40);
      const links = interactive.filter((element) => element.tagName === "A").map((element) => ({
        text: text(element).slice(0, 100),
        href: element.getAttribute("href") || "",
      })).slice(0, 40);
      const mainCandidates = [...document.querySelectorAll("main, [role='main'], .page-content, .app-content")].filter(visible);
      const contentText = (mainCandidates.map((element) => text(element)).join(" ") || body?.innerText || "").trim();
      const bodyRect = body?.getBoundingClientRect();
      const overflow = Math.max(0, root.scrollWidth - viewportWidth, bodyRect ? bodyRect.width - viewportWidth : 0);
      const clipped = visibleElements.filter((element) => {
        if (["HTML", "BODY"].includes(element.tagName)) return false;
        const rect = element.getBoundingClientRect();
        return (rect.left < -2 || rect.right > viewportWidth + 2) && getComputedStyle(element).position !== "fixed" && getComputedStyle(element).position !== "sticky";
      });
      const hiddenOverflow = visibleElements.filter((element) => {
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 2 && ["hidden", "clip"].includes(style.overflowX);
      });
      const smallTargets = interactive.filter((element) => {
        const type = element.getAttribute("type")?.toLowerCase();
        if (type === "checkbox" || type === "radio") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      });
      const styles = getComputedStyle(root);
      const brandSignals = [
        styles.getPropertyValue("--tt-brand").trim() || styles.getPropertyValue("--primary").trim(),
        styles.getPropertyValue("--tt-brand-strong").trim() || styles.getPropertyValue("--secondary").trim(),
        styles.getPropertyValue("--tt-accent").trim() || styles.getPropertyValue("--accent").trim(),
        styles.getPropertyValue("--tt-warning").trim() || styles.getPropertyValue("--warning").trim(),
      ].filter(Boolean);

      return {
        url: window.location.href,
        title: document.title,
        viewportWidth,
        viewportHeight,
        pageHeight: Math.max(root.scrollHeight, body?.scrollHeight || 0),
        bodyWidth: bodyRect?.width || 0,
        contentTextLength: contentText.length,
        contentInteractiveCount: contentInteractive.length,
        headingCount: visibleHeadings.length,
        headings: visibleHeadings,
        sections: visibleSections,
        buttons: visibleButtons,
        links,
        horizontalOverflow: overflow,
        viewportClippedCount: clipped.length,
        viewportClippedExamples: clipped.slice(0, 10).map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 120),
          text: text(element).slice(0, 100),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        })),
        hiddenOverflowContainerCount: hiddenOverflow.length,
        smallTouchTargetCount: smallTargets.length,
        brandSignalCount: brandSignals.length,
      };
    });

    const findings = [];
    if (evidence.horizontalOverflow > 2) findings.push({ severity: "error", code: "horizontal-overflow", message: `Content exceeds the ${viewport.name} viewport by ${Math.round(evidence.horizontalOverflow)}px.` });
    if (evidence.viewportClippedCount > 0) findings.push({ severity: "error", code: "viewport-clipping", message: `${evidence.viewportClippedCount} visible element(s) extend outside the viewport.` });
    if (evidence.hiddenOverflowContainerCount > 0) findings.push({ severity: "warning", code: "hidden-overflow", message: `${evidence.hiddenOverflowContainerCount} visible container(s) hide wider content.` });
    if (evidence.contentInteractiveCount > 18) findings.push({ severity: "warning", code: "interaction-density", message: `${evidence.contentInteractiveCount} content controls compete for attention.` });
    if (evidence.contentTextLength > 1400) findings.push({ severity: "warning", code: "text-density", message: `${evidence.contentTextLength} content characters may benefit from progressive disclosure.` });
    if (evidence.smallTouchTargetCount > 0) findings.push({ severity: "warning", code: "touch-targets", message: `${evidence.smallTouchTargetCount} actionable controls are below the 44px touch-target guideline.` });
    if (evidence.brandSignalCount < 3) findings.push({ severity: "warning", code: "brand-signal", message: "Limited rendered Tiny Titans brand-token evidence was detected." });
    if (!findings.length) findings.push({ severity: "info", code: "heuristics-clean", message: "No major heuristic layout problems detected; visual judgement should still use the screenshot." });

    return {
      route,
      viewport,
      responseStatus: response?.status() || null,
      evidence,
      findings,
      runtimeErrors,
      consoleErrors,
      screenshot: null,
      viewportScreenshot: null,
    };
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
  }
}

async function writeGallery(results) {
  const rows = results.map((result) => `
    <article>
      <h2>${escapeHtml(result.route)} · ${escapeHtml(result.viewport.name)}</h2>
      <p>${escapeHtml(result.evidence.title)} · ${result.evidence.viewportWidth}×${result.evidence.viewportHeight} · ${result.evidence.pageHeight}px page height</p>
      <div class="shots">
        <figure><figcaption>Viewport</figcaption><a href="${escapeHtml(path.basename(result.viewportScreenshot))}"><img loading="lazy" src="${escapeHtml(path.basename(result.viewportScreenshot))}" alt="${escapeHtml(result.route)} ${escapeHtml(result.viewport.name)} viewport screenshot"></a></figure>
        <figure><figcaption>Full page</figcaption><a href="${escapeHtml(path.basename(result.screenshot))}"><img loading="lazy" src="${escapeHtml(path.basename(result.screenshot))}" alt="${escapeHtml(result.route)} ${escapeHtml(result.viewport.name)} full page screenshot"></a></figure>
      </div>
    </article>`).join("\n");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tiny Titans Visual Capture</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.4;background:#111;color:#eee}article{margin:0 0 40px;padding:20px;border:1px solid #333;border-radius:14px;background:#191919}h1{margin-top:0}.shots{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:10px;background:#222}figcaption{margin:0 0 8px;font-weight:700}@media(max-width:800px){.shots{grid-template-columns:1fr}}</style></head><body><h1>Tiny Titans · Universal Visual Capture</h1><p>Rendered screenshots and DOM evidence generated by Playwright.</p>${rows}</body></html>`;
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");
}

async function main() {
  const routes = parseRoutes();
  let viewports = fallbackViewports;

  try {
    const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
    if (Array.isArray(contract.responsiveViewports) && contract.responsiveViewports.length) viewports = contract.responsiveViewports;
  } catch {
    // The fallback keeps the capture bot independently runnable.
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  try {
    await signIn(page);
    for (const route of routes) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const result = await collectEvidence(page, route, viewport);
        const routeName = safeRoute(route);
        const prefix = `${routeName}-${viewport.name}`;
        const viewportScreenshot = path.join(outputDir, `${prefix}-viewport.png`);
        const fullScreenshot = path.join(outputDir, `${prefix}-full.png`);

        await page.screenshot({ path: viewportScreenshot, fullPage: false });
        await page.screenshot({ path: fullScreenshot, fullPage: true });

        result.viewportScreenshot = viewportScreenshot.replaceAll(path.sep, "/");
        result.screenshot = fullScreenshot.replaceAll(path.sep, "/");
        results.push(result);

        const errorCount = result.runtimeErrors.length + result.consoleErrors.length;
        console.log(`${errorCount ? "🔴" : "🟢"} ${route.padEnd(32)} ${viewport.name.padEnd(8)} ${result.evidence.viewportWidth}×${result.evidence.viewportHeight} · ${result.evidence.pageHeight}px · ${errorCount} runtime/console errors`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const report = {
    bot: "Tiny Titans Universal Visual Capture BOT",
    generatedAt: new Date().toISOString(),
    baseURL,
    routes,
    viewports,
    screenshotCount: results.length * 2,
    results,
    reviewGuidance: {
      purpose: "Provide actual rendered evidence for layout, hierarchy, density, clipping, spacing, navigation and page relevance decisions.",
      viewportScreenshots: "Closest representation to what the keeper sees on-screen.",
      fullPageScreenshots: "Used to inspect vertical composition and lower-page content without scrolling.",
      heuristics: "Automated checks identify likely issues but do not replace screenshot review.",
    },
  };

  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeGallery(results);
  await fs.writeFile(path.join(outputDir, "README.md"), `# Tiny Titans Universal Visual Capture\n\nOpen \\`index.html\\` for the rendered screenshot gallery. \\`report.json\\` contains route, viewport, DOM and runtime evidence.\n`, "utf8");
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
