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
  | "intelligenceEventPipeline"
  | "reptileRoom3D";

const environmentFlags: Record<TinyTitansFeatureFlag, boolean> = {
  intelligentHome: true,
  universalSearch: true,
  snakeTimeline: true,
  breedingProjects: true,
  smartMarketplaceListing: true,
  adaptiveNotifications: true,
  offlineRecords: true,
  intelligenceEventPipeline: true,
  // Reserved: keep the 3D room code in-repo, but do not expose it in production until the UX, mobile behaviour and QA pass are ready.
  reptileRoom3D: false,
};

export function isTinyTitansFeatureEnabled(flag: TinyTitansFeatureFlag): boolean {
  return environmentFlags[flag];
}

export function getTinyTitansFeatureFlags(): Readonly<Record<TinyTitansFeatureFlag, boolean>> {
  return environmentFlags;
}
