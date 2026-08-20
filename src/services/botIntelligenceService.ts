import type { TesterCheck } from "./testerBotService";

type IntelligenceFinding = {
  id: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  evidence: string;
  recommendation: string;
};

function routeName(): string {
  if (typeof window === "undefined") return "unknown";
  return window.location.pathname || "/";
}

function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function hasMeaningfulLabel(element: Element): boolean {
  const aria = element.getAttribute("aria-label")?.trim();
  const labelledBy = element.getAttribute("aria-labelledby")?.trim();
  const title = element.getAttribute("title")?.trim();
  const text = textOf(element);
  return Boolean(aria || labelledBy || title || text);
}

function inspectRenderedUi(): IntelligenceFinding[] {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return [{
      id: "browser-context-unavailable",
      severity: "blocked",
      title: "Rendered browser context unavailable",
      evidence: "The in-app intelligence engine requires a live browser DOM.",
      recommendation: "Run this check from the rendered Tiny Titans application.",
    } as IntelligenceFinding];
  }

  const findings: IntelligenceFinding[] = [];
  const route = routeName();
  const viewport = `${window.innerWidth}×${window.innerHeight}`;
  const interactive = Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role='button']"));
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const emptyInteractive = interactive.filter((element) => !hasMeaningfulLabel(element));
  const tinyTargets = interactive.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40);
  });
  const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
  const visibleErrors = Array.from(document.querySelectorAll("[role='alert'], .error, .is-error, [data-state='error']"))
    .map(textOf).filter(Boolean);
  const loadingSignals = Array.from(document.querySelectorAll("[aria-busy='true'], [data-loading='true']"));
  const primaryCandidates = interactive.filter((element) => {
    const label = textOf(element).toLowerCase();
    const cls = element.className instanceof SVGAnimatedString ? "" : String(element.className ?? "").toLowerCase();
    return /primary|cta|record|save|add|submit|continue|start/.test(`${label} ${cls}`);
  });

  if (horizontalOverflow) {
    findings.push({
      id: "horizontal-overflow",
      severity: "high",
      title: "Rendered page exceeds the viewport",
      evidence: `${route} is ${viewport}, but the document scroll width is ${document.documentElement.scrollWidth}px.`,
      recommendation: "Find the overflowing element and correct its width, flex/grid constraints or responsive breakpoint before release.",
    });
  }

  if (emptyInteractive.length) {
    findings.push({
      id: "unlabelled-interactive-controls",
      severity: "high",
      title: "Interactive controls lack an accessible/visible label",
      evidence: `${emptyInteractive.length} of ${interactive.length} interactive elements have no text, aria-label, labelled-by or title.`,
      recommendation: "Give every interactive control a meaningful visible label or accessible name.",
    });
  }

  if (tinyTargets.length) {
    findings.push({
      id: "small-touch-targets",
      severity: "medium",
      title: "Some interactive targets are unusually small",
      evidence: `${tinyTargets.length} rendered controls are below 40px in width or height.`,
      recommendation: "Increase hit area or provide an adjacent larger interaction target, especially on touch layouts.",
    });
  }

  if (!headings.length || !headings.some((element) => /^h1$/i.test(element.tagName))) {
    findings.push({
      id: "missing-page-heading",
      severity: "medium",
      title: "Page hierarchy is missing a clear H1",
      evidence: `${route} exposes ${headings.length} heading elements but no H1.`,
      recommendation: "Give the page a single clear H1 describing its purpose; use lower levels for supporting hierarchy.",
    });
  }

  if (visibleErrors.length) {
    findings.push({
      id: "visible-runtime-errors",
      severity: "critical",
      title: "The rendered UI is exposing an error state",
      evidence: visibleErrors.slice(0, 3).join(" | "),
      recommendation: "Resolve the visible error before treating the current route as healthy.",
    });
  }

  if (loadingSignals.length) {
    findings.push({
      id: "persistent-loading-signal",
      severity: "low",
      title: "A loading state is active during the audit",
      evidence: `${loadingSignals.length} loading/busy signal(s) are currently active.`,
      recommendation: "Confirm the loading state resolves and does not leave the page apparently stuck.",
    });
  }

  if (interactive.length >= 12 && primaryCandidates.length === 0) {
    findings.push({
      id: "weak-action-hierarchy",
      severity: "medium",
      title: "Action hierarchy is unclear",
      evidence: `${interactive.length} interactive elements are present but no obvious primary action was detected from labels or semantic styling.`,
      recommendation: "Identify the page's primary user outcome and give its action stronger semantic and visual priority.",
    });
  }

  return findings;
}

