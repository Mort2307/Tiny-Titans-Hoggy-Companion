import { calculatorNamedCombinations, componentSignature, normaliseComboName } from "../../data/geneticsComboRegistry";
import { morphs, type MorphComponent, type MorphDefinition, type VerificationStatus } from "../../data/morphs";
import { searchGenetics, type GeneticsMatch } from "./geneticsSearchEngine";

export interface GeneticsSearchResult {
  matchedName: string;
  canonicalName: string;
  matchedType: MorphDefinition["kind"];
  recognised: boolean;
  verification: VerificationStatus;
  canonicalComponents: string[];
  commonCombinationName?: string;
  description: string;
  educationalNotes?: string;
  evidenceSummary: string;
  confidence: "High" | "Moderate" | "Low";
  matchKind?: "canonical" | "alias" | "combination" | "fuzzy";
  score: number;
}

function displayComponent(component: MorphComponent): string {
  const copies = component.copies ?? 1;
  const morph = morphs.find((candidate) => candidate.geneId === component.morphId) ?? calculatorNamedCombinations.find((candidate) => candidate.geneId === component.morphId);
  const name = morph?.name ?? component.morphId;
  if (copies === 2) return `2 copies ${name}`;
  return `${copies} copy ${name}`;
}

function compactComponentLabel(component: MorphComponent): string {
  const morph = morphs.find((candidate) => candidate.geneId === component.morphId) ?? calculatorNamedCombinations.find((candidate) => candidate.geneId === component.morphId);
  const name = morph?.name ?? component.morphId;
  return (component.copies ?? 1) === 2 ? `Super ${name}` : name;
}

function confidenceFor(verification: VerificationStatus, isCombination: boolean, matchKind?: GeneticsMatch["matchKind"]): GeneticsSearchResult["confidence"] {
  if (verification === "Confirmed" && matchKind !== "fuzzy") return "High";
  if (verification === "Recognised" && isCombination && matchKind !== "fuzzy") return "High";
  if (verification === "Recognised") return matchKind === "fuzzy" ? "Low" : "Moderate";
  return "Low";
}

function evidenceSummaryFor(morph: MorphDefinition, matchKind: GeneticsMatch["matchKind"]): string {
  const status = morph.verification;
  if (matchKind === "alias") return `Matched through a recorded alias; the canonical record is ${status.toLowerCase()}.`;
  if (matchKind === "fuzzy") return `Fuzzy name match only; the canonical record is ${status.toLowerCase()}. Verify before using it as a genetic fact.`;
  if (morph.isCombination) return `Recognised combination record with ${status.toLowerCase()} verification. Components remain the genetic source of truth.`;
  return `Canonical genetic record with ${status.toLowerCase()} verification.`;
}

function toResult(morph: MorphDefinition, query: string, matchKind: GeneticsMatch["matchKind"], score: number): GeneticsSearchResult {
  const aliasMatched = matchKind === "alias";
  const matchedName = aliasMatched ? query.trim() : morph.name;
  return {
    matchedName,
    canonicalName: morph.name,
    matchedType: morph.kind,
    recognised: morph.verification === "Confirmed" || morph.verification === "Recognised",
    verification: morph.verification,
    canonicalComponents: (morph.components ?? []).map(displayComponent),
    commonCombinationName: morph.isCombination ? morph.name : undefined,
    description: morph.description ?? "No description is currently recorded.",
    educationalNotes: morph.educationalNotes,
    evidenceSummary: evidenceSummaryFor(morph, matchKind),
    confidence: confidenceFor(morph.verification, Boolean(morph.isCombination), matchKind),
    matchKind,
    score,
  };
}

/**
 * Evidence-aware lookup for keeper-facing genetics search. The canonical
 * search engine resolves names/aliases/combos; this adapter adds presentation
 * and evidence metadata without changing genetic records.
 */
export function searchGeneticsIntelligence(query: string): GeneticsSearchResult[] {
  const normalised = normaliseComboName(query);
  if (!normalised) return [];
  return searchGenetics(query).map((match) => toResult(match.record, query, match.matchKind, match.score));
}

/**
 * Finds every other recognised record with the same component signature.
 * This is useful for displaying equivalent/common combination labels without
 * asserting that the names are separate genes.
 */
function findEquivalentCombinations(combination: MorphDefinition): MorphDefinition[] {
  const signature = componentSignature(combination.components ?? []);
  return calculatorNamedCombinations.filter((candidate) =>
    candidate.geneId !== combination.geneId &&
    componentSignature(candidate.components ?? []) === signature,
  );
}

export function explainGeneticsSearch(query: string): string {
  const result = searchGeneticsIntelligence(query)[0];
  if (!result) return "No confirmed or recognised genetics record matched that search.";
  if (result.commonCombinationName) {
    const equivalents = findEquivalentCombinations(
      [...morphs, ...calculatorNamedCombinations].find((morph) => morph.name === result.canonicalName) ?? calculatorNamedCombinations[0],
    );
    const equivalentNames = equivalents.map((item) => item.name).slice(0, 3);
    const suffix = equivalentNames.length ? ` Related recognised names: ${equivalentNames.join(", ")}.` : "";
    return `${result.matchedName} resolves to ${result.canonicalName} [${result.canonicalComponents.map((item) => item.replace(/^2 copies |^1 copy /, "")).join(" × ")}]. ${result.evidenceSummary}${suffix}`;
  }
  return `${result.matchedName} resolves to the canonical ${result.canonicalName} record, classified as ${result.matchedType.toLowerCase()}, with ${result.verification.toLowerCase()} verification. Appearance alone does not upgrade the claim.`;
}
