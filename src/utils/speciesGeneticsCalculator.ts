import type { MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { GeneticsCalculatorInput, GeneticsCalculatorResult } from "../types/genetics";
import { calculateSpeciesGeneticsForecast } from "../genetics/geneticsForecast.ts";

/** Compatibility entry point retained for existing imports. */
export function calculateSpeciesGenetics(input: GeneticsCalculatorInput, definitions: MasterMorphDefinition[], species?: string): GeneticsCalculatorResult {
  void definitions;
  const resolvedSpecies = species?.trim() || inferSpeciesFromDefinitions(definitions);
  return calculateSpeciesGeneticsForecast(resolvedSpecies, input);
}

function inferSpeciesFromDefinitions(definitions: MasterMorphDefinition[]): string {
  const source = definitions.find((definition) => definition.sourceLinks?.length)?.sourceLinks?.[0]?.url ?? "";
  const text = `${source} ${definitions.map((definition) => `${definition.name} ${definition.geneId}`).join(" ")}`.toLowerCase();
  if (text.includes("heterodon") || text.includes("arctic") || text.includes("conda")) return "Heterodon nasicus";
  if (text.includes("pantherophis") || text.includes("amel") || text.includes("motley") || text.includes("stripe")) return "Pantherophis guttatus";
  if (text.includes("python regius") || text.includes("ball python")) return "Python regius";
  return "";
}
