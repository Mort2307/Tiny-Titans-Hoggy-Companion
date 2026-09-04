import type { Snake } from "../types/Snake";
import { getMasterCalculatorMorphs, getMasterHetGenes } from "../data/masterMorphDatabase";
import { resolveStrictMorph } from "./geneticsIdentity";
import { calculateGenetics, type GeneticsCalculatorResult } from "./geneticsCalculator";
import type { GeneticsCalculation, ParentGenetics } from "./geneticsEngine";

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

/**
 * Converts a persisted Snake into the same evidence-gated input used by the
 * Genetics Calculator. Legacy or uncertain morph records are deliberately
 * excluded instead of being silently promoted into breeding predictions.
 */
export function toBreedingParent(snake: Snake): ParentGenetics {
  const visualMorphs = (snake.morphs ?? [])
    .map(eligibleVisual)
    .filter((value): value is string => Boolean(value));

  const hets = (snake.hets ?? [])
    .map((het) => {
      const source = het.geneId ?? het.gene;
      const gene = eligibleHet(source);
      return gene ? { gene, percentage: percentage(het.percentage) } : null;
    })
    .filter((value): value is { gene: string; percentage: "50%" | "66%" | "100%" } => Boolean(value));

  return { visualMorphs: [...new Set(visualMorphs)], hets };
}

function superDisplayName(geneId: string, copies: number): string | null {
  if (copies < 2) return null;
  const morph = getMasterCalculatorMorphs().find((entry) => entry.geneId === geneId);
  if (!morph?.superFormId) return null;
  return getMasterCalculatorMorphs().find((entry) => entry.geneId === morph.superFormId)?.name ?? null;
}

function adaptCalculatorResult(result: GeneticsCalculatorResult): GeneticsCalculation {
  const outcomes = result.offspring.map((offspring) => {
    const visualMorphs = offspring.visualComponents.map((component) =>
      superDisplayName(component.geneId, component.copies) ?? component.name,
    ).sort();

    const hets = offspring.hetComponents.map((component) => ({
      geneId: component.geneId,
      name: component.name,
      percentage: "100%" as const,
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      probability: offspring.percentage / 100,
      visualMorphs,
      hets,
      geneStates: [
        ...offspring.visualComponents,
        ...offspring.hetComponents,
      ].map((component) => ({
        geneId: component.geneId,
        copies: component.copies,
        probability: offspring.percentage / 100,
      })),
    };
  });

  const totalProbability = outcomes.reduce((sum, outcome) => sum + outcome.probability, 0);
  return {
    outcomes,
    totalProbability,
  };
}

export function calculateBreedingGenetics(female: Snake, male: Snake): GeneticsCalculation {
  const calculatorResult = calculateGenetics({
    female: {
      morphs: toBreedingParent(female).visualMorphs,
      hets: toBreedingParent(female).hets.map((het) => het.gene),
      hetPercentages: Object.fromEntries(toBreedingParent(female).hets.map((het) => [het.gene, het.percentage])),
    },
    male: {
      morphs: toBreedingParent(male).visualMorphs,
      hets: toBreedingParent(male).hets.map((het) => het.gene),
      hetPercentages: Object.fromEntries(toBreedingParent(male).hets.map((het) => [het.gene, het.percentage])),
    },
  });

  const calculation = adaptCalculatorResult(calculatorResult);
  if (!Number.isFinite(calculation.totalProbability) || Math.abs(calculation.totalProbability - 1) > PROBABILITY_EPSILON) {
    throw new Error("Breeding forecast failed its probability-integrity check. No incomplete genetic forecast was shown.");
  }
  return calculation;
}

export type BreedingGeneticsSnapshot = GeneticsCalculation & {
  calculatedAt: string;
  engine: "evidence-gated-genetics-calculator";
  femaleId: string;
  maleId: string;
};

export function createBreedingGeneticsSnapshot(female: Snake, male: Snake): BreedingGeneticsSnapshot {
  return {
    ...calculateBreedingGenetics(female, male),
    calculatedAt: new Date().toISOString(),
    engine: "evidence-gated-genetics-calculator",
    femaleId: female.id,
    maleId: male.id,
  };
}
