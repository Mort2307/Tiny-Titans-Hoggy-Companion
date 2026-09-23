import type { TesterCheck } from "./testerBotService";

type JourneyOutcome = "PASS" | "NO_OP" | "LOOP" | "WRONG_DESTINATION" | "RUNTIME_ERROR";
type Candidate = { element: Element; label: string; href: string | null };

const DESTRUCTIVE = /^(delete|remove|sign out|logout|submit|save|add\b|create\b|confirm|accept|deny|allow|send|publish|upload|buy|pay|checkout|remove|reset|clear)/i;
const EXTERNAL = /^(https?:|mailto:|tel:|javascript:|#)/i;

function textOf(element: Element): string {
  return (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function labelOf(element: Element): string {
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    textOf(element) ||
    element.getAttribute("data-testid") ||
    "Unlabelled control"
  ).replace(/\s+/g, " ").trim().slice(0, 140);
}

function signature(doc: Document): string {
  const main = doc.querySelector("main, [role='main']");
  return (main?.textContent || doc.body?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 1800);
}

function currentPath(win: Window): string {
  return `${win.location.pathname}${win.location.search}${win.location.hash}`;
}

function isSafeCandidate(element: Element): boolean {
  if (element.nodeType !== 1) return false;
  if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") return false;
  const label = labelOf(element);
  if (DESTRUCTIVE.test(label)) return false;
  const tag = element.tagName.toLowerCase();
  if (tag === "a") {
    const href = element.getAttribute("href") || "";
    if (!href || EXTERNAL.test(href)) return false;
    try {
      const url = new URL(href, element.ownerDocument.location.href);
      return url.origin === element.ownerDocument.location.origin;
    } catch {
      return false;
    }
  }
  return tag === "button" || element.getAttribute("role") === "button" || element.getAttribute("role") === "tab" || element.getAttribute("role") === "checkbox" || element.getAttribute("role") === "radio";
}

function candidates(doc: Document): Candidate[] {
  return Array.from(doc.querySelectorAll("a[href], button, [role='button'], [role='tab'], [role='checkbox'], [role='radio']"))
    .filter(isSafeCandidate)
    .map((element) => ({
      element,
      label: labelOf(element),
      href: element.tagName.toLowerCase() === "a" ? element.getAttribute("href") : null,
    }))
    .slice(0, 18);
}

function createFrame(): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.title = "Tiny Titans private browser journey runner";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    width: "1440px",
    height: "1000px",
    left: "-10000px",
    top: "0",
    opacity: "0",
    pointerEvents: "none",
    border: "0",
    zIndex: "-1",
  });
  document.body.appendChild(frame);
  return frame;
}

function waitForLoad(frame: HTMLIFrameElement, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Browser journey frame timed out while loading the target route."));
    }, timeoutMs);
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    frame.addEventListener("load", done, { once: true });
    if (frame.contentDocument?.readyState === "complete") window.setTimeout(done, 50);
  });
}

async function waitStable(frame: HTMLIFrameElement): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  const doc = frame.contentDocument;
  if (!doc) return;
  await new Promise<void>((resolve) => {
    const started = Date.now();
    const check = () => {
      const state = doc.readyState;
      if (state === "complete" || Date.now() - started > 3000) resolve();
      else window.setTimeout(check, 100);
    };
    check();
  });
}

async function waitForRenderedApplication(frame: HTMLIFrameElement, timeoutMs = 3500): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;
    const path = currentPath(win);
    if (/\/login\/?$/i.test(path)) return;
    const rootText = (doc.querySelector("#root")?.textContent || "").replace(/\s+/g, " ").trim();
    const hasControls = candidates(doc).length > 0;
    const stillHydrating = /checking (tester )?authorization|checking authentication|loading tiny titans|initialising|initializing/i.test(rootText);
    if (hasControls || (rootText.length > 180 && !stillHydrating)) return;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
}

function sameOriginPath(href: string | null, baseUrl: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, baseUrl);
    return url.origin === new URL(baseUrl).origin ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

