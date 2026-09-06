import { calculatorNamedCombinations, componentSignature, findCalculatorNamedCombination, normaliseComboName } from "../../data/geneticsComboRegistry";
import { morphs, type MorphComponent, type MorphDefinition, type VerificationStatus } from "../../data/morphs";

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

function toResult(morph: MorphDefinition, commonCombinationName?: string): GeneticsSearchResult {
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
  };
}

/**
 * Evidence-aware lookup for keeper-facing genetics search.
 * Display aliases are lookup paths only; the canonical morph/component data
 * remains the source of truth for genetic calculations.
 */
export function searchGeneticsIntelligence(query: string): GeneticsSearchResult[] {
  const normalised = normaliseComboName(query);
  if (!normalised) return [];

  const named = findCalculatorNamedCombination(query);
  if (named) {
    const result = toResult(named, named.isCombination ? named.name : undefined);
    return [result, ...findRelatedComponents(named).map((morph) => toResult(morph)).slice(0, 4)];
  }

  const exact = morphs.filter((morph) =>
    normaliseComboName(morph.name) === normalised ||
    morph.aliases?.some((alias) => normaliseComboName(alias) === normalised),
  );
  if (exact.length) return exact.map((morph) => toResult(morph));

  const ranked = morphs
    .map((morph) => {
      const haystack = [morph.name, ...(morph.aliases ?? []), morph.geneId].map(normaliseComboName);
      const score = haystack.reduce((best, value) => {
        if (value === normalised) return 100;
        if (value.startsWith(normalised)) return Math.max(best, 80);
        if (value.includes(normalised)) return Math.max(best, 60);
        const tokens = normalised.split(" ").filter(Boolean);
        const matched = tokens.filter((token) => value.includes(token)).length;
        return Math.max(best, tokens.length ? Math.round((matched / tokens.length) * 50) : 0);
      }, 0);
      return { morph, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ morph }) => toResult(morph));

  return ranked;
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
