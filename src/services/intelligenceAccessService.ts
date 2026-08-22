import { getPrivacyPreferences } from "./privacyService";

/**
 * Full Tiny Titans Intelligence is an optional benefit of contributing
 * eligible husbandry data anonymously to the community intelligence layer.
 * Core personal tracking remains available regardless of this choice.
 */
export async function hasFullIntelligenceAccess(uid: string): Promise<boolean> {
  if (!uid) return false;
  const preferences = await getPrivacyPreferences(uid);
  return preferences.communityHusbandryData === true;
}

export const INTELLIGENCE_ACCESS_COPY = {
  title: "Full Intelligence is optional",
  body: "Your personal tracking still works without optional sharing. Full Tiny Titans Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.",
  action: "Enable Intelligence in Data & Privacy",
} as const;
