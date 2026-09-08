export type ProductUpdateDestination = {
  label: string;
  path: string;
  hint: string;
};

export type ProductUpdateDefinition = {
  id: string;
  version: string;
  releasedAt: string;
  icon: string;
  title: string;
  summary: string;
  details: string[];
  whereToFind: ProductUpdateDestination[];
};

export type ProductUpdateKind = "feature" | "improvement" | "bugfix" | "genetics" | "husbandry" | "community" | "security" | "performance";

const KIND_INTROS: Record<ProductUpdateKind, string> = {
  feature: "Tiny Titans introduces",
  improvement: "Tiny Titans has improved",
  bugfix: "Tiny Titans has fixed",
  genetics: "Tiny Titans has updated the genetics tools for",
  husbandry: "Tiny Titans has updated husbandry tools for",
  community: "Tiny Titans has updated the Community experience with",
  security: "Tiny Titans has strengthened security around",
  performance: "Tiny Titans has improved performance for",
};

/**
 * Creates the user-facing announcement sentence from structured release data.
 * The release registry is therefore the source of truth; the Hub does not rely
 * on AI-generated copy or on fragile Git commit-message parsing.
 */
export function generateCommunityUpdateMessage(update: ProductUpdateDefinition, kind: ProductUpdateKind = "improvement") {
  const intro = KIND_INTROS[kind];
  const title = update.title.replace(/^Tiny Titans\s+(introduces|has updated|has improved|has fixed)\s*/i, "").trim();
  const destination = update.whereToFind[0];
  const where = destination ? ` Find it here: ${destination.hint || destination.label}.` : "";
  return `${intro} ${title}.${where}`;
}
