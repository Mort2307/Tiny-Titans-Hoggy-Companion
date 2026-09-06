import type { TitanEvidence, TitanEvidenceLevel, TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";

export interface TitanEvidenceNode {
  id: string;
  label: string;
  level: TitanEvidenceLevel;
  sourceIds: readonly string[];
  relation?: string;
}

export interface TitanWhyThisResult {
  title: string;
  explanation: string;
  evidence?: TitanEvidence;
  sourceChain: readonly TitanEvidenceNode[];
}

const levelWeight: Record<TitanEvidenceLevel, number> = {
  established: 1,
  supported: 0.85,
  reported: 0.65,
  uncertain: 0.35,
  disputed: 0.15,
};

export function evidenceWeight(level: TitanEvidenceLevel): number {
  return levelWeight[level];
}

export function buildEvidence(
  level: TitanEvidenceLevel,
  sourceIds: readonly string[],
  explanation: string,
): TitanEvidence {
  return { level, sourceIds: [...sourceIds], explanation };
}

export function explainWhyRecommendation(
  recommendation: TitanRecommendation,
  evidence?: TitanEvidence,
): TitanWhyThisResult {
  return {
    title: `Why you're seeing: ${recommendation.title}`,
    explanation: recommendation.reason,
    evidence,
    sourceChain: evidence ? [{ id: recommendation.id, label: recommendation.title, level: evidence.level, sourceIds: evidence.sourceIds }] : [],
  };
}

export function explainWhySignal(signal: TitanSignal): TitanWhyThisResult {
  return {
    title: `Why you're seeing: ${signal.title}`,
    explanation: signal.message,
    evidence: signal.evidence,
    sourceChain: signal.evidence ? [{ id: signal.id, label: signal.title, level: signal.evidence.level, sourceIds: signal.evidence.sourceIds }] : [],
  };
}

export function mergeEvidence(...evidence: readonly (TitanEvidence | undefined)[]): TitanEvidence | undefined {
  const present = evidence.filter((item): item is TitanEvidence => Boolean(item));
  if (!present.length) return undefined;
  const strongest = [...present].sort((a, b) => evidenceWeight(b.level) - evidenceWeight(a.level))[0];
  return {
    level: strongest.level,
    sourceIds: [...new Set(present.flatMap((item) => item.sourceIds))],
    explanation: present.map((item) => item.explanation).filter(Boolean).join(" "),
  };
}
