export type TitanConfidenceBand = "High" | "Moderate" | "Low" | "Insufficient";

export interface TitanConfidenceInput {
  recordCount: number;
  datedRecordCount: number;
  explicitSourceCount?: number;
  confirmedCount?: number;
  reportedCount?: number;
  uncertainCount?: number;
  lastRecordedAt?: number;
  now?: number;
}

export interface TitanDataConfidence {
  score: number;
  band: TitanConfidenceBand;
  factors: Array<{ id: string; label: string; score: number; explanation: string }>;
  explanation: string;
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

/**
 * Confidence is a property of the evidence available to Tiny Titans, not a
 * probability that a biological claim is true. The model rewards explicit,
 * dated, attributable records and penalises missing/uncertain evidence.
 */
export function calculateTitanDataConfidence(input: TitanConfidenceInput): TitanDataConfidence {
  const total = Math.max(0, input.recordCount);
  const dated = Math.min(total, Math.max(0, input.datedRecordCount));
  const confirmed = Math.max(0, input.confirmedCount ?? 0);
  const reported = Math.max(0, input.reportedCount ?? 0);
  const uncertain = Math.max(0, input.uncertainCount ?? 0);
  const explicitSources = Math.max(0, input.explicitSourceCount ?? 0);
  const now = input.now ?? Date.now();

  if (total === 0) {
    return { score: 0, band: "Insufficient", factors: [], explanation: "There are no underlying records yet, so Tiny Titans has insufficient evidence to score this context." };
  }

  const completeness = clamp(dated / total);
  const attribution = clamp(explicitSources / Math.max(1, total));
  const directEvidence = clamp(confirmed / Math.max(1, confirmed + reported + uncertain));
  const uncertaintyPenalty = clamp(uncertain / Math.max(1, confirmed + reported + uncertain));
  const ageDays = input.lastRecordedAt && input.lastRecordedAt > 0 ? Math.max(0, (now - input.lastRecordedAt) / 86400000) : Infinity;
  const recency = ageDays === Infinity ? 0 : ageDays <= 30 ? 1 : ageDays <= 180 ? 0.75 : ageDays <= 365 ? 0.5 : 0.25;

  const score = Math.round(clamp(
    completeness * 0.3 + attribution * 0.2 + directEvidence * 0.3 + recency * 0.2 - uncertaintyPenalty * 0.2,
  ) * 100);
  const band: TitanConfidenceBand = score >= 80 ? "High" : score >= 60 ? "Moderate" : score >= 30 ? "Low" : "Insufficient";
  const factors = [
    { id: "completeness", label: "Dated coverage", score: Math.round(completeness * 100), explanation: `${dated} of ${total} records have a usable date.` },
    { id: "attribution", label: "Source attribution", score: Math.round(attribution * 100), explanation: `${explicitSources} record(s) identify an explicit source or origin.` },
    { id: "direct-evidence", label: "Direct evidence", score: Math.round(directEvidence * 100), explanation: `${confirmed} confirmed, ${reported} reported and ${uncertain} uncertain record state(s) were supplied.` },
    { id: "recency", label: "Recency", score: Math.round(recency * 100), explanation: ageDays === Infinity ? "No recent dated event is available." : `The newest supplied record is ${Math.round(ageDays)} day(s) old.` },
  ];

  return {
    score,
    band,
    factors,
    explanation: `Confidence describes evidence quality and completeness, not biological certainty. Current evidence scores ${score}% (${band}). ${uncertain > 0 ? "Uncertain records are explicitly penalised rather than promoted to fact." : "No uncertain records were included in the supplied state."}`,
  };
}
