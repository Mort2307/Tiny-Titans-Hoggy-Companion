import type { PrivacyPreferences } from "../types/privacy";

export type IntelligencePermissionDecision = {
  personalIntelligence: true;
  communityContribution: boolean;
  communityIntelligence: boolean;
  reason: string;
};

export function getIntelligencePermissionDecision(privacy: PrivacyPreferences | null | undefined): IntelligencePermissionDecision {
  const optedIn = privacy?.communityHusbandryData === true;
  return {
    personalIntelligence: true,
    communityContribution: optedIn,
    communityIntelligence: optedIn,
    reason: optedIn
      ? "Community husbandry contribution is enabled, so consent-eligible data may support community intelligence."
      : "Community husbandry contribution is disabled, so personal intelligence remains available but this user's data must not enter community intelligence datasets.",
  };
}

export function assertCommunityContributionAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (privacy?.communityHusbandryData !== true) {
    throw new Error("Community husbandry contribution is not permitted without explicit consent.");
  }
}

export function canUseCommunityBenchmark(privacy: PrivacyPreferences | null | undefined): boolean {
  return privacy?.communityHusbandryData === true;
}
