import type { PrivacyPreferences } from "../types/privacy";
import { assertCommunityContributionAllowed, canUseFullIntelligence } from "./intelligencePermissionGateService";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";

/**
 * Prevents non-consenting users from using or contributing through the
 * community benchmark path. Personal/core tracking remains outside this guard.
 */
export function requireCommunityIntelligencePermission(privacy: PrivacyPreferences | null | undefined): void {
  assertCommunityContributionAllowed(privacy);
}

export function getCommunityBenchmarkForUser(privacy: PrivacyPreferences | null | undefined, benchmark: CommunityBenchmarkDataset | null): CommunityBenchmarkDataset | null {
  return canUseFullIntelligence(privacy) ? benchmark : null;
}
