import type { MorphDefinition } from "../data/morphs";
import { rankSearchResults as rankSharedSearchResults, scoreSearchCandidate, normaliseSearchValue } from "./searchRanking";

export type MorphSearchMode = "strict" | "combination" | "general";

export function normaliseSearch(value: unknown): string {
  return normaliseSearchValue(String(value ?? ""));
}

function fieldsForMorph(morph: MorphDefinition) {
  const enriched = morph as MorphDefinition & {
    searchTerms?: string[];
    recognisedNames?: string[];
    geneticFormula?: string;
    directFormula?: string;
  };
  return {
    canonical: [morph.name, morph.geneId],
    aliases: morph.aliases ?? [],
    secondary: [
      ...(enriched.searchTerms ?? []),
      ...(enriched.recognisedNames ?? []),
      ...(enriched.geneticFormula ? [enriched.geneticFormula] : []),
      ...(enriched.directFormula ? [enriched.directFormula] : []),
      ...(morph.components ?? []).map((component) => component.morphId),
    ],
  };
}

function scoreMorph(morph: MorphDefinition, query: string, mode: MorphSearchMode): number {
  const fields = fieldsForMorph(morph);
  const canonical = Math.max(0, ...fields.canonical.map((value) => scoreSearchCandidate(query, value, "canonical")));
  const alias = Math.max(0, ...fields.aliases.map((value) => scoreSearchCandidate(query, value, "alias")));
  const secondary = Math.max(0, ...fields.secondary.map((value) => scoreSearchCandidate(query, value, "secondary")));
  const combinationBoost = mode === "combination" && morph.isCombination && secondary > 0 ? 50000 : 0;
  if (mode === "strict" && !canonical && !alias && !secondary) return -1;
  if (mode === "combination" && !morph.isCombination && !canonical && !alias) return -1;
  return Math.max(canonical, alias, secondary) + combinationBoost;
}

export function rankMorphSearch<T extends MorphDefinition>(options: T[], query: string, mode: MorphSearchMode = "strict"): T[] {
  const raw = query.trim();
  if (!raw) return options;
  const ranked = rankSharedSearchResults(raw, options, fieldsForMorph);
  if (mode === "general") return ranked.map(({ item }) => item);
  return ranked
    .filter(({ item }) => scoreMorph(item, raw, mode) >= 0)
    .sort((a, b) => scoreMorph(b.item, raw, mode) - scoreMorph(a.item, raw, mode) || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);
}

export function morphMatchesQuery(morph: MorphDefinition, query: string, mode: MorphSearchMode = "strict"): boolean {
  return scoreMorph(morph, query, mode) >= 0;
}
