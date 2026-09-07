import { calculatorNamedCombinations, findCalculatorNamedCombination, normaliseComboName } from "../../data/geneticsComboRegistry";
import { fullHognoseMorphTaxonomy } from "../../data/hognoseMorphFullTaxonomy";
import { hognoseMorphCatalog } from "../../data/hognoseMorphCatalog";
import { morphReferenceAdditions } from "../../data/morphReferenceAdditions";
import { morphs, type MorphDefinition } from "../../data/morphs";
import { SPECIES_GENETICS_CATALOGUES } from "../../data/species/speciesGeneticsCatalogues";

export type GeneticsMatchKind = "canonical" | "alias" | "combination" | "fuzzy";
export interface GeneticsMatch { record: MorphDefinition; matchKind: GeneticsMatchKind; matchedQuery: string; score: number; }

function normalise(value: string): string { return normaliseComboName(value).replace(/[+×x]/g, " ").replace(/\s+/g, " ").trim(); }

function scoreName(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 1000;
  if (candidate.startsWith(query)) return 850;
  if (candidate.includes(query)) return 650;
  const q = new Set(query.split(" ").filter(Boolean));
  const c = new Set(candidate.split(" ").filter(Boolean));
  const overlap = [...q].filter((token) => c.has(token)).length;
  if (!q.size || !overlap) return 0;
  return 400 + Math.round((overlap / q.size) * 80);
}

function dedupeRecords(records: MorphDefinition[]): MorphDefinition[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = String(record.geneId || record.name || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidates(speciesScientificName?: string): MorphDefinition[] {
  const scoped = speciesScientificName?.trim();
  if (!scoped) return dedupeRecords([
    ...morphs,
    ...calculatorNamedCombinations.filter((combo) => !morphs.some((morph) => morph.geneId === combo.geneId)),
  ]);
  if (scoped === "Heterodon nasicus") return dedupeRecords([
    ...hognoseMorphCatalog,
    ...morphReferenceAdditions,
    ...fullHognoseMorphTaxonomy,
  ] as MorphDefinition[]);
  return SPECIES_GENETICS_CATALOGUES[scoped] ?? [];
}

/**
 * Species-aware genetics search with strict ranking. Exact canonical identity
 * always outranks an exact alias, partial name, component overlap or fuzzy hit.
 * Hognose search also includes the full taxonomy/reference additions so every
 * published library identity is searchable from the same resolver.
 */
export function searchGenetics(query: string, speciesScientificName?: string): GeneticsMatch[] {
  const raw = query.trim();
  const q = normalise(raw);
  if (!q) return [];

  const scopedCandidates = candidates(speciesScientificName);
  const exactCanonical = scopedCandidates.filter((record) => normalise(record.name) === q);
  if (exactCanonical.length) {
    return exactCanonical.map((record) => ({
      record,
      matchKind: record.isCombination ? "combination" : "canonical",
      matchedQuery: raw,
      score: 1000,
    })).slice(0, 12);
  }

  if (!speciesScientificName?.trim()) {
    const exactCombination = findCalculatorNamedCombination(raw);
    if (exactCombination) return [{ record: exactCombination, matchKind: "combination", matchedQuery: raw, score: 990 }];
  }

  const matches: GeneticsMatch[] = [];
  for (const record of scopedCandidates) {
    const canonicalScore = scoreName(q, normalise(record.name));
    const aliasScores = (record.aliases ?? []).map((alias) => scoreName(q, normalise(alias)));
    const searchTermScores = ((record as MorphDefinition & { searchTerms?: string[] }).searchTerms ?? []).map((term) => scoreName(q, normalise(term)));
    const bestAlias = Math.max(0, ...aliasScores);
    const bestSearchTerm = Math.max(0, ...searchTermScores);
    const score = Math.max(canonicalScore, bestAlias > 0 ? bestAlias - 10 : 0, bestSearchTerm > 0 ? bestSearchTerm - 20 : 0);
    if (score <= 0) continue;
    const matchKind: GeneticsMatchKind = canonicalScore >= bestAlias && canonicalScore >= bestSearchTerm
      ? (record.isCombination ? "combination" : "canonical")
      : bestAlias >= bestSearchTerm ? "alias" : "fuzzy";
    matches.push({ record, matchKind, matchedQuery: raw, score });
  }
  return matches
    .sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name))
    .slice(0, 12);
}

export function searchSpeciesGenetics(query: string, speciesScientificName: string): GeneticsMatch[] {
  return searchGenetics(query, speciesScientificName);
}
export function resolveGeneticsQuery(query: string, speciesScientificName?: string): GeneticsMatch | undefined { return searchGenetics(query, speciesScientificName)[0]; }
export function formatGeneticsResolution(match: GeneticsMatch): string { const { record } = match; const components = (record.components ?? []).map((component) => `${component.morphId}${component.copies && component.copies > 1 ? ` ×${component.copies}` : ""}`); if (record.isCombination) return `${record.name} [${components.join(" + ")}]`; return `${record.name} [${record.kind}]`; }
