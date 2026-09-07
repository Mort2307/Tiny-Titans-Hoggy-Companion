import { calculatorNamedCombinations, findCalculatorNamedCombination, normaliseComboName } from "../../data/geneticsComboRegistry";
import { fullHognoseMorphTaxonomy } from "../../data/hognoseMorphFullTaxonomy";
import { hognoseMorphCatalog } from "../../data/hognoseMorphCatalog";
import { morphReferenceAdditions } from "../../data/morphReferenceAdditions";
import { morphs, type MorphDefinition } from "../../data/morphs";
import { masterMorphs } from "../../data/masterMorphDatabase";
import { SPECIES_GENETICS_CATALOGUES } from "../../data/species/speciesGeneticsCatalogues";
import { normaliseSearchValue, scoreSearchCandidate } from "../../utils/searchRanking";

export type GeneticsMatchKind = "canonical" | "alias" | "combination" | "fuzzy";
export interface GeneticsMatch { record: MorphDefinition; matchKind: GeneticsMatchKind; matchedQuery: string; score: number; }

function normalise(value: string): string { return normaliseComboName(value).replace(/[+×x]/g, " ").replace(/\s+/g, " ").trim(); }

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
    ...masterMorphs,
    ...morphs,
    ...calculatorNamedCombinations.filter((combo) => !masterMorphs.some((morph) => morph.geneId === combo.geneId)),
  ]);
  if (scoped === "Heterodon nasicus") return dedupeRecords([
    ...masterMorphs,
    ...hognoseMorphCatalog,
    ...morphReferenceAdditions,
    ...fullHognoseMorphTaxonomy,
    ...calculatorNamedCombinations,
  ] as MorphDefinition[]);
  return SPECIES_GENETICS_CATALOGUES[scoped] ?? [];
}

function componentDisplayNames(record: MorphDefinition): string[] {
  return (record.components ?? []).map((component) => {
    const base = morphs.find((morph) => morph.geneId === component.morphId)
      ?? masterMorphs.find((morph) => morph.geneId === component.morphId)
      ?? calculatorNamedCombinations.find((morph) => morph.geneId === component.morphId);
    return base?.name ?? component.morphId;
  });
}

function matchesExactComponentComposition(query: string, record: MorphDefinition): boolean {
  if (!record.isCombination || !record.components?.length) return false;
  const queryText = normaliseSearchValue(query).replace(/\s+/g, " ");
  const componentNames = componentDisplayNames(record).map((name) => normaliseSearchValue(name)).filter(Boolean);
  if (!queryText || componentNames.length < 2) return false;

  // Exact composition matching is order-independent. The query may be typed
  // as "Arctic Conda" or "Arctic + Conda"; both resolve to the same genetic
  // component set without confusing a single component with the combination.
  const exactJoined = componentNames.slice().sort().join(" ");
  const queryJoined = queryText.replace(/[+]/g, " ").replace(/\s+/g, " ").trim().split(" ").sort().join(" ");
  if (exactJoined === queryJoined) return true;

  return componentNames.every((componentName) => new RegExp(`(?:^|\\s)${componentName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?:$|\\s)`).test(queryText))
    && queryText.split(" ").length === componentNames.join(" ").split(" ").length;
}

/**
 * Species-aware genetics search with strict keeper-facing ranking.
 * Exact canonical identity always wins before aliases and composition matches.
 * A multi-word genetics query can also resolve directly against the recorded
 * component composition, so a canonical name such as Arctic Conda remains the
 * first result even when another source describes the same record by formula.
 */
export function searchGenetics(query: string, speciesScientificName?: string): GeneticsMatch[] {
  const raw = query.trim();
  const q = normalise(raw);
  if (!q) return [];

  const scopedCandidates = candidates(speciesScientificName);

  const exactCanonical = scopedCandidates.filter((record) => normalise(record.name) === q);
  if (exactCanonical.length) {
    return exactCanonical
      .sort((a, b) => Number(Boolean(b.isCombination)) - Number(Boolean(a.isCombination)) || a.name.localeCompare(b.name))
      .map((record): GeneticsMatch => ({
        record,
        matchKind: record.isCombination ? "combination" : "canonical",
        matchedQuery: raw,
        score: 100000,
      }))
      .slice(0, 12);
  }

  const exactAlias = scopedCandidates.flatMap((record) =>
    (record.aliases ?? [])
      .filter((alias) => normalise(alias) === q)
      .map((): GeneticsMatch => ({
        record,
        matchKind: record.isCombination ? "combination" : "alias",
        matchedQuery: raw,
        score: 90000,
      })),
  );
  if (exactAlias.length) return exactAlias.slice(0, 12);

  const exactComponentCompositions = scopedCandidates
    .filter((record) => matchesExactComponentComposition(raw, record))
    .sort((a, b) => Number(Boolean(b.isCombination)) - Number(Boolean(a.isCombination)) || a.name.localeCompare(b.name));
  if (exactComponentCompositions.length) {
    return exactComponentCompositions.slice(0, 12).map((record): GeneticsMatch => ({
      record,
      matchKind: "combination",
      matchedQuery: raw,
      score: 98000,
    }));
  }

  if (!speciesScientificName?.trim()) {
    const exactCombination = findCalculatorNamedCombination(raw);
    if (exactCombination) return [{ record: exactCombination, matchKind: "combination", matchedQuery: raw, score: 99000 }];
  }

  const matches: GeneticsMatch[] = [];
  for (const record of scopedCandidates) {
    const canonicalScore = scoreSearchCandidate(q, record.name, "canonical");
    const aliasScores = (record.aliases ?? []).map((alias) => scoreSearchCandidate(q, alias, "alias"));
    const secondaryTerms = [
      ...((record as MorphDefinition & { searchTerms?: string[] }).searchTerms ?? []),
      ...((record as MorphDefinition & { recognisedNames?: string[] }).recognisedNames ?? []),
      ...((record as MorphDefinition & { geneticFormula?: string }).geneticFormula ? [((record as MorphDefinition & { geneticFormula?: string }).geneticFormula as string)] : []),
    ];
    const secondaryScores = secondaryTerms.map((term) => scoreSearchCandidate(q, term, "secondary"));
    const bestAlias = Math.max(0, ...aliasScores);
    const bestSecondary = Math.max(0, ...secondaryScores);
    const score = Math.max(canonicalScore, bestAlias, bestSecondary);
    if (score <= 0) continue;

    const matchKind: GeneticsMatchKind = canonicalScore >= bestAlias && canonicalScore >= bestSecondary
      ? (record.isCombination ? "combination" : "canonical")
      : bestAlias >= bestSecondary ? "alias" : "fuzzy";
    matches.push({ record, matchKind, matchedQuery: raw, score });
  }

  return matches
    .sort((a, b) => b.score - a.score || Number(Boolean(b.record.isCombination)) - Number(Boolean(a.record.isCombination)) || a.record.name.localeCompare(b.record.name))
    .slice(0, 12);
}

export function searchSpeciesGenetics(query: string, speciesScientificName: string): GeneticsMatch[] { return searchGenetics(query, speciesScientificName); }
export function resolveGeneticsQuery(query: string, speciesScientificName?: string): GeneticsMatch | undefined { return searchGenetics(query, speciesScientificName)[0]; }
export function formatGeneticsResolution(match: GeneticsMatch): string { const { record } = match; const components = (record.components ?? []).map((component) => `${component.morphId}${component.copies && component.copies > 1 ? ` ×${component.copies}` : ""}`); if (record.isCombination) return `${record.name} [${components.join(" + ")}]`; return `${record.name} [${record.kind}]`; }
