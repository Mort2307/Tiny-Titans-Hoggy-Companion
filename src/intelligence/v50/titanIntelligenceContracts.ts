export type TitanEvidenceLevel = "established" | "supported" | "reported" | "uncertain" | "disputed";

export type TitanSignalSeverity = "info" | "notice" | "watch" | "urgent";

export interface TitanEvidence {
  level: TitanEvidenceLevel;
  sourceIds: readonly string[];
  explanation: string;
}

export interface TitanSignal {
  id: string;
  animalId?: string;
  title: string;
  message: string;
  severity: TitanSignalSeverity;
  confidence: number;
  evidence?: TitanEvidence;
  actionPath?: string;
  createdAt: number;
  expiresAt?: number;
}

export interface TitanRecommendation {
  id: string;
  title: string;
  reason: string;
  destination: string;
  priority: number;
  confidence: number;
  evidence?: TitanEvidence;
}

export interface TitanContextSnapshot {
  animalId?: string;
  speciesId?: string;
  recentEventTypes: readonly string[];
  incompleteTasks: readonly string[];
  staleAreas: readonly string[];
  relevantRoutes: readonly string[];
  generatedAt: number;
}

/**
 * Shared safety contract for proactive intelligence.
 * Intelligence may recommend, flag, compare and explain; it must not silently
 * invent records, convert uncertain genetics into facts, or present a medical
 * diagnosis as certainty.
 */
export interface TitanIntelligenceResult {
  signals: readonly TitanSignal[];
  recommendations: readonly TitanRecommendation[];
  context: TitanContextSnapshot;
  generatedAt: number;
}

export const TITAN_INTELLIGENCE_RULES = Object.freeze({
  neverInventUserData: true,
  preserveGeneticUncertainty: true,
  explainRecommendations: true,
  preferExistingRoutes: true,
  avoidDuplicateNavigationDestinations: true,
  medicalAdviceRequiresProfessionalEscalation: true,
  emergencyGuidanceRequiresClearSafetyBoundary: true,
  privacyByDefault: true,
  gracefulDegradation: true,
});

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