async function runTarget(path: string): Promise<string> {
  if (path.includes(":") || path.includes("*")) {
    return `BLOCKED: dynamic target ${path} requires a runtime entity fixture; no fake ID was invented.`;
  }

  const frame = createFrame();
  const seenStates = new Set<string>();
  const outcomes: Array<{ label: string; outcome: JourneyOutcome; reason: string; destination: string }> = [];
  const runtimeErrors: string[] = [];
  const startedAtPath = path;

  try {
    frame.addEventListener("error", () => runtimeErrors.push("iframe load error"));
    frame.src = new URL(path, window.location.origin).toString();
    await waitForLoad(frame);
    await waitStable(frame);
    await waitForRenderedApplication(frame);

    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) throw new Error("Unable to access the same-origin browser journey frame.");
    if (/\/login\/?$/i.test(currentPath(win))) {
      return "BLOCKED: the current authenticated Creator session was not available inside the same-origin test frame.";
    }

    const targetCandidates = candidates(doc);
    if (targetCandidates.length === 0) {
      return `BLOCKED: no safe actionable controls were found on ${startedAtPath}; browser interaction evidence was not established.`;
    }

    for (const candidate of targetCandidates) {
      const beforePath = currentPath(win);
      const beforeSignature = signature(doc);
      const expectedPath = sameOriginPath(candidate.href, win.location.href);
      const beforeState = `${beforePath}|${beforeSignature}`;
      seenStates.add(beforeState);
      let clickError = "";

      try {
        (candidate.element as HTMLElement).click();
        await waitStable(frame);
      } catch (error) {
        clickError = error instanceof Error ? error.message : String(error);
      }

      const afterPath = currentPath(win);
      const afterSignature = signature(doc);
      const afterState = `${afterPath}|${afterSignature}`;
      let outcome: JourneyOutcome;
      let reason: string;

      if (clickError || runtimeErrors.length) {
        outcome = "RUNTIME_ERROR";
        reason = clickError || runtimeErrors[0] || "Runtime error observed while exercising the control.";
      } else if (expectedPath && afterPath !== expectedPath) {
        outcome = seenStates.has(afterState) || afterPath === beforePath ? "LOOP" : "WRONG_DESTINATION";
        reason = outcome === "LOOP" ? `Expected ${expectedPath}, but the control returned to an earlier state.` : `Expected ${expectedPath}, reached ${afterPath}.`;
      } else if (!expectedPath && afterState === beforeState) {
        outcome = "NO_OP";
        reason = "Click produced no observable route or page-state change.";
      } else {
        outcome = "PASS";
        reason = expectedPath ? `Reached declared destination ${afterPath}.` : "Produced a measurable in-page state change.";
      }

      outcomes.push({ label: candidate.label, outcome, reason, destination: afterPath });
      seenStates.add(afterState);
      frame.src = new URL(startedAtPath, window.location.origin).toString();
      await waitForLoad(frame);
      await waitStable(frame);
      await waitForRenderedApplication(frame);
    }

    const summary = {
      route: startedAtPath,
      controlsExercised: outcomes.length,
      pass: outcomes.filter((item) => item.outcome === "PASS").length,
      noOp: outcomes.filter((item) => item.outcome === "NO_OP").length,
      loops: outcomes.filter((item) => item.outcome === "LOOP").length,
      wrongDestination: outcomes.filter((item) => item.outcome === "WRONG_DESTINATION").length,
      runtimeErrors: outcomes.filter((item) => item.outcome === "RUNTIME_ERROR").length,
      details: outcomes.slice(0, 18),
    };

    // A browser journey is evidence of interaction, not merely evidence that a route rendered.
    // Never allow an empty interaction set to become a false PASS.
    if (summary.controlsExercised < 1) {
      return `BLOCKED: no safe controls were exercised on ${startedAtPath}; browser interaction evidence was not established.\n${JSON.stringify(summary, null, 2)}`;
    }

    const hasCriticalFinding = summary.noOp > 0 || summary.loops > 0 || summary.wrongDestination > 0 || summary.runtimeErrors > 0;
    return `${hasCriticalFinding ? "FAIL" : "PASS"}: REAL BROWSER JOURNEY\n${JSON.stringify(summary, null, 2)}`;
  } finally {
    frame.remove();
  }
}

export function createBrowserJourneyCheck(path: string, label: string): TesterCheck {
  return {
    checkId: `browser-journey-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "root"}`,
    name: `Real browser journey · ${label}`,
    category: "application",
    severity: "critical",
    run: async () => {
      if (typeof window === "undefined" || typeof document === "undefined") return { status: "blocked", message: "No live browser context is available." };
      try {
        const message = await runTarget(path);
        if (message.startsWith("BLOCKED:")) return { status: "blocked", message };
        return message.startsWith("PASS:") ? { status: "pass", message } : { status: "fail", message };
      } catch (error) {
        return { status: "fail", message: error instanceof Error ? error.message : "Real browser journey failed unexpectedly." };
      }
    },
  };
}
