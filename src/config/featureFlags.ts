/**
 * Tiny Titans feature gates.
 *
 * Keep experimental capabilities behind explicit flags so new intelligence,
 * UX and platform capabilities can be introduced progressively without
 * destabilising the production experience.
 */

export type TinyTitansFeatureFlag =
  | "intelligentHome"
  | "universalSearch"
  | "snakeTimeline"
  | "breedingProjects"
  | "smartMarketplaceListing"
  | "adaptiveNotifications"
  | "offlineRecords"
  | "intelligenceEventPipeline";

const environmentFlags: Record<TinyTitansFeatureFlag, boolean> = {
  intelligentHome: true,
  universalSearch: true,
  snakeTimeline: true,
  breedingProjects: true,
  smartMarketplaceListing: true,
  adaptiveNotifications: true,
  offlineRecords: true,
  intelligenceEventPipeline: true,
};

export function isTinyTitansFeatureEnabled(flag: TinyTitansFeatureFlag): boolean {
  return environmentFlags[flag];
}

export function getTinyTitansFeatureFlags(): Readonly<Record<TinyTitansFeatureFlag, boolean>> {
  return environmentFlags;
}
