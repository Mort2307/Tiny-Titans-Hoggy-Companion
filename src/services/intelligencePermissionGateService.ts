import type { PrivacyPreferences } from "../types/privacy";

export type IntelligencePermissionDecision = {
  coreTracking: true;
  personalIntelligence: boolean;
  communityContribution: boolean;
  communityIntelligence: boolean;
  reason: string;
};

/**
 * Core tracking is always available. Full intelligence is an optional benefit
 * unlocked while the user has explicitly enabled community husbandry data.
 * The preference is read live, so turning consent off immediately removes the
 * intelligence entitlement without deleting the user's underlying records.
 */
export function getIntelligencePermissionDecision(privacy: PrivacyPreferences | null | undefined): IntelligencePermissionDecision {
  const optedIn = privacy?.communityHusbandryData === true;
  return {
    coreTracking: true,
    personalIntelligence: optedIn,
    communityContribution: optedIn,
    communityIntelligence: optedIn,
    reason: optedIn
      ? "Full Tiny Titans Intelligence is enabled because Community Husbandry Data Contribution is currently enabled."
      : "Core tracking remains available, but Full Tiny Titans Intelligence and community contribution are paused until Community Husbandry Data Contribution is enabled.",
  };
}

export function assertFullIntelligenceAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (privacy?.communityHusbandryData !== true) {
    throw new Error("Full Tiny Titans Intelligence requires Community Husbandry Data Contribution to be enabled.");
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
  title: "Full Tiny Titans Intelligence",
  body: "Your core tracking remains available either way. Full Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.",
  paused: "Full Intelligence is currently paused. Your records are still available and nothing has been deleted. You can enable Intelligence again at any time in Data & Privacy.",
} as const;
