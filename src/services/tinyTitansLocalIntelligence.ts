import type { TinyTitansInsight } from "./tinyTitansIntelligenceKernel";

export interface TrendPoint { value: number; at: string; }
export interface TrendResult { direction: "rising" | "falling" | "stable" | "insufficient-data"; change: number | null; points: number; }
export interface EvidenceItem { label: string; value: string; }
export interface DerivedInsightInput {
  id: string; title: string; message: string; sourceEvents: TinyTitansInsight["sourceEvents"];
  tone?: TinyTitansInsight["tone"]; type?: TinyTitansInsight["type"]; confidence?: number;
  actionLabel?: string; actionRoute?: string; createdAt?: string; evidence?: EvidenceItem[];
}

export function calculateTrend(points: TrendPoint[], tolerance = 0.02): TrendResult {
  const valid = points.filter((point) => Number.isFinite(point.value)).sort((a, b) => a.at.localeCompare(b.at));
  if (valid.length < 2) return { direction: "insufficient-data", change: null, points: valid.length };
  const first = valid[0].value; const last = valid[valid.length - 1].value;
  if (first === 0) return { direction: last === 0 ? "stable" : "rising", change: last - first, points: valid.length };
  const change = (last - first) / Math.abs(first);
  const direction = Math.abs(change) <= tolerance ? "stable" : change > 0 ? "rising" : "falling";
  return { direction, change, points: valid.length };
}

export function daysBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso); const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.floor((to - from) / 86400000));
}

export function buildLocalInsight(input: DerivedInsightInput): TinyTitansInsight & { evidence?: EvidenceItem[] } {
  return {
    id: input.id, type: input.type ?? "insight", tone: input.tone ?? "neutral", title: input.title, message: input.message,
    confidence: clampConfidence(input.confidence), sourceEvents: input.sourceEvents,
    createdAt: input.createdAt ?? new Date().toISOString(), actionLabel: input.actionLabel, actionRoute: input.actionRoute, evidence: input.evidence,
  };
}

export function clampConfidence(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}
