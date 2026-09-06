import type { Snake } from "../types/Snake";
import type { GeneticsCalculatorResult, OffspringComponent, OffspringResult, GeneticsCalculation } from "../types/genetics";
import { getMasterCalculatorMorphs, getMasterHetGenes } from "../data/masterMorphDatabase";
import { resolveStrictMorph } from "./geneticsIdentity";
import { calculateGenetics as calculateLegacyGenetics } from "./geneticsCalculator";
import { buildSnakeGenome, canonicalSpecies } from "../genetics/geneticsSnakeAdapter";
import { calculateBreeding as calculateCanonicalBreeding } from "../genetics/geneticsEngine";
import { GENETICS_DATABASE } from "../genetics/geneticsDatabase";
import type { LocusResult, OffspringOutcome } from "../genetics/geneticsModel";

const PROBABILITY_EPSILON = 0.000001;
const calculatorMorphIds = new Set(getMasterCalculatorMorphs().map((morph) => morph.geneId));
const calculatorHetIds = new Set(getMasterHetGenes().map((morph) => morph.geneId));

function percentage(value: unknown): "50%" | "66%" | "100%" {
  const normalised = String(value).replace(/\s/g, "");
  if (normalised === "50%" || normalised === "50") return "50%";
  if (normalised === "66%" || normalised === "66") return "66%";
  return "100%";
}

function eligibleVisual(value: string): string | null {
  const resolved = resolveStrictMorph(value);
  return resolved && calculatorMorphIds.has(resolved.geneId) ? resolved.geneId : null;
}

function eligibleHet(value: string): string | null {
  const resolved = resolveStrictMorph(value);
  return resolved && calculatorHetIds.has(resolved.geneId) ? resolved.geneId : null;
}

/** Legacy-compatible input used only when persisted data cannot yet be represented exactly by the canonical locus model. */
export function toBreedingParent(snake: Snake) {
  const visualMorphs = (snake.morphs ?? []).map(eligibleVisual).filter((value): value is string => Boolean(value));
  const hets = (snake.hets ?? [])
    .map((het) => {
      const source = het.geneId ?? het.gene;
      const gene = eligibleHet(source);
      return gene ? { gene, percentage: percentage(het.percentage) } : null;
    })
    .filter((value): value is { gene: string; percentage: "50%" | "66%" | "100%" } => Boolean(value));
  return { morphs: [...new Set(visualMorphs)], hets: hets.map((het) => het.gene), hetPercentages: Object.fromEntries(hets.map((het) => [het.gene, het.percentage])) };
}

function superDisplayName(geneId: string, copies: number): string | null {
  if (copies < 2) return null;
  const morph = getMasterCalculatorMorphs().find((entry) => entry.geneId === geneId);
  if (!morph?.superFormId) return null;
  return getMasterCalculatorMorphs().find((entry) => entry.geneId === morph.superFormId)?.name ?? null;
}

function adaptLegacyResult(result: GeneticsCalculatorResult): GeneticsCalculation {
  const outcomes = result.offspring.map((offspring) => {
    const visualMorphs = offspring.visualComponents.map((component) => superDisplayName(component.geneId, component.copies) ?? component.name).sort();
    const hets = offspring.hetComponents.map((component) => ({ geneId: component.geneId, name: component.name, percentage: "100%" as const })).sort((a, b) => a.name.localeCompare(b.name));
    return {
      probability: offspring.percentage / 100,
      visualMorphs,
      hets,
      geneStates: [...offspring.visualComponents, ...offspring.hetComponents].map((component) => ({ geneId: component.geneId, copies: component.copies, probability: offspring.percentage / 100 })),
    };
  });
  return { outcomes, totalProbability: outcomes.reduce((sum, outcome) => sum + outcome.probability, 0) };
}

function componentFromOutcome(outcome: OffspringOutcome): OffspringComponent | null {
  if (outcome.phenotypeStatus === "visual") {
    const allele = outcome.superForm ? outcome.paternalAlleleId : outcome.paternalAlleleId === "wild" ? outcome.maternalAlleleId : outcome.paternalAlleleId;
    const locus = GENETICS_DATABASE.loci.find((entry) => entry.id === outcome.locusId);
    const alleleDefinition = locus?.alleles.find((entry) => entry.id === allele);
    if (!locus || !alleleDefinition || alleleDefinition.isWildType) return null;
    return { geneId: alleleDefinition.id, name: outcome.superForm ? `Super ${alleleDefinition.name}` : alleleDefinition.name, copies: outcome.copiesByAllele[alleleDefinition.id] ?? 1, state: outcome.superForm ? "Super" : "Visual" };
  }
  if (outcome.phenotypeStatus === "heterozygous") {
    const locus = GENETICS_DATABASE.loci.find((entry) => entry.id === outcome.locusId);
    const alleleId = Object.keys(outcome.copiesByAllele).find((id) => locus?.alleles.find((allele) => allele.id === id && !allele.isWildType));
    const allele = locus?.alleles.find((entry) => entry.id === alleleId);
    return allele ? { geneId: allele.id, name: allele.name, copies: 1, state: "Het" } : null;
  }
  return null;
}

