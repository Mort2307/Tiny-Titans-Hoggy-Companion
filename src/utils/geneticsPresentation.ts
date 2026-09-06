import type { MorphDefinition } from "../data/morphs";
import type { OffspringComponent, OffspringResult } from "../types/genetics";
import { expandMorphToComponents } from "./morphResolver";
import { calculatorNamedCombinations, componentSignature } from "../data/geneticsComboRegistry";

export type GeneticsSignatureEntry = { geneId: string; name: string; copies: number };
export type CanonicalOffspringPresentation = {
  name: string;
  recognisedCombination?: MorphDefinition;
  alternateRecognisedCombinations: MorphDefinition[];
  signature: GeneticsSignatureEntry[];
  signatureKey: string;
};

function signatureFromComponents(components: OffspringComponent[]): GeneticsSignatureEntry[] {
  const byGene = new Map<string, number>();
  const names = new Map<string, string>();
  for (const component of components) {
    byGene.set(component.geneId, (byGene.get(component.geneId) ?? 0) + component.copies);
    names.set(component.geneId, component.name);
  }
  return Array.from(byGene.entries()).map(([geneId, copies]) => ({ geneId, name: names.get(geneId) ?? geneId, copies })).sort((a, b) => a.name.localeCompare(b.name));
}

function canonicalNameForLocus(geneId: string, copies: number, morphs: MorphDefinition[]): string {
  const gene = morphs.find((morph) => morph.geneId === geneId);
  if (!gene) return geneId;
  if (gene.inheritance === "Incomplete Dominant" && copies >= 2) {
    const superForm = morphs.find((morph) => morph.kind === "Super" && morph.superFormId === geneId);
    if (superForm) return superForm.name;
  }
  return gene.name;
}

function makeSignatureKey(signature: GeneticsSignatureEntry[]): string { return signature.map((entry) => `${entry.geneId}:${entry.copies}`).sort().join("|"); }
function sortCombinations(a: MorphDefinition, b: MorphDefinition): number {
  const verificationRank = (value: MorphDefinition["verification"]): number => value === "Confirmed" ? 0 : value === "Recognised" ? 1 : value === "Unverified" ? 2 : 3;
  return verificationRank(a.verification) - verificationRank(b.verification) || (b.components?.length ?? 0) - (a.components?.length ?? 0) || a.name.localeCompare(b.name);
}
function definitionSignatureKey(definition: MorphDefinition): string { return componentSignature(expandMorphToComponents(definition)); }
function getRecognisedCombinations(morphs: MorphDefinition[]): MorphDefinition[] {
  const bySignature = new Map<string, MorphDefinition[]>();
  for (const morph of [...morphs, ...calculatorNamedCombinations]) {
    if (!(morph.kind === "Combination" || morph.isCombination === true)) continue;
    const key = definitionSignatureKey(morph);
    const group = bySignature.get(key) ?? [];
    if (!group.some((candidate) => candidate.geneId === morph.geneId)) group.push(morph);
    bySignature.set(key, group);
  }
  return [...bySignature.values()].flat();
}

export function getCanonicalOffspringPresentation(result: OffspringResult, morphs: MorphDefinition[]): CanonicalOffspringPresentation {
  const signature = signatureFromComponents(result.visualComponents);
  const signatureKey = makeSignatureKey(signature);
  const recognised = getRecognisedCombinations(morphs).filter((morph) => definitionSignatureKey(morph) === signatureKey).sort(sortCombinations);
  const recognisedCombination = recognised[0];
  const displaySignature = signature.map((entry) => ({ ...entry, name: canonicalNameForLocus(entry.geneId, entry.copies, morphs) }));

  if (result.recognisedCombinationName) {
    const databaseMorph = recognised.find((morph) => morph.name === result.recognisedCombinationName);
    return {
      name: result.recognisedCombinationName,
      recognisedCombination: databaseMorph ?? recognisedCombination,
      alternateRecognisedCombinations: recognised.filter((morph) => morph.name !== result.recognisedCombinationName),
      signature: displaySignature,
      signatureKey,
    };
  }

  if (recognisedCombination) return { name: recognisedCombination.name, recognisedCombination, alternateRecognisedCombinations: recognised.slice(1), signature: displaySignature, signatureKey };
  return { name: displaySignature.length ? displaySignature.map((entry) => entry.name).join(" + ") : "Wild Type", alternateRecognisedCombinations: [], signature: displaySignature, signatureKey };
}
