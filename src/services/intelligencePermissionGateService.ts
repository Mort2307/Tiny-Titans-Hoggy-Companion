import type { PrivacyPreferences } from "../types/privacy";

export type IntelligencePermissionDecision = {
  coreTracking: true;
  basicTracking: true;
  personalIntelligence: boolean;
  communityContribution: boolean;
  communityIntelligence: boolean;
  communityMessaging: boolean;
  reason: string;
};

/**
 * Intelligence eligibility is permission-based, not population-based.
 * A keeper with one snake receives the same intelligence architecture as a keeper
 * with many snakes; sparse evidence lowers confidence rather than removing access.
 *
 * `communityHusbandryData` is retained only as a legacy migration signal. New
 * decisions use the dedicated permission fields so personal intelligence,
 * community contribution, community intelligence and messaging can be controlled
 * independently.
 */
export function getIntelligencePermissionDecision(privacy: PrivacyPreferences | null | undefined): IntelligencePermissionDecision {
  const personalIntelligence = privacy?.personalIntelligence === true || privacy?.communityHusbandryData === true;
  const communityContribution = privacy?.communityContribution === true || privacy?.communityHusbandryData === true;
  const communityIntelligence = privacy?.communityIntelligence === true || privacy?.communityHusbandryData === true;
  const communityMessaging = privacy?.communityMessaging === true;

  const enabled = personalIntelligence || communityContribution || communityIntelligence;
  return {
    coreTracking: true,
    basicTracking: true,
    personalIntelligence,
    communityContribution,
    communityIntelligence,
    communityMessaging,
    reason: enabled
      ? "Titan Intelligence is permission-based. The amount of evidence affects confidence, not whether a keeper can use Intelligence."
      : "Basic keeper tracking remains available. Advanced intelligence is paused until the keeper enables Personal Intelligence.",
  };
}

export function assertFullIntelligenceAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (!getIntelligencePermissionDecision(privacy).personalIntelligence) {
    throw new Error("Personal Titan Intelligence is not enabled for this account.");
  }
}

export function assertCommunityContributionAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (!getIntelligencePermissionDecision(privacy).communityContribution) {
    throw new Error("Community Intelligence contribution is not enabled for this account.");
  }
}

export function assertCommunityMessagingAllowed(privacy: PrivacyPreferences | null | undefined): void {
  if (!getIntelligencePermissionDecision(privacy).communityMessaging) {
    throw new Error("Community messaging is not enabled for this account.");
  }
}

export function canUseFullIntelligence(privacy: PrivacyPreferences | null | undefined): boolean {
  return getIntelligencePermissionDecision(privacy).personalIntelligence;
}

export function canContributeToCommunityIntelligence(privacy: PrivacyPreferences | null | undefined): boolean {
  return getIntelligencePermissionDecision(privacy).communityContribution;
}

export const FULL_INTELLIGENCE_COPY = {
  title: "Titan Intelligence",
  body: "Titan Intelligence is available from your first snake. Tiny datasets are not discarded: they simply carry lower evidence confidence until more records or independent keepers strengthen the pattern.",
  paused: "Titan Intelligence is paused for this account. Your snake records remain available and no records are deleted. Re-enable Personal Intelligence to restore advanced interpretation.",
  enabled: "Titan Intelligence is active. Tiny Titans can analyse eligible records from every keeper-managed snake, while evidence quality controls confidence rather than access.",
} as const;
