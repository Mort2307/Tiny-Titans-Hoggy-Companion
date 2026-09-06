export interface TitanDomainEvent {
  id: string;
  domain: "weight" | "feeding" | "shed" | "behaviour" | "health" | "microclimate" | "journal" | "genetics" | "breeding" | "hatchling" | "learning";
  timestamp: number;
  label: string;
  source?: string;
  detail?: string;
}

export interface TitanCrossDomainSignal {
  id: string;
  title: string;
  summary: string;
  evidenceIds: string[];
  domains: string[];
  confidence: number;
  severity: "info" | "notice" | "watch";
  causalClaim: "none";
}

export interface TitanExplanation {
  signalId: string;
  why: string;
  evidence: string[];
  limitations: string[];
}

const DAY = 86400000;

type ConsequenceRule = {
  id: string;
  a: TitanDomainEvent["domain"];
  b: TitanDomainEvent["domain"];
  days: number;
  title: string;
  summary: string;
  severity: TitanCrossDomainSignal["severity"];
  confidence: number;
};

const CONSEQUENCE_RULES: readonly ConsequenceRule[] = [
  { id: "feeding-weight", a: "feeding", b: "weight", days: 14, title: "Feeding and weight records are temporally linked", summary: "A feeding record and a weight record occurred within 14 days. Tiny Titans can use both as context when reviewing routine and growth history.", severity: "notice", confidence: 0.82 },
  { id: "shed-microclimate", a: "shed", b: "microclimate", days: 5, title: "A shed event and environmental readings overlap", summary: "A shed record and microclimate readings occurred within 5 days. Review the actual observations together; this does not establish a cause.", severity: "notice", confidence: 0.84 },
  { id: "behaviour-feeding", a: "behaviour", b: "feeding", days: 7, title: "Behaviour and feeding activity overlap", summary: "Behaviour observations and feeding records occurred within 7 days. The pairing can provide useful keeper context without assuming why the behaviour occurred.", severity: "notice", confidence: 0.81 },
  { id: "microclimate-behaviour", a: "microclimate", b: "behaviour", days: 3, title: "Behaviour and environmental observations overlap", summary: "Behaviour and microclimate records occurred within 3 days. Review the recorded conditions alongside the behaviour notes.", severity: "watch", confidence: 0.86 },
  { id: "genetics-breeding", a: "genetics", b: "breeding", days: 30, title: "Genetics and breeding activity are temporally linked", summary: "Genetic records and breeding-project activity occurred within 30 days. Tiny Titans can connect the records while preserving genetic uncertainty.", severity: "notice", confidence: 0.88 },
  { id: "breeding-hatchling", a: "breeding", b: "hatchling", days: 45, title: "Breeding and hatchling records are temporally linked", summary: "Breeding activity and hatchling records occurred within 45 days. Review parentage, project events and hatchling records together.", severity: "notice", confidence: 0.9 },
  { id: "learning-activity", a: "learning", b: "learning", days: 30, title: "Learning activity is building a recent knowledge trail", summary: "Multiple learning records occurred within 30 days. Tiny Titans can use this recency when choosing the next learning topic.", severity: "info", confidence: 0.8 },
] as const;

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
function inWindow(a: TitanDomainEvent, b: TitanDomainEvent, days: number): boolean { return Math.abs(a.timestamp - b.timestamp) <= days * DAY; }
function distinctDomains(events: TitanDomainEvent[]): string[] { return [...new Set(events.map((event) => event.domain))]; }
function pairKey(rule: ConsequenceRule, first: TitanDomainEvent, second: TitanDomainEvent): string { return `${rule.id}:${Math.min(first.timestamp, second.timestamp)}:${Math.max(first.timestamp, second.timestamp)}`; }

/**
 * Detects bounded temporal structure across explicit keeper records. The engine
 * surfaces context windows, not causality, diagnoses, or species-default rules.
 */
