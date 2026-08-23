import type { PrivacyPreferences } from "../types/privacy";

export type IntelligencePermissionDecision = {
  coreTracking: true;
  basicTracking: true;
  personalIntelligence: boolean;
  communityContribution: boolean;
  communityIntelligence: boolean;
  reason: string;
};

/**
 * Basic keeper tracking is always available: users can record and review their
 * own snake records without opting into Tiny Titans Intelligence.
 *
 * Advanced interpretation is deliberately separate. Trends, correlations,
 * anomaly detection, benchmarking, intelligence memory/timeline and community
 * intelligence are optional benefits unlocked only while explicit community
 * husbandry contribution consent is enabled.
 */
export function getIntelligencePermissionDecision(privacy: PrivacyPreferences | null | undefined): IntelligencePermissionDecision {
  const optedIn = privacy?.communityHusbandryData === true;
  return {
    coreTracking: true,
    basicTracking: true,
    personalIntelligence: optedIn,
    communityContribution: optedIn,
    communityIntelligence: optedIn,
    reason: optedIn
      ? "Full Tiny Titans Intelligence is enabled because community husbandry contribution is currently enabled."
      : "Basic keeper tracking remains available, but advanced intelligence and community contribution are paused until community husbandry contribution is enabled.",
  };
}

export function assertFullIntelligenceAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (privacy?.communityHusbandryData !== true) {
    throw new Error("Full Tiny Titans Intelligence requires community husbandry contribution to be enabled.");
  }
}

export function assertCommunityContributionAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (privacy?.communityHusbandryData !== true) {
    throw new Error("Community husbandry contribution is not permitted without explicit consent.");
  }
}

export function canUseFullIntelligence(privacy: PrivacyPreferences | null | undefined): boolean {
  return privacy?.communityHusbandryData === true;
}

export const FULL_INTELLIGENCE_COPY = {
  title: "Titan Intelligence",
  body: "Basic keeper tracking is available to everyone. Titan Intelligence is the optional advanced layer: it interprets eligible records, builds individual patterns and can contribute to the growing Tiny Titans knowledge base when you choose to help.",
  paused: "Titan Intelligence is currently paused. Your snake records remain available, but Tiny Titans will only provide basic record history and simple totals until you enable Intelligence again.",
  enabled: "Titan Intelligence is active. Tiny Titans can now use eligible records for advanced individual intelligence and community knowledge while your consent remains enabled.",
} as const;
