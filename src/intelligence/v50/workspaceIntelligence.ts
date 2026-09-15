import type { PaidTierId } from "../../config/paidTiers";
import type { WorkspaceProductId } from "../../config/workspaceProducts";

export type IntelligenceSource = "observation" | "record" | "workflow" | "feedback" | "qa" | "submission" | "system";
export type IntelligenceVisibility = "private" | "aggregated" | "creator_review" | "public";
export type IntelligenceState = "observed" | "pattern" | "under_review" | "supported" | "approved" | "deprecated";

export type WorkspaceIntelligenceSignal = {
  signalType: string;
  source: IntelligenceSource;
  workspace: WorkspaceProductId;
  tier: PaidTierId;
  species?: string;
  subjectId?: string;
  category: string;
  state: IntelligenceState;
  visibility: IntelligenceVisibility;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function createWorkspaceSignal(input: Omit<WorkspaceIntelligenceSignal, "createdAt">): WorkspaceIntelligenceSignal {
  return { ...input, createdAt: new Date().toISOString() };
}

export function canContributeToCreatorIntelligence(signal: WorkspaceIntelligenceSignal, intelligenceConsent: boolean): boolean {
  return intelligenceConsent && signal.visibility !== "private";
}

export function anonymisedSignal(signal: WorkspaceIntelligenceSignal): Omit<WorkspaceIntelligenceSignal, "subjectId"> & { subjectId?: undefined } {
  const safe = { ...signal } as Omit<WorkspaceIntelligenceSignal, "subjectId"> & { subjectId?: string };
  delete safe.subjectId;
  return safe as Omit<WorkspaceIntelligenceSignal, "subjectId"> & { subjectId?: undefined };
}
