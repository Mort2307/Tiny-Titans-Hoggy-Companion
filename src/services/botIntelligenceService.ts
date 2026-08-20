import type { TesterCheck } from "./testerBotService";

type Severity = "info" | "low" | "medium" | "high" | "critical";
type FindingKind = "problem" | "opportunity" | "strength" | "evidence";

type IntelligenceFinding = {
  id: string;
  kind: FindingKind;
  severity: Severity;
  title: string;
  evidence: string;
  recommendation: string;
  confidence: number;
};

type Region = {
  element: Element;
  rect: DOMRect;
  text: string;
  interactive: number;
  headings: number;
  visible: boolean;
  role: string;
};

type PageProfile = {
  name: string;
  purpose: string;
  primaryIntent: string;
  expectedActions: string[];
  pattern: "dashboard" | "collection" | "timeline" | "lifecycle" | "field-guide" | "control-panel" | "workbench" | "detail";
};

const ROUTE_PROFILES: Array<[RegExp, PageProfile]> = [
  [/^\/shedding(?:\/|$)/, { name: "Shedding", purpose: "record and monitor shedding lifecycle events", primaryIntent: "record a shedding cycle", expectedActions: ["start", "record", "complete", "save"], pattern: "lifecycle" }],
  [/^\/feeding(?:\/|$)/, { name: "Feeding", purpose: "record feeding events and monitor feeding history", primaryIntent: "record a feeding", expectedActions: ["record", "save", "add"], pattern: "lifecycle" }],
  [/^\/weights?(?:\/|$)/, { name: "Weight", purpose: "record measurements and understand weight trends", primaryIntent: "record a weight", expectedActions: ["record", "save", "add"], pattern: "timeline" }],
  [/^\/behaviour(?:\/|$)/, { name: "Behaviour", purpose: "record behaviour observations and identify patterns", primaryIntent: "record an observation", expectedActions: ["record", "save", "add"], pattern: "lifecycle" }],
  [/^\/health(?:\/|$)/, { name: "Health", purpose: "record health observations, treatment and follow-up", primaryIntent: "record a health event", expectedActions: ["record", "save", "add", "follow-up"], pattern: "workbench" }],
  [/^\/snakes\/new/, { name: "Add Snake", purpose: "create a complete snake record", primaryIntent: "add a snake", expectedActions: ["save", "create", "continue"], pattern: "workbench" }],
  [/^\/snakes\/.+\/(weights|feeding|shedding|behaviour|health)/, { name: "Snake Tracker", purpose: "manage a specific snake's lifecycle record", primaryIntent: "record an event for this snake", expectedActions: ["record", "save", "add"], pattern: "lifecycle" }],
  [/^\/snakes\/.+\/(timeline|master-record)/, { name: "Snake Record", purpose: "understand a snake's complete history", primaryIntent: "review the snake record", expectedActions: ["view", "edit", "manage"], pattern: "timeline" }],
  [/^\/snakes\/[^/]+\/(edit)?$/, { name: "Snake Profile", purpose: "review and manage an individual snake", primaryIntent: "review or edit this snake", expectedActions: ["edit", "manage", "view"], pattern: "detail" }],
  [/^\/snakes$/, { name: "My Snakes", purpose: "find and manage the keeper's snakes", primaryIntent: "select or manage a snake", expectedActions: ["add", "view", "manage"], pattern: "collection" }],
  [/^\/morph-library/, { name: "Morph Library", purpose: "discover and understand morphs and genetics", primaryIntent: "find a morph", expectedActions: ["view", "search", "add", "submit"], pattern: "field-guide" }],
  [/^\/calculator/, { name: "Breeding Calculator", purpose: "model genetic outcomes from selected parents", primaryIntent: "calculate a pairing", expectedActions: ["select", "calculate", "view"], pattern: "workbench" }],
  [/^\/breeding/, { name: "Breeding", purpose: "plan and manage breeding projects", primaryIntent: "manage a breeding project", expectedActions: ["add", "manage", "view", "calculate"], pattern: "workbench" }],
  [/^\/learn|^\/adaptive-learning|^\/challenge|^\/knowledge-base/, { name: "Learning", purpose: "learn, practise and retain husbandry knowledge", primaryIntent: "continue learning", expectedActions: ["start", "continue", "view", "answer"], pattern: "field-guide" }],
  [/^\/community|^\/feedback|^\/report-bug/, { name: "Community", purpose: "communicate, contribute and report issues", primaryIntent: "submit or review community content", expectedActions: ["submit", "send", "report", "view"], pattern: "collection" }],
  [/^\/account/, { name: "Account", purpose: "manage account, preferences and privacy", primaryIntent: "manage account settings", expectedActions: ["save", "manage", "update"], pattern: "control-panel" }],
  [/^\/$/, { name: "Dashboard", purpose: "understand the keeper's current situation and next actions", primaryIntent: "see what needs attention next", expectedActions: ["view", "add", "record", "manage"], pattern: "dashboard" }],
];

