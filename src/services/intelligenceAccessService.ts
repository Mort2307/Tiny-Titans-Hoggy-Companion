import { getPrivacyPreferences } from "./privacyService";
import { getIntelligencePermissionDecision } from "./intelligencePermissionGateService";

/** Full personal Intelligence follows the explicit personalIntelligence permission. */
export async function hasFullIntelligenceAccess(uid: string): Promise<boolean> {
  if (!uid) return false;
  const preferences = await getPrivacyPreferences(uid);
  return getIntelligencePermissionDecision(preferences).personalIntelligence;
}

export const INTELLIGENCE_ACCESS_COPY = {
  title: "Full Intelligence is optional",
  body: "Your core tracking remains available either way. Personal Titan Intelligence is available from your first snake. Record quantity affects confidence and depth of evidence, not eligibility.",
  action: "Manage Intelligence in Data & Privacy",
  paused: "Personal Intelligence is currently paused. Your records remain available and nothing has been deleted. You can enable it again at any time.",
  enabled: "Personal Intelligence is active. Tiny Titans can analyse eligible records from every keeper-managed snake, with evidence quality controlling confidence rather than access.",
} as const;
