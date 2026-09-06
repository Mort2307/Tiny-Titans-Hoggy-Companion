export interface TitanDomainEvent {
  id: string;
  domain: "weight" | "feeding" | "shed" | "behaviour" | "health" | "microclimate" | "journal" | "genetics";
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

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

function inWindow(a: TitanDomainEvent, b: TitanDomainEvent, days: number): boolean {
  return Math.abs(a.timestamp - b.timestamp) <= days * DAY;
}

function distinctDomains(events: TitanDomainEvent[]): string[] {
  return [...new Set(events.map((event) => event.domain))];
}

/**
 * Detects cross-domain temporal structure. This engine is intentionally
 * descriptive rather than causal: co-occurrence is surfaced as context, never
 * as proof that one husbandry event caused an animal outcome.
 */
export function detectCrossDomainSignals(events: readonly TitanDomainEvent[]): TitanCrossDomainSignal[] {
  const usable = events.filter((event) => Number.isFinite(event.timestamp) && event.timestamp > 0).sort((a, b) => a.timestamp - b.timestamp);
  const signals: TitanCrossDomainSignal[] = [];
  for (let index = 0; index < usable.length; index += 1) {
    const anchor = usable[index];
    const window = usable.filter((event) => inWindow(anchor, event, 3));
    const domains = distinctDomains(window);
    if (domains.length >= 3) {
      const evidenceIds = window.slice(-8).map((event) => event.id);
      const confidence = clamp(0.62 + Math.min(0.3, domains.length * 0.07));
      const id = `cluster-${anchor.timestamp}-${domains.slice().sort().join("-")}`;
      if (!signals.some((signal) => signal.id === id)) {
        signals.push({
          id,
          title: "A multi-domain change cluster appeared",
          summary: `${domains.length} record domains were active within a 3-day window: ${domains.join(", ")}. Review the underlying events together before drawing conclusions.`,
          evidenceIds,
          domains,
          confidence,
          severity: domains.includes("health") ? "watch" : "notice",
          causalClaim: "none",
        });
      }
    }
  }

  return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

export function explainCrossDomainSignal(signal: TitanCrossDomainSignal, events: readonly TitanDomainEvent[]): TitanExplanation {
  const evidence = signal.evidenceIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is TitanDomainEvent => Boolean(event))
    .map((event) => `${new Date(event.timestamp).toLocaleDateString("en-GB")}: ${event.domain} — ${event.label}${event.source ? ` [${event.source}]` : ""}`);
  return {
    signalId: signal.id,
    why: `Tiny Titans is showing this because the records form a close temporal cluster across ${signal.domains.join(", ")}.`,
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