export function detectCrossDomainSignals(events: readonly TitanDomainEvent[]): TitanCrossDomainSignal[] {
  const usable = events.filter((event) => Number.isFinite(event.timestamp) && event.timestamp > 0).sort((a, b) => a.timestamp - b.timestamp);
  const signals: TitanCrossDomainSignal[] = [];

  for (const rule of CONSEQUENCE_RULES) {
    if (rule.a === rule.b) {
      const matching = usable.filter((event) => event.domain === rule.a);
      if (matching.length < 2) continue;
      for (let index = 1; index < matching.length; index += 1) {
        const first = matching[index - 1];
        const second = matching[index];
        if (!inWindow(first, second, rule.days)) continue;
        const id = `rule-${pairKey(rule, first, second)}`;
        if (signals.some((signal) => signal.id === id)) continue;
        signals.push({ id, title: rule.title, summary: rule.summary, evidenceIds: [first.id, second.id], domains: [rule.a], confidence: clamp(rule.confidence), severity: rule.severity, causalClaim: "none" });
      }
      continue;
    }

    const left = usable.filter((event) => event.domain === rule.a);
    const right = usable.filter((event) => event.domain === rule.b);
    for (const first of left) for (const second of right) {
      if (!inWindow(first, second, rule.days)) continue;
      const id = `rule-${pairKey(rule, first, second)}`;
      if (signals.some((signal) => signal.id === id)) continue;
      const eventIds = [first.id, second.id];
      const clusterEvents = usable.filter((event) => eventIds.includes(event.id) || inWindow(first, event, 3) || inWindow(second, event, 3));
      const domains = distinctDomains(clusterEvents);
      const confidence = clamp(rule.confidence + Math.min(0.08, Math.max(0, domains.length - 2) * 0.03));
      signals.push({ id, title: rule.title, summary: `${rule.summary} Other nearby domains recorded: ${domains.join(", ")}.`, evidenceIds: clusterEvents.slice(-8).map((event) => event.id), domains, confidence, severity: rule.severity, causalClaim: "none" });
    }
  }

  // Preserve the existing broad-cluster detector as a higher-level fallback.
  for (let index = 0; index < usable.length; index += 1) {
    const anchor = usable[index];
    const window = usable.filter((event) => inWindow(anchor, event, 3));
    const domains = distinctDomains(window);
    if (domains.length < 3) continue;
    const evidenceIds = window.slice(-8).map((event) => event.id);
    const id = `cluster-${anchor.timestamp}-${domains.slice().sort().join("-")}`;
    if (signals.some((signal) => signal.id === id)) continue;
    const confidence = clamp(0.62 + Math.min(0.3, domains.length * 0.07));
    signals.push({ id, title: "A multi-domain change cluster appeared", summary: `${domains.length} record domains were active within a 3-day window: ${domains.join(", ")}. Review the underlying events together before drawing conclusions.`, evidenceIds, domains, confidence, severity: domains.includes("health") ? "watch" : "notice", causalClaim: "none" });
  }

  return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}

export function explainCrossDomainSignal(signal: TitanCrossDomainSignal, events: readonly TitanDomainEvent[]): TitanExplanation {
  const evidence = signal.evidenceIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is TitanDomainEvent => Boolean(event))
    .map((event) => `${new Date(event.timestamp).toLocaleDateString("en-GB")}: ${event.domain} — ${event.label}${event.source ? ` [${event.source}]` : ""}`);
  return {
    signalId: signal.id,
    why: `Tiny Titans is showing this because the records form a bounded temporal pattern across ${signal.domains.join(", ")}.`,
    evidence,
    limitations: [
      "The signal describes timing and co-occurrence only.",
      "It does not prove cause or diagnose a health condition.",
      "Missing records are not treated as negative evidence.",
    ],
  };
}

export function buildHolyShitSummary(signals: readonly TitanCrossDomainSignal[]): string {
  if (!signals.length) return "No cross-domain pattern is strong enough to surface yet. Tiny Titans is staying quiet rather than inventing a pattern.";
  const strongest = [...signals].sort((a, b) => b.confidence - a.confidence)[0];
  return `${strongest.title}: ${strongest.summary} Confidence ${Math.round(strongest.confidence * 100)}%.`;
}
