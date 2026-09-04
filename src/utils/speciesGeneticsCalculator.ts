import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { GeneticsCalculatorInput, GeneticsCalculatorResult, OffspringComponent, OffspringResult, ParentGenetics } from "../types/genetics";

function parentAlleleProbability(parent: ParentGenetics, geneId: string, definition: MasterMorphDefinition): number {
  if (parent.morphs.includes(geneId)) return definition.inheritance === "Recessive" ? 1 : 0.5;
  if (!parent.hets.includes(geneId)) return 0;
  const percentage = parent.hetPercentages?.[geneId] ?? "100%";
  if (percentage === "66%" || percentage === 66) return 1 / 3;
  if (percentage === "50%" || percentage === 50) return 1 / 4;
  return 1 / 2;
}

function inheritanceState(definition: MasterMorphDefinition, copies: number): OffspringComponent["state"] {
  if (copies === 0) return "Clear";
  if (definition.inheritance === "Recessive") return copies === 2 ? "Visual" : "Het";
  if (definition.inheritance === "Incomplete Dominant") return copies === 2 ? "Super" : "Visual";
  if (definition.inheritance === "Dominant") return "Visual";
  return "Unknown";
}

function makeResult(genes: MasterMorphDefinition[], copies: Map<string, number>, probability: number): OffspringResult {
  const visualComponents: OffspringComponent[] = [];
  const hetComponents: OffspringComponent[] = [];
  for (const definition of genes) {
    const count = copies.get(definition.geneId) ?? 0;
    const component: OffspringComponent = {
      geneId: definition.geneId,
      name: definition.name,
      copies: count,
      state: inheritanceState(definition, count),
    };
    if (component.state === "Visual" || component.state === "Super") visualComponents.push(component);
    if (component.state === "Het") hetComponents.push(component);
  }
  visualComponents.sort((a, b) => a.name.localeCompare(b.name));
  hetComponents.sort((a, b) => a.name.localeCompare(b.name));
  const name = visualComponents.length
    ? visualComponents.map((item) => item.state === "Super" ? `Super ${item.name}` : item.name).join(" + ")
    : "Normal";
  const id = [...visualComponents, ...hetComponents].map((item) => `${item.geneId}:${item.copies}`).sort().join(",") || "normal";
  return {
    id,
    name,
    percentage: probability,
    visualComponents,
    hetComponents,
    possibleHetComponents: [],
    recognisedCombination: false,
    hasUnresolvedGenetics: false,
  };
}

export function calculateSpeciesGenetics(input: GeneticsCalculatorInput, definitions: MasterMorphDefinition[]): GeneticsCalculatorResult {
  const genes = definitions.filter((definition) => definition.isGene && ["Recessive", "Incomplete Dominant", "Dominant"].includes(definition.inheritance));
  let outcomes: Array<{ copies: Map<string, number>; probability: number }> = [{ copies: new Map(), probability: 100 }];

  for (const definition of genes) {
    const femaleP = Math.min(1, Math.max(0, parentAlleleProbability(input.female, definition.geneId, definition)));
    const maleP = Math.min(1, Math.max(0, parentAlleleProbability(input.male, definition.geneId, definition)));
    const locus = [
      [0, (1 - femaleP) * (1 - maleP)],
      [1, femaleP * (1 - maleP) + (1 - femaleP) * maleP],
      [2, femaleP * maleP],
    ].filter(([, probability]) => Number(probability) > 0) as Array<[number, number]>;
    const next: Array<{ copies: Map<string, number>; probability: number }> = [];
    for (const existing of outcomes) for (const [copies, probability] of locus) {
      const map = new Map(existing.copies);
      map.set(definition.geneId, copies);
      next.push({ copies: map, probability: existing.probability * probability });
    }
    outcomes = next;
  }

  const merged = new Map<string, OffspringResult>();
  for (const outcome of outcomes) {
    const result = makeResult(genes, outcome.copies, outcome.probability);
    const existing = merged.get(result.id);
    if (existing) existing.percentage += result.percentage;
    else merged.set(result.id, result);
  }
  return {
    input,
    offspring: [...merged.values()].sort((a, b) => b.percentage - a.percentage),
    hasUnresolvedGenetics: false,
  };
}
