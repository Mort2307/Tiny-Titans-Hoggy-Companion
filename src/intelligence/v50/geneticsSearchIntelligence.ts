import { calculatorNamedCombinations, componentSignature, findCalculatorNamedCombination, normaliseComboName } from "../../data/geneticsComboRegistry";
import { morphs, type MorphComponent, type MorphDefinition, type VerificationStatus } from "../../data/morphs";
import { searchGenetics } from "./geneticsSearchEngine";

export interface GeneticsSearchResult {
  matchedName: string;
  matchedType: MorphDefinition["kind"];
  recognised: boolean;
  verification: VerificationStatus;
  canonicalComponents: string[];
  commonCombinationName?: string;
  description: string;
  educationalNotes?: string;
  confidence: "High" | "Moderate" | "Low";
  matchKind?: "canonical" | "alias" | "combination" | "fuzzy";
}

function displayComponent(component: MorphComponent): string {
  const copies = component.copies ?? 1;
  return copies === 2 ? `2 copies ${component.morphId}` : `${copies} copy ${component.morphId}`;
}

function confidenceFor(verification: VerificationStatus, isCombination: boolean): GeneticsSearchResult["confidence"] {
  if (verification === "Confirmed") return "High";
  if (verification === "Recognised" && isCombination) return "High";
  if (verification === "Recognised") return "Moderate";
  return "Low";
}

function toResult(morph: MorphDefinition, commonCombinationName?: string, matchKind?: GeneticsSearchResult["matchKind"]): GeneticsSearchResult {
  return {
    matchedName: morph.name,
    matchedType: morph.kind,
    recognised: morph.verification === "Confirmed" || morph.verification === "Recognised",
    verification: morph.verification,
    canonicalComponents: (morph.components ?? []).map(displayComponent),
    commonCombinationName,
    description: morph.description ?? "No description is currently recorded.",
    educationalNotes: morph.educationalNotes,
    confidence: confidenceFor(morph.verification, Boolean(morph.isCombination)),
    matchKind,
  };
}

/**
 * Evidence-aware lookup for keeper-facing genetics search. The canonical
 * search engine resolves names/aliases; this adapter adds presentation and
 * evidence metadata without changing genetic records.
 */
export function searchGeneticsIntelligence(query: string): GeneticsSearchResult[] {
  const normalised = normaliseComboName(query);
  if (!normalised) return [];
  const matches = searchGenetics(query);
  return matches.map((match) => toResult(match.record, match.record.isCombination ? match.record.name : undefined, match.matchKind));
}

function findRelatedComponents(combination: MorphDefinition): MorphDefinition[] {
  const ids = new Set((combination.components ?? []).map((component) => component.morphId));
  const candidates = morphs.filter((morph) => ids.has(morph.geneId));
  const componentMatches = calculatorNamedCombinations.filter((candidate) => {
    const a = componentSignature(candidate.components ?? []);
    const b = componentSignature(combination.components ?? []);
    return a === b;
  });
  return [...candidates, ...componentMatches.filter((candidate) => candidate.geneId !== combination.geneId)];
}

export function explainGeneticsSearch(query: string): string {
  const result = searchGeneticsIntelligence(query)[0];
  if (!result) return "No confirmed or recognised genetics record matched that search.";
  if (result.commonCombinationName) {
    return `${result.matchedName} is recorded as a recognised ${result.matchedType.toLowerCase()} rather than a separate locus. ${result.canonicalComponents.join(" + ")}. Evidence status: ${result.verification}.`;
  }
  return `${result.matchedName} is recorded as ${result.matchedType.toLowerCase()} with ${result.verification.toLowerCase()} verification. The result is kept separate from any appearance-only assumption.`;
}