function routeName(): string {
  return typeof window === "undefined" ? "unknown" : window.location.pathname || "/";
}

function profileForRoute(route = routeName()): PageProfile {
  return ROUTE_PROFILES.find(([pattern]) => pattern.test(route))?.[1] ?? {
    name: "Application Page",
    purpose: "complete the page's primary user task",
    primaryIntent: "complete the page's main action",
    expectedActions: ["save", "continue", "view", "manage"],
    pattern: "detail",
  };
}

function textOf(element: Element | Document): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isVisible(element: Element): boolean {
  const node = element as HTMLElement;
  if (!node || typeof window === "undefined") return false;
  const style = window.getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
}

function viewportRect(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

function isInFirstViewport(rect: DOMRect): boolean {
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function semanticRole(element: Element): string {
  return element.getAttribute("role") || element.tagName.toLowerCase();
}

function regionCandidates(): Region[] {
  const candidates = Array.from(document.querySelectorAll("main, section, article, form, [role='region'], [data-card], [class*='card'], [class*='tile'], [class*='panel']"));
  const seen = new Set<string>();
  return candidates.map((element, index) => {
    const rect = viewportRect(element);
    const interactive = element.querySelectorAll("button, a[href], input, select, textarea, [role='button']").length;
    const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6").length;
    const key = `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return { element, rect, text: textOf(element).slice(0, 260), interactive, headings, visible: isVisible(element), role: semanticRole(element) };
  }).filter((item): item is Region => Boolean(item) && item.visible && item.rect.width >= 100 && item.rect.height >= 40 && indexSafe(item!));
}

function indexSafe(region: Region): boolean {
  return Boolean(region.element);
}

function visibleInteractive(): Element[] {
  return Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='tab'], [role='checkbox'], [role='radio']")).filter(isVisible);
}

function labelFor(element: Element): string {
  const aria = element.getAttribute("aria-label") || "";
  const labelled = element.getAttribute("aria-labelledby");
  const labelledText = labelled ? labelled.split(/\s+/).map(id => document.getElementById(id)?.textContent || "").join(" ") : "";
  const title = element.getAttribute("title") || "";
  const text = textOf(element);
  const input = element as HTMLInputElement;
  const placeholder = input.placeholder || "";
  return [aria, labelledText, title, text, placeholder].join(" ").replace(/\s+/g, " ").trim();
}

function actionCandidates(profile: PageProfile): Array<{ element: Element; label: string; score: number }> {
  return visibleInteractive().map(element => {
    const label = labelFor(element).toLowerCase();
    const rect = viewportRect(element);
    const style = window.getComputedStyle(element as HTMLElement);
    let score = 0;
    if (profile.expectedActions.some(word => label.includes(word))) score += 5;
    if (/primary|cta|accent|hero|prominent/.test(String(element.className).toLowerCase())) score += 3;
    if (/button/.test(element.tagName.toLowerCase()) || element.getAttribute("role") === "button") score += 1;
    if (isInFirstViewport(rect)) score += 2;
    if (Number(style.fontSize.replace("px", "")) >= 16) score += 1;
    if (rect.width >= 140) score += 1;
    return { element, label, score };
  }).sort((a, b) => b.score - a.score);
}

function colourLuminance(value: string): number | null {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const channels = match[1].split(",").slice(0, 3).map(v => Number.parseFloat(v.trim()));
  if (channels.length !== 3 || channels.some(Number.isNaN)) return null;
  const rgb = channels.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = colourLuminance(foreground);
  const bg = colourLuminance(background);
  if (fg === null || bg === null) return null;
  const light = Math.max(fg, bg);
  const dark = Math.min(fg, bg);
  return (light + 0.05) / (dark + 0.05);
}

function inspectRenderedUi(): IntelligenceFinding[] {
  if (typeof document === "undefined" || typeof window === "undefined") return [];

  const findings: IntelligenceFinding[] = [];
  const route = routeName();
  const profile = profileForRoute(route);
  const viewport = `${window.innerWidth}×${window.innerHeight}`;
  const interactive = visibleInteractive();
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).filter(isVisible);
  const regions = regionCandidates();
  const firstViewportRegions = regions.filter(region => isInFirstViewport(region.rect));
  const firstViewportInteractive = interactive.filter(element => isInFirstViewport(viewportRect(element)));
  const errors = Array.from(document.querySelectorAll("[role='alert'], .error, .is-error, [data-state='error']")).filter(isVisible).map(textOf).filter(Boolean);
  const loading = Array.from(document.querySelectorAll("[aria-busy='true'], [data-loading='true']")).filter(isVisible);
  const emptyControls = interactive.filter(element => !labelFor(element));
  const touchIssues = interactive.filter(element => { const r = viewportRect(element); return r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40); });
  const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
  const verticalHeight = document.documentElement.scrollHeight;
  const actions = actionCandidates(profile);
  const topActions = actions.slice(0, 5);
  const strongActions = actions.filter(item => item.score >= 7);
  const visibleText = textOf(document.body);
  const wordCount = visibleText ? visibleText.split(/\s+/).length : 0;
  const firstViewportText = regions.filter(r => isInFirstViewport(r.rect)).map(r => r.text).join(" ");
  const firstViewportWords = firstViewportText ? firstViewportText.split(/\s+/).length : 0;
  const formControls = interactive.filter(el => /input|select|textarea/.test(el.tagName.toLowerCase()));
  const forms = Array.from(document.querySelectorAll("form")).filter(isVisible);

  if (errors.length) findings.push({ id: "visible-runtime-errors", kind: "problem", severity: "critical", title: "The rendered UI exposes an error state", evidence: errors.slice(0, 3).join(" | "), recommendation: "Resolve the visible error before treating this route as healthy. The Visual BOT will not downgrade a visible application error merely because the page rendered.", confidence: 99 });
  if (loading.length) findings.push({ id: "persistent-loading", kind: "problem", severity: "medium", title: "A loading state is still visible during analysis", evidence: `${loading.length} visible busy/loading element(s) remain on ${route}.`, recommendation: "Verify the loading state resolves. If this is intentionally persistent, expose progress or an explicit waiting state so the user is not left guessing.", confidence: 94 });
  if (horizontalOverflow) findings.push({ id: "horizontal-overflow", kind: "problem", severity: "high", title: "The rendered page exceeds the viewport horizontally", evidence: `Viewport ${viewport}; document scroll width is ${document.documentElement.scrollWidth}px.`, recommendation: "Identify the widest rendered element and fix its width, min-width, grid/flex constraint or breakpoint. Do not hide overflow as a cosmetic fix unless the overflowing content is intentionally scrollable.", confidence: 99 });
  if (emptyControls.length) findings.push({ id: "unlabelled-controls", kind: "problem", severity: "high", title: "Interactive controls lack a usable name", evidence: `${emptyControls.length} of ${interactive.length} visible interactive controls have no visible text, aria-label, labelled-by, title or placeholder.`, recommendation: "Give each control a meaningful accessible name and, where appropriate, visible explanatory text.", confidence: 99 });
  if (touchIssues.length) findings.push({ id: "small-touch-targets", kind: "problem", severity: "medium", title: "Some touch targets are smaller than the preferred interaction area", evidence: `${touchIssues.length} visible controls are below 40px in width or height.`, recommendation: "Increase the clickable area to roughly 44px or larger on touch layouts. Keep iconography small if needed, but enlarge the interaction box.", confidence: 96 });

  const h1s = headings.filter(h => h.tagName.toLowerCase() === "h1");
  if (h1s.length === 0) findings.push({ id: "missing-h1", kind: "problem", severity: "medium", title: "The page has no visible H1", evidence: `${headings.length} visible headings were found, but no visible H1 identifies the page.`, recommendation: `Give this ${profile.name.toLowerCase()} page a clear H1 that communicates its purpose without relying on navigation labels alone.`, confidence: 98 });
  if (h1s.length > 1) findings.push({ id: "multiple-h1", kind: "problem", severity: "low", title: "The page exposes multiple H1 headings", evidence: `${h1s.length} visible H1 elements were found.`, recommendation: "Use one dominant page heading and demote independent section headings to H2/H3 where appropriate.", confidence: 93 });

  const firstViewportActionRatio = firstViewportInteractive.length ? strongActions.filter(item => isInFirstViewport(viewportRect(item.element))).length / firstViewportInteractive.length : 0;
  if (interactive.length >= 10 && strongActions.length === 0) findings.push({ id: "no-dominant-action", kind: "problem", severity: "medium", title: "The page has no clearly dominant action", evidence: `${interactive.length} visible interactive controls were found, but none has enough contextual, semantic and visual evidence to be identified as a strong primary action.`, recommendation: `Make the action that fulfils “${profile.primaryIntent}” visually and semantically dominant. Avoid giving every button equal weight.`, confidence: 88 });
  if (strongActions.length >= 4) findings.push({ id: "competing-primary-actions", kind: "problem", severity: "medium", title: "Several actions compete for primary attention", evidence: `${strongActions.length} controls score strongly as primary actions; the first viewport contains ${firstViewportInteractive.length} interactive controls.`, recommendation: `Choose one dominant outcome for this ${profile.pattern} page. Demote secondary actions with quieter styling, placement or grouping.`, confidence: 86 });

  if (firstViewportRegions.length >= 7 && firstViewportWords >= 220) findings.push({ id: "busy-first-viewport", kind: "problem", severity: "medium", title: "The first viewport is visually information-dense", evidence: `${firstViewportRegions.length} significant regions and approximately ${firstViewportWords} words are visible before the first viewport ends.`, recommendation: "Reduce simultaneous competition in the opening viewport. Prioritise the page purpose, primary action and immediate status; move secondary history, education or management controls lower or behind progressive disclosure.", confidence: 84 });
  else if (firstViewportRegions.length >= 5 && firstViewportWords >= 150) findings.push({ id: "moderate-first-viewport-density", kind: "opportunity", severity: "low", title: "The first viewport is moderately busy", evidence: `${firstViewportRegions.length} significant regions and approximately ${firstViewportWords} words are visible in the opening viewport.`, recommendation: "Review whether every opening region helps the user complete the page's primary task. If not, reduce its visual weight rather than deleting useful information.", confidence: 78 });

  const oversizedRegions = firstViewportRegions.filter(region => region.rect.height > window.innerHeight * 0.62 && region.interactive >= 3);
  if (oversizedRegions.length) findings.push({ id: "oversized-interactive-region", kind: "opportunity", severity: "low", title: "A large first-viewport region contains several actions", evidence: `${oversizedRegions.length} opening region(s) occupy more than 62% of viewport height while containing 3+ interactive controls.`, recommendation: "Check whether the workflow can be broken into clear stages, or whether secondary controls can be moved below the primary task.", confidence: 80 });

  if (profile.pattern === "lifecycle" && forms.length === 0 && formControls.length === 0) findings.push({ id: "lifecycle-no-form", kind: "problem", severity: "high", title: "A lifecycle page exposes no obvious recording input", evidence: `${profile.name} is classified as a lifecycle workflow, but no visible form controls were detected.`, recommendation: `The page should expose a clear path to ${profile.primaryIntent}. If the workflow is intentionally state-driven, expose an obvious state control or action with semantic labelling.`, confidence: 92 });
  if (profile.pattern === "collection" && interactive.length < 2) findings.push({ id: "collection-low-interaction", kind: "opportunity", severity: "medium", title: "The collection page exposes very little management interaction", evidence: `${profile.name} is classified as a collection, but only ${interactive.length} visible interactive control(s) were detected.`, recommendation: "Ensure users can discover the primary collection action, open an item, and manage or filter the collection where those capabilities exist.", confidence: 78 });

  const labels = interactive.map(labelFor).filter(Boolean);
  const duplicateLabels = labels.filter((label, index) => labels.indexOf(label) !== index && label.length > 2);
  if (duplicateLabels.length >= 4) findings.push({ id: "repeated-action-labels", kind: "opportunity", severity: "low", title: "Repeated action labels may create ambiguity", evidence: `Repeated visible control labels include “${Array.from(new Set(duplicateLabels)).slice(0, 4).join("”, “")}` + "”.", recommendation: "Keep repeated actions when they are scoped to distinct records, but ensure their surrounding context identifies what each action affects.", confidence: 82 });

  const emptyStateText = /no (?:snakes?|records?|data|results|entries)|nothing (?:here|to show)|get started|not recorded/i.test(visibleText);
  if (emptyStateText && actions.length === 0) findings.push({ id: "dead-end-empty-state", kind: "problem", severity: "high", title: "An empty-state signal appears without a clear next action", evidence: "The rendered page contains empty-state language, but no visible action could be identified as a way forward.", recommendation: `Turn the empty state into a guided next step: tell the user what is missing, why it matters, and provide the most direct action to ${profile.primaryIntent}.`, confidence: 91 });
  if (emptyStateText && actions.length > 0) findings.push({ id: "guided-empty-state", kind: "strength", severity: "info", title: "The page exposes an empty-state and a possible next action", evidence: `Empty-state language is present and ${actions.length} actionable control(s) are visible.`, recommendation: "Keep the empty state concise and make sure the highest-scoring action directly resolves the missing state rather than sending the user elsewhere unnecessarily.", confidence: 80 });

  const textContrastRisks: string[] = [];
  Array.from(document.querySelectorAll("p, span, label, button, a, h1, h2, h3")).filter(isVisible).slice(0, 250).forEach(element => {
    const style = window.getComputedStyle(element as HTMLElement);
    const ratio = contrastRatio(style.color, style.backgroundColor);
    if (ratio !== null && ratio < 3 && labelFor(element).length > 3) textContrastRisks.push(`${labelFor(element).slice(0, 40)} (${ratio.toFixed(1)}:1)`);
  });
  if (textContrastRisks.length) findings.push({ id: "contrast-risk", kind: "problem", severity: "medium", title: "Some rendered text has a potentially weak colour contrast", evidence: `${textContrastRisks.length} sampled visible text elements fell below a 3:1 contrast ratio against their immediate computed background. Examples: ${textContrastRisks.slice(0, 3).join(", ")}.`, recommendation: "Verify the affected text against the actual layered background. Increase contrast where text is meaningful or interactive; do not rely on colour alone to communicate state.", confidence: 72 });

  const styleSamples = Array.from(document.querySelectorAll("button, a[href], input, select, textarea")).filter(isVisible).slice(0, 80).map(el => window.getComputedStyle(el as HTMLElement));
  const buttonHeights = styleSamples.map(style => Number.parseFloat(style.minHeight || style.height || "0")).filter(n => Number.isFinite(n) && n > 0);
  if (buttonHeights.length >= 6) {
    const min = Math.min(...buttonHeights);
    const max = Math.max(...buttonHeights);
    if (max - min > 28) findings.push({ id: "control-scale-inconsistency", kind: "opportunity", severity: "low", title: "Interactive control sizing is noticeably inconsistent", evidence: `Sampled control heights range from ${Math.round(min)}px to ${Math.round(max)}px.`, recommendation: "Check whether the variation is intentional. Establish a small set of control sizes so primary, secondary and compact actions have predictable visual grammar.", confidence: 75 });
  }

  if (verticalHeight > window.innerHeight * 6 && profile.pattern !== "timeline" && profile.pattern !== "field-guide") findings.push({ id: "excessive-page-length", kind: "opportunity", severity: "low", title: "This page is unusually long for its detected purpose", evidence: `Rendered document height is ${verticalHeight}px (${(verticalHeight / window.innerHeight).toFixed(1)} viewport heights).`, recommendation: "Consider progressive disclosure, anchored sections, tabs or separate purpose-led pages. Do not shorten a genuinely useful timeline or reference page merely to reduce scroll length.", confidence: 77 });

  const cssGrid = Array.from(document.querySelectorAll("main section, main article, main > div, [class*='grid']")).filter(isVisible).slice(0, 80);
  const narrowCards = cssGrid.filter(el => { const r = viewportRect(el); return r.width >= 240 && r.width < 380 && r.height >= 100; });
  if (narrowCards.length >= 4 && window.innerWidth >= 900) findings.push({ id: "dense-card-grid", kind: "opportunity", severity: "low", title: "The desktop composition may be over-cardified", evidence: `${narrowCards.length} medium-width content blocks were detected in the visible layout.`, recommendation: "Check whether related information can be composed into fewer meaningful regions. Avoid turning every piece of information into a separate tile when a strong narrative or workflow grouping would be clearer.", confidence: 74 });

  if (firstViewportInteractive.length > 0 && strongActions.some(item => isInFirstViewport(viewportRect(item.element)))) findings.push({ id: "primary-action-visible", kind: "strength", severity: "info", title: "A plausible primary action is visible in the opening viewport", evidence: `The strongest action candidate is “${topActions[0]?.label.slice(0, 80)}” and it is visible without scrolling.`, recommendation: "Preserve this placement unless task evidence shows users are looking for a different outcome first.", confidence: 86 });
  if (headings.length >= 2 && firstViewportRegions.length >= 2) findings.push({ id: "structured-hierarchy", kind: "strength", severity: "info", title: "The page has a detectable content hierarchy", evidence: `${headings.length} visible headings and ${regions.length} significant layout regions provide multiple structural signals.`, recommendation: "Continue using headings and meaningful region grouping to make dense information scannable.", confidence: 83 });

  if (!findings.length) findings.push({ id: "no-actionable-findings", kind: "evidence", severity: "info", title: "No actionable visual risks were detected", evidence: `The ${profile.name} page was analysed at ${viewport} using rendered geometry, hierarchy, interaction density, semantic labels, page-purpose heuristics, responsive overflow, empty-state and contrast signals.`, recommendation: "No immediate visual change is justified by the available rendered evidence. This is not a claim that every possible viewport or workflow is perfect.", confidence: 70 });

  return findings;
}

function findingsToMessage(findings: IntelligenceFinding[], scope: string): string {
  const grouped = findings.map(finding => {
    const prefix = finding.kind === "strength" ? "STRENGTH" : finding.kind === "opportunity" ? "OPPORTUNITY" : finding.kind === "evidence" ? "EVIDENCE" : finding.severity.toUpperCase();
    return `${prefix} · ${finding.title} — ${finding.evidence} Recommendation: ${finding.recommendation} Confidence: ${finding.confidence}%.`;
  });
  return `${scope}\n${grouped.join("\n")}`;
}

function summary(findings: IntelligenceFinding[], profile: PageProfile): string {
  const problems = findings.filter(f => f.kind === "problem");
  const opportunities = findings.filter(f => f.kind === "opportunity");
  const strengths = findings.filter(f => f.kind === "strength");
  const high = problems.filter(f => f.severity === "critical" || f.severity === "high").length;
  const score = Math.max(0, Math.min(100, 100 - high * 22 - problems.filter(f => f.severity === "medium").length * 10 - opportunities.length * 3));
  return `PAGE INTELLIGENCE · ${profile.name}\nPurpose: ${profile.purpose}.\nPrimary intent: ${profile.primaryIntent}.\nVisual intelligence score: ${score}/100.\nProblems: ${problems.length}; opportunities: ${opportunities.length}; strengths: ${strengths.length}.\n${high ? `Priority: ${high} high/critical issue(s) should be reviewed before release.` : "Priority: no high/critical visual issues detected in the current rendered context."}`;
}

export function createVisualIntelligenceChecks(): TesterCheck[] {
  return [
    {
      checkId: "visual-live-dom-intelligence",
      name: "Deep rendered UI intelligence audit",
      category: "visual",
      severity: "high",
      run: async () => {
        if (typeof document === "undefined" || typeof window === "undefined") return { status: "blocked", message: "No rendered browser context is available." };
        const profile = profileForRoute();
        const findings = inspectRenderedUi();
        const critical = findings.some(f => f.kind === "problem" && f.severity === "critical");
        const high = findings.some(f => f.kind === "problem" && f.severity === "high");
        return { status: critical || high ? "fail" : "pass", message: `${summary(findings, profile)}\n${findingsToMessage(findings, `Rendered evidence for ${routeName()}`)}` };
      },
    },
    {
      checkId: "visual-page-purpose-signals",
      name: "Contextual page-purpose and action reasoning",
      category: "visual",
      severity: "medium",
      run: async () => {
        if (typeof document === "undefined") return { status: "blocked", message: "No rendered browser context is available." };
        const profile = profileForRoute();
        const actions = actionCandidates(profile);
        const primary = actions[0];
        const expected = profile.expectedActions.filter(word => textOf(document.body).toLowerCase().includes(word));
        return {
          status: primary || expected.length ? "pass" : "blocked",
          message: `PAGE PURPOSE · ${profile.name}\nDetected composition: ${profile.pattern}.\nPurpose model: ${profile.purpose}.\nPrimary intent: ${profile.primaryIntent}.\nExpected action vocabulary: ${profile.expectedActions.join(", ")}.\nObserved action vocabulary: ${expected.length ? expected.join(", ") : "none"}.\nBest rendered action candidate: ${primary ? `“${primary.label.slice(0, 100)}” (context score ${primary.score})` : "none confidently identified"}.\nThe bot is reasoning from the actual rendered interface and route context; it does not treat a generic “looks fine” signal as proof of good UX.`,
        };
      },
    },
    {
      checkId: "visual-recommendation-engine",
      name: "Contextual visual recommendation engine",
      category: "visual",
      severity: "high",
      run: async () => {
        if (typeof document === "undefined" || typeof window === "undefined") return { status: "blocked", message: "No rendered browser context is available." };
        const findings = inspectRenderedUi();
        const recommendations = findings.filter(f => f.kind === "problem" || f.kind === "opportunity");
        if (!recommendations.length) return { status: "pass", message: "No change recommendation is justified by the current rendered evidence. The auditor intentionally avoids inventing improvements when evidence is insufficient." };
        return { status: recommendations.some(f => f.severity === "critical" || f.severity === "high") ? "fail" : "pass", message: recommendations.map((f, i) => `${i + 1}. ${f.title}\nWHY: ${f.evidence}\nCHANGE: ${f.recommendation}\nCONFIDENCE: ${f.confidence}%`).join("\n\n") };
      },
    },
    {
      checkId: "visual-no-fake-pass-policy",
      name: "Visual evidence integrity policy",
      category: "visual",
      severity: "critical",
      run: async () => ({ status: "pass", message: "Visual BOT evidence policy is active: live DOM analysis, screenshot evidence and browser workflow execution remain separate evidence classes. The bot will not claim screenshot capture, unseen viewport quality or successful interaction that it did not actually observe." }),
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
        if (typeof document === "undefined") return { status: "blocked", message: "No rendered browser context is available." };
        const profile = profileForRoute();
        const findings = inspectRenderedUi();
        const critical = findings.filter(f => f.kind === "problem" && f.severity === "critical");
        const high = findings.filter(f => f.kind === "problem" && f.severity === "high");
        const medium = findings.filter(f => f.kind === "problem" && f.severity === "medium");
        if (critical.length) return { status: "fail", message: `OVERLORD VERDICT · ${profile.name}: critical rendered risk detected.\n${summary(findings, profile)}\n${findingsToMessage(critical, "Critical evidence")}` };
        if (high.length) return { status: "fail", message: `OVERLORD VERDICT · ${profile.name}: ${high.length} high-priority rendered finding(s), ${medium.length} medium finding(s).\n${summary(findings, profile)}\n${findingsToMessage([...high, ...medium], "Priority evidence")}` };
        return { status: "pass", message: `OVERLORD VERDICT · ${profile.name}: no high/critical rendered risk detected.\n${summary(findings, profile)}\n${findingsToMessage(findings, "Supporting evidence")}` };
      },
    },
    {
      checkId: "overlord-no-fake-pass-policy",
      name: "Overlord evidence integrity policy",
      category: "application",
      severity: "critical",
      run: async () => ({ status: "pass", message: "Overlord evidence policy is active: existence is not treated as execution; blocked or untested browser behaviour cannot be reported as passed; visual recommendations must cite observable rendered evidence." }),
    },
  ];
}
