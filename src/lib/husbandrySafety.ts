import type { UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import type { HusbandrySafetyAssessment, HusbandrySafetyItem } from "../types/husbandrySafety";

function normalise(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveHusbandrySafetyAssessment(
  item: HusbandrySafetyItem,
  species?: UniversalSpeciesRecord,
): HusbandrySafetyAssessment | undefined {
  if (species) {
    const exact = item.assessments.find((assessment) =>
      assessment.scope === "species" && assessment.scopeId === species.id,
    );
    if (exact) return exact;

    const classMatch = item.assessments.find((assessment) =>
      assessment.scope === "class" && assessment.scopeId === species.className,
    );
    if (classMatch) return classMatch;
  }

  return item.assessments.find((assessment) => assessment.scope === "all");
}

export function searchHusbandrySafetyItems(
  items: HusbandrySafetyItem[],
  query: string,
): HusbandrySafetyItem[] {
  const needle = normalise(query);
  if (!needle) return items;

  return items
    .map((item) => {
      const canonical = [item.commonName, item.scientificName ?? "", item.id].map(normalise);
      const aliases = item.aliases.map(normalise);
      const haystack = [...canonical, ...aliases, normalise(item.summary)];
      const exact = canonical.includes(needle) ? 100 : 0;
      const starts = haystack.some((part) => part.startsWith(needle)) ? 50 : 0;
      const includes = haystack.some((part) => part.includes(needle)) ? 20 : 0;
      return { item, score: exact + starts + includes };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.commonName.localeCompare(b.item.commonName))
    .map((entry) => entry.item);
}

export function mergeHusbandrySafetyItems(
  seed: HusbandrySafetyItem[],
  overrides: HusbandrySafetyItem[],
): HusbandrySafetyItem[] {
  const merged = new Map(seed.map((item) => [item.id, item]));
  for (const item of overrides) merged.set(item.id, item);
  return [...merged.values()]
    .filter((item) => !item.archived)
    .sort((a, b) => a.commonName.localeCompare(b.commonName));
}