function combineCanonicalResults(results: LocusResult[], species: string): GeneticsCalculation {
  type Joint = { outcomes: OffspringOutcome[]; probability: number };
  let joints: Joint[] = [{ outcomes: [], probability: 1 }];

  for (const result of results) {
    const next: Joint[] = [];
    for (const joint of joints) {
      for (const outcome of result.outcomes) next.push({ outcomes: [...joint.outcomes, outcome], probability: joint.probability * outcome.probability });
    }
    joints = next;
  }

  const merged = new Map<string, OffspringResult>();
  for (const joint of joints) {
    const visualComponents = joint.outcomes.map(componentFromOutcome).filter((value): value is OffspringComponent => Boolean(value) && (value.state === "Visual" || value.state === "Super"));
    const hetComponents = joint.outcomes.map(componentFromOutcome).filter((value): value is OffspringComponent => Boolean(value) && value.state === "Het");
    const candidateLocusIds = new Set(joint.outcomes.filter((outcome) => outcome.phenotypeStatus === "visual" || outcome.superForm).map((outcome) => outcome.locusId));
    const combination = GENETICS_DATABASE.combinations.find((entry) => entry.species === species && entry.componentLocusIds.every((locusId) => candidateLocusIds.has(locusId)));
    const name = combination?.name ?? (visualComponents.length ? visualComponents.map((component) => component.name).join(" + ") : "Normal");
    const result: OffspringResult = {
      id: `${visualComponents.map((item) => `${item.geneId}:${item.copies}`).sort().join(",")}|${hetComponents.map((item) => item.geneId).sort().join(",")}`,
      name,
      percentage: joint.probability * 100,
      visualComponents: [...visualComponents].sort((a, b) => a.name.localeCompare(b.name)),
      hetComponents: [...hetComponents].sort((a, b) => a.name.localeCompare(b.name)),
      possibleHetComponents: [],
      recognisedCombination: Boolean(combination),
      combination: undefined,
      hasUnresolvedGenetics: joint.outcomes.some((outcome) => outcome.phenotypeStatus === "unresolved" || outcome.phenotypeStatus === "mixed_allelic"),
    };
    if (combination) {
      result.combination = getMasterCalculatorMorphs().find((morph) => morph.name.toLowerCase() === combination.name.toLowerCase());
    }
    const existing = merged.get(result.id);
    if (existing) {
      existing.percentage += result.percentage;
      existing.hasUnresolvedGenetics ||= result.hasUnresolvedGenetics;
    } else merged.set(result.id, result);
  }

  const outcomes = [...merged.values()].sort((a, b) => b.percentage - a.percentage);
  return { outcomes: outcomes.map((item) => ({ probability: item.percentage / 100, visualMorphs: item.visualComponents.map((component) => component.name), hets: item.hetComponents.map((component) => ({ geneId: component.geneId, name: component.name, percentage: "100%" as const })), geneStates: [...item.visualComponents, ...item.hetComponents].map((component) => ({ geneId: component.geneId, copies: component.copies, probability: item.percentage / 100 })) })), totalProbability: outcomes.reduce((sum, item) => sum + item.percentage / 100, 0) };
}

export function calculateBreedingGenetics(female: Snake, male: Snake): GeneticsCalculation {
  const canonicalFemale = buildSnakeGenome(female, GENETICS_DATABASE);
  const canonicalMale = buildSnakeGenome(male, GENETICS_DATABASE);

  if (canonicalSpecies(female.species) === canonicalSpecies(male.species) && canonicalFemale.supported && canonicalMale.supported) {
    const canonical = calculateCanonicalBreeding(canonicalFemale.genome, canonicalMale.genome, GENETICS_DATABASE);
    if (!canonical.warnings.length) {
      const adapted = combineCanonicalResults(canonical.results, canonicalFemale.genome.species);
      if (Number.isFinite(adapted.totalProbability) && Math.abs(adapted.totalProbability - 1) <= PROBABILITY_EPSILON) return adapted;
      throw new Error("Canonical breeding forecast failed its probability-integrity check.");
    }
  }

  const legacy = adaptLegacyResult(calculateLegacyGenetics({ female: toBreedingParent(female), male: toBreedingParent(male) }));
  return legacy;
}

export type BreedingGeneticsSnapshot = GeneticsCalculation & {
  calculatedAt: string;
  engine: "canonical-locus-genetics" | "legacy-evidence-gated-bridge";
  femaleId: string;
  maleId: string;
};

export function createBreedingGeneticsSnapshot(female: Snake, male: Snake): BreedingGeneticsSnapshot {
  const calculation = calculateBreedingGenetics(female, male);
  return {
    ...calculation,
    calculatedAt: new Date().toISOString(),
    engine: (() => {
      const f = buildSnakeGenome(female, GENETICS_DATABASE);
      const m = buildSnakeGenome(male, GENETICS_DATABASE);
      return f.supported && m.supported && canonicalSpecies(female.species) === canonicalSpecies(male.species) ? "canonical-locus-genetics" : "legacy-evidence-gated-bridge";
    })(),
    femaleId: female.id,
    maleId: male.id,
  };
}
