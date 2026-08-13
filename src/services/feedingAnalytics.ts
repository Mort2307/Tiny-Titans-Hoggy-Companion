import type { FeedingRecord } from "../types/Feeding";

export interface FeedingAnalytics {
  total: number;
  accepted: number;
  refused: number;
  partial: number;
  regurgitated: number;
  acceptanceRate: number;
  averagePreyWeight: number | null;
  lastFeedingDate: string | null;
  daysSinceLastFeeding: number | null;
  weighedMealCount: number;
  dimensionedMealCount: number;
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function getFeedingAnalytics(
  records: FeedingRecord[],
  today = new Date().toISOString().slice(0, 10),
): FeedingAnalytics {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const total = sorted.length;
  const accepted = sorted.filter((r) => r.response === "Accepted").length;
  const refused = sorted.filter((r) => r.response === "Refused").length;
  const partial = sorted.filter((r) => r.response === "Partial").length;
  const regurgitated = sorted.filter((r) => r.response === "Regurgitated").length;
  const weighed = sorted.filter((r) => typeof r.weight === "number" && r.weight > 0);
  const dimensioned = sorted.filter((r) => {
    const record = r as FeedingRecord & { preyLengthMm?: number; preyWidthMm?: number };
    return (record.preyLengthMm ?? 0) > 0 || (record.preyWidthMm ?? 0) > 0;
  });

  return {
    total,
    accepted,
    refused,
    partial,
    regurgitated,
    acceptanceRate: total ? Math.round((accepted / total) * 100) : 0,
    averagePreyWeight: weighed.length
      ? Math.round((weighed.reduce((sum, r) => sum + (r.weight ?? 0), 0) / weighed.length) * 100) / 100
      : null,
    lastFeedingDate: sorted[0]?.date ?? null,
    daysSinceLastFeeding: sorted[0] ? daysBetween(sorted[0].date, today) : null,
    weighedMealCount: weighed.length,
    dimensionedMealCount: dimensioned.length,
  };
}
