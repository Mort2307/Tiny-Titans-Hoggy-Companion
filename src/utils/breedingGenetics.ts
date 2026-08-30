import type { Snake } from "../types/Snake";
import { calculateGenetics, type GeneticsCalculation, type ParentGenetics } from "./geneticsEngine";

/**
 * Builds the genetics-engine input from the canonical Snake record.
 * This keeps Breeding Planner free of inheritance rules and ensures
 * breeding calculations use the same engine as the Genetics Calculator.
 */
export function toBreedingParent(snake: Snake): ParentGenetics {
  return {
    visualMorphs: snake.morphs ?? [],
    hets: (snake.hets ?? []).map((het) => ({
      gene: het.geneId ?? het.gene,
      percentage: String(het.percentage).endsWith("%")
        ? het.percentage as "50%" | "66%" | "100%"
        : `${het.percentage}%` as "50%" | "66%" | "100%",
    })),
  };
}

const PROBABILITY_EPSILON = 0.000001;

export function calculateBreedingGenetics(female: Snake, male: Snake): GeneticsCalculation {
  const calculation = calculateGenetics(toBreedingParent(female), toBreedingParent(male));
  if (!Number.isFinite(calculation.totalProbability) || Math.abs(calculation.totalProbability - 1) > PROBABILITY_EPSILON) {
    throw new Error("Breeding forecast failed its probability-integrity check. No incomplete genetic forecast was shown.");
  }
  return calculation;
}

export type BreedingGeneticsSnapshot = GeneticsCalculation & {
  calculatedAt: string;
  engine: "geneticsEngine";
  femaleId: string;
  maleId: string;
};

export function createBreedingGeneticsSnapshot(female: Snake, male: Snake): BreedingGeneticsSnapshot {
  return {
    ...calculateBreedingGenetics(female, male),
    calculatedAt: new Date().toISOString(),
    engine: "geneticsEngine",
    femaleId: female.id,
    maleId: male.id,
  };
}
