import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { GeneticsCalculatorInput, GeneticsCalculatorResult, HetPercentage, OffspringComponent, OffspringResult, ParentGenetics } from "../types/genetics";
import { calculateGeneticsV3 } from "./geneticsEngineV3";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";

function normaliseHetPercentage(value: HetPercentage | undefined): "100%" | "66%" | "50%" {
  if (value === 50 || value === "50%") return "50%";
  if (value === 66 || value === "66%") return "66%";
  return "100%";
}

function toV3Parent(parent: ParentGenetics, speciesId: string) {
  return {
    speciesId,
    visualMorphs: parent.morphs,
    hets: parent.hets.map((gene) => ({ gene, percentage: normaliseHetPercentage(parent.hetPercentages?.[gene]) })),
    ...(parent.knownGeneCopies ? { knownGeneCopies: parent.knownGeneCopies } : {}),
  };
}

function getDefinition(definitions: MasterMorphDefinition[], geneId: string): MasterMorphDefinition | undefined { return definitions.find((definition) => definition.geneId === geneId); }

function copyCountState(definition: MasterMorphDefinition | undefined, copies: number): OffspringComponent["state"] {
  if (copies === 0) return "Clear";
  if (definition?.inheritance === "Recessive") return copies === 2 ? "Visual" : "Het";
  if (definition?.inheritance === "Incomplete Dominant") return copies === 2 ? "Super" : "Visual";
  if (definition?.inheritance === "Dominant") return "Visual";
  return "Unknown";
}

function mapV3Outcome(outcome: ReturnType<typeof calculateGeneticsV3>["outcomes"][number], definitions: MasterMorphDefinition[], index: number): OffspringResult {
  const visualComponents: OffspringComponent[] = [];
  const hetComponents: OffspringComponent[] = [];
  for (const state of outcome.geneStates) {
    const definition = getDefinition(definitions, state.geneId);
    const component: OffspringComponent = { geneId: state.geneId, name: definition?.name ?? state.geneId, copies: state.copies, state: copyCountState(definition, state.copies) };
    if (component.state === "Visual" || component.state === "Super") visualComponents.push(component);
    if (component.state === "Het") hetComponents.push(component);
  }
  const knownVisuals = outcome.visualMorphs.map((geneId) => (calculatorNamedCombinations.find((entry) => entry.geneId === geneId) ?? getDefinition(definitions, geneId))?.name ?? geneId);
  const name = [...knownVisuals, ...(outcome.phenotypes ?? [])].join(" + ") || "Normal";
  const combination = outcome.visualMorphs.map((geneId) => calculatorNamedCombinations.find((entry) => entry.geneId === geneId && entry.kind === "Combination")).find(Boolean);
  const probability = outcome.probability === undefined ? undefined : outcome.probability * 100;
  const probabilityRange = outcome.probabilityRange ? { min: outcome.probabilityRange.min * 100, max: outcome.probabilityRange.max * 100 } : undefined;
  return {
    id: `${outcome.visualMorphs.slice().sort().join(",")}|${outcome.phenotypes.slice().sort().join(",")}|${outcome.geneStates.map((state) => `${state.geneId}:${state.copies}`).sort().join(",")}|${index}`,
    name,
    ...(probability === undefined ? {} : { percentage: probability }),
    ...(probabilityRange ? { probabilityRange } : {}),
    certainty: outcome.certainty,
    ...(outcome.genotypeScenarios?.length ? { genotypeScenarioLabels: outcome.genotypeScenarios.map((scenario) => scenario.label) } : {}),
    visualComponents,
    hetComponents,
    possibleHetComponents: [],
    recognisedCombination: Boolean(combination),
    ...(combination ? { combination } : {}),
    hasUnresolvedGenetics: outcome.certainty === "bounded",
  };
}

/** Legacy overload retained for compatibility; speciesId must be supplied by the caller through the explicit V3 entry point below. */
export function calculateSpeciesGenetics(input: GeneticsCalculatorInput, definitions: MasterMorphDefinition[]): GeneticsCalculatorResult {
  return { input, offspring: [], hasUnresolvedGenetics: true };
}

export function calculateSpeciesGeneticsForSpecies(speciesId: string, input: GeneticsCalculatorInput, definitions: MasterMorphDefinition[]): GeneticsCalculatorResult {
  const v3 = calculateGeneticsV3(toV3Parent(input.female, speciesId), toV3Parent(input.male, speciesId));
  return {
    input,
    offspring: v3.outcomes.map((outcome, index) => mapV3Outcome(outcome, definitions, index)),
    hasUnresolvedGenetics: v3.diagnostics.length > 0 || v3.outcomes.some((outcome) => outcome.certainty === "bounded"),
  };
}