function findingsToMessage(findings: IntelligenceFinding[], scope: string): string {
  if (!findings.length) return `${scope}: no actionable findings detected in the current rendered context. This is evidence from the live UI, not a claim that every possible workflow has been tested.`;
  return findings.map((finding) => `${finding.severity.toUpperCase()} · ${finding.title} — ${finding.evidence} Recommendation: ${finding.recommendation}`).join("\n");
}

export function createVisualIntelligenceChecks(): TesterCheck[] {
  return [
    {
      checkId: "visual-live-dom-intelligence",
      name: "Live rendered UI intelligence audit",
      category: "visual",
      severity: "high",
      run: async () => {
        const findings = inspectRenderedUi();
        const critical = findings.some((finding) => finding.severity === "critical");
        const high = findings.some((finding) => finding.severity === "high");
        return {
          status: critical ? "fail" : high ? "fail" : "pass",
          message: findingsToMessage(findings, `Visual intelligence audit for ${routeName()}`),
        };
      },
    },
    {
      checkId: "visual-page-purpose-signals",
      name: "Page purpose and action hierarchy analysis",
      category: "visual",
      severity: "medium",
      run: async () => {
        if (typeof document === "undefined") return { status: "blocked", message: "No rendered browser context is available." };
        const text = textOf(document.body).toLowerCase();
        const route = routeName();
        const actionWords = ["add", "record", "save", "submit", "continue", "create", "view", "manage", "track"];
        const detected = actionWords.filter((word) => text.includes(word));
        return {
          status: detected.length ? "pass" : "blocked",
          message: detected.length
            ? `${route} exposes purpose/action signals in the rendered interface: ${detected.slice(0, 8).join(", ")}. The bot uses these signals as contextual evidence rather than assuming a generic page template.`
            : `${route} does not expose enough action language for reliable purpose inference. The bot will not invent a purpose; add clear user-facing action language or a page-purpose semantic marker.`,
        };
      },
    },
  ];
}

export function createOverlordIntelligenceChecks(): TesterCheck[] {
  return [
    {
      checkId: "overlord-live-application-intelligence",
      name: "Overlord live application intelligence synthesis",
      category: "application",
      severity: "critical",
      run: async () => {
        const findings = inspectRenderedUi();
        const route = routeName();
        const critical = findings.filter((finding) => finding.severity === "critical");
        const high = findings.filter((finding) => finding.severity === "high");
        const medium = findings.filter((finding) => finding.severity === "medium");
        if (critical.length) {
          return { status: "fail", message: `OVERLORD VERDICT · ${route}: ${critical.length} critical rendered risk(s). ${findingsToMessage(critical, "Critical evidence")}` };
        }
        if (high.length) {
          return { status: "fail", message: `OVERLORD VERDICT · ${route}: ${high.length} high-priority finding(s), ${medium.length} medium finding(s). ${findingsToMessage([...high, ...medium], "System evidence")}` };
        }
        return {
          status: "pass",
          message: `OVERLORD VERDICT · ${route}: live rendered application context is coherent with no high/critical findings detected. ${findingsToMessage(findings, "Supporting evidence")}`,
        };
      },
    },
    {
      checkId: "overlord-no-fake-pass-policy",
      name: "Overlord evidence integrity policy",
      category: "application",
      severity: "critical",
      run: async () => ({
        status: "pass",
        message: "Overlord evidence policy is active: existence is not treated as execution; blocked or untested browser behaviour cannot be reported as passed; recommendations must cite observable evidence.",
      }),
    },
  ];
}
