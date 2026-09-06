import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { GeneticsCalculatorInput, GeneticsCalculatorResult, OffspringComponent, OffspringResult, ParentGenetics } from "../types/genetics";
import { calculateGeneticsV3 } from "./geneticsEngineV3";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";

function toV3Parent(parent: ParentGenetics, speciesId: string) {
  return {
    speciesId,
    visualMorphs: parent.morphs,
    hets: parent.hets.map((gene) => ({ gene, percentage: normaliseHetPercentage(parent.hetPercentages?.[gene]) })),
  };
}

function normaliseHetPercentage(value: ParentGenetics["hetPercentages"] extends Record<string, infer V> ? V : never): "100%" | "66%" | "50%" {
  if (value === 50 || value === "50%") return "50%";
  if (value === 66 || value === "66%") return "66%";
  return "100%";
}

function getDefinition(definitions: MasterMorphDefinition[], geneId: string): MasterMorphDefinition | undefined {
  return definitions.find((definition) => definition.geneId === geneId);
}

function copyCountState(definition: MasterMorphDefinition | undefined, copies: number): OffspringComponent["state"] {
  if (copies === 0) return "Clear";
  if (definition?.inheritance === "Recessive") return copies === 2 ? "Visual" : "Het";
  if (definition?.inheritance === "Incomplete Dominant") return copies === 2 ? "Super" : "Visual";
  if (definition?.inheritance === "Dominant") return "Visual";
  return "Unknown";
}

function mapV3Outcome(
  outcome: ReturnType<typeof calculateGeneticsV3>["outcomes"][number],
  definitions: MasterMorphDefinition[],
  index: number,
): OffspringResult {
  const visualComponents: OffspringComponent[] = [];
  const hetComponents: OffspringComponent[] = [];
  for (const state of outcome.geneStates) {
    const definition = getDefinition(definitions, state.geneId);
    const component: OffspringComponent = {
      geneId: state.geneId,
      name: definition?.name ?? state.geneId,
      copies: state.copies,
      state: copyCountState(definition, state.copies),
    };
    if (component.state === "Visual" || component.state === "Super") visualComponents.push(component);
    if (component.state === "Het") hetComponents.push(component);
  }

  const knownVisuals = [...outcome.visualMorphs].map((geneId) => {
    const definition = calculatorNamedCombinations.find((entry) => entry.geneId === geneId) ?? getDefinition(definitions, geneId);
    return definition?.name ?? geneId;
  });
  const phenotypeLabels = outcome.phenotypes ?? [];
  const name = [...knownVisuals, ...phenotypeLabels].join(" + ") || "Normal";
  const combination = knownVisuals.length === 1
    ? calculatorNamedCombinations.find((entry) => entry.geneId === outcome.visualMorphs[0] && entry.kind === "Combination")
    : undefined;

  const scenarioLabels = outcome.genotypeScenarios?.map((scenario) => scenario.label) ?? [];
  const probability = outcome.probability === undefined ? undefined : outcome.probability * 100;
  const probabilityRange = outcome.probabilityRange ? {
    min: outcome.probabilityRange.min * 100,
    max: outcome.probabilityRange.max * 100,
  } : undefined;
  const id = `${outcome.visualMorphs.slice().sort().join(",")}|${outcome.phenotypes.slice().sort().join(",")}|${outcome.geneStates.map((state) => `${state.geneId}:${state.copies}`).sort().join(",")}|${index}`;

  return {
    id,
    name,
    ...(probability === undefined ? {} : { percentage: probability }),
    ...(probabilityRange ? { probabilityRange } : {}),
    certainty: outcome.certainty,
    ...(scenarioLabels.length ? { genotypeScenarioLabels: scenarioLabels } : {}),
    visualComponents,
    hetComponents,
    possibleHetComponents: [],
    recognisedCombination: Boolean(combination),
    ...(combination ? { combination } : {}),
    hasUnresolvedGenetics: outcome.certainty === "bounded",
  };
}

/**
 * Species calculator adapter. V3 is now the authoritative species engine;
 * this function keeps the existing UI contract while exposing bounded states
 * without inventing an overall probability.
 */
export function calculateSpeciesGenetics(input: GeneticsCalculatorInput, definitions: MasterMorphDefinition[]): GeneticsCalculatorResult {
  const speciesId = definitions.length > 0 ? inferSpeciesIdFromDefinitions(definitions) : undefined;
  if (!speciesId) {
    return { input, offspring: [], hasUnresolvedGenetics: true };
  }
  const v3 = calculateGeneticsV3(toV3Parent(input.female, speciesId), toV3Parent(input.male, speciesId));
  return {
    input,
    offspring: v3.outcomes.map((outcome, index) => mapV3Outcome(outcome, definitions, index)),
    hasUnresolvedGenetics: v3.diagnostics.length > 0 || v3.outcomes.some((outcome) => outcome.certainty === "bounded"),
  };
}

/** Definitions are species-scoped by the caller. The metadata marker below is
 * added to avoid making this adapter guess taxonomy from a morph name. */
export function calculateSpeciesGeneticsForSpecies(
  speciesId: string,
  input: GeneticsCalculatorInput,
  definitions: MasterMorphDefinition[],
): GeneticsCalculatorResult {
  const v3 = calculateGeneticsV3(toV3Parent(input.female, speciesId), toV3Parent(input.male, speciesId));
  return {
    input,
    offspring: v3.outcomes.map((outcome, index) => mapV3Outcome(outcome, definitions, index)),
    hasUnresolvedGenetics: v3.diagnostics.length > 0 || v3.outcomes.some((outcome) => outcome.certainty === "bounded"),
  };
}

function inferSpeciesIdFromDefinitions(definitions: MasterMorphDefinition[]): string | undefined {
  const marker = definitions.find((definition) => definition.geneId.startsWith("species:"));
  return marker?.geneId.slice("species:".length) || undefined;
}
