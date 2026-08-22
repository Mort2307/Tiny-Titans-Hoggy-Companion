import { getPrivacyPreferences } from "./privacyService";
import { getIntelligencePermissionDecision } from "./intelligencePermissionGateService";

/** Full Intelligence follows the user's current community husbandry consent. */
export async function hasFullIntelligenceAccess(uid: string): Promise<boolean> {
  if (!uid) return false;
  const preferences = await getPrivacyPreferences(uid);
  return getIntelligencePermissionDecision(preferences).personalIntelligence;
}

export const INTELLIGENCE_ACCESS_COPY = {
  title: "Full Intelligence is optional",
  body: "Your core tracking remains available either way. Full Tiny Titans Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.",
  action: "Manage Intelligence in Data & Privacy",
  paused: "Full Intelligence is currently paused. Your records remain available and nothing has been deleted. You can enable it again at any time.",
} as const;
