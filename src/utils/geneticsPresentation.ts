import type { MorphDefinition } from "../data/morphs";
import type { OffspringComponent, OffspringResult } from "../types/genetics";
import { expandMorphToComponents } from "./morphResolver";

export type GeneticsSignatureEntry = {
  geneId: string;
  name: string;
  copies: number;
};

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

  return Array.from(byGene.entries())
    .map(([geneId, copies]) => ({ geneId, name: names.get(geneId) ?? geneId, copies }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function signatureFromDefinition(definition: MorphDefinition): GeneticsSignatureEntry[] {
  const expanded = expandMorphToComponents(definition);
  const byGene = new Map<string, number>();
  const names = new Map<string, string>();

  for (const component of expanded) {
    byGene.set(component.morphId, (byGene.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }

  return Array.from(byGene.entries())
    .map(([geneId, copies]) => {
      const name = expanded.find((component) => component.morphId === geneId)?.morphId ?? geneId;
      names.set(geneId, name);
      return { geneId, name, copies };
    })
    .map((entry) => ({
      ...entry,
      name: definition.components?.find((component) => component.morphId === entry.geneId)?.morphId
        ?? entry.name,
    }));
}

function canonicalNameForLocus(geneId: string, copies: number, morphs: MorphDefinition[]): string {
  const gene = morphs.find((morph) => morph.geneId === geneId);
  if (!gene) return geneId;

  if (gene.inheritance === "Incomplete Dominant" && copies >= 2) {
    const superForm = morphs.find(
      (morph) => morph.kind === "Super" && morph.superFormId === geneId,
    );
    if (superForm) return superForm.name;
  }

  return gene.name;
}

function makeSignatureKey(signature: GeneticsSignatureEntry[]): string {
  return signature
    .map((entry) => `${entry.geneId}:${entry.copies}`)
    .sort()
    .join("|");
}

function sortCombinations(a: MorphDefinition, b: MorphDefinition): number {
  const verificationRank = (value: MorphDefinition["verification"]): number => {
    if (value === "Confirmed") return 0;
    if (value === "Recognised") return 1;
    if (value === "Unverified") return 2;
    return 3;
  };

  const rankDelta = verificationRank(a.verification) - verificationRank(b.verification);
  if (rankDelta !== 0) return rankDelta;

  const componentDelta = (b.components?.length ?? 0) - (a.components?.length ?? 0);
  if (componentDelta !== 0) return componentDelta;

  return a.name.localeCompare(b.name);
}

function definitionSignatureKey(definition: MorphDefinition): string {
  const signature = signatureFromDefinition(definition);
  return makeSignatureKey(signature);
}

export function getCanonicalOffspringPresentation(
  result: OffspringResult,
  morphs: MorphDefinition[],
): CanonicalOffspringPresentation {
  const signature = signatureFromComponents(result.visualComponents);
  const signatureKey = makeSignatureKey(signature);

  const recognised = morphs
    .filter(
      (morph) =>
        morph.kind === "Combination" || morph.isCombination === true,
    )
    .filter((morph) => definitionSignatureKey(morph) === signatureKey)
    .sort(sortCombinations);

  const recognisedCombination = recognised[0];

  if (recognisedCombination) {
    return {
      name: recognisedCombination.name,
      recognisedCombination,
      alternateRecognisedCombinations: recognised.slice(1),
      signature: signature.map((entry) => ({
        ...entry,
        name: canonicalNameForLocus(entry.geneId, entry.copies, morphs),
      })),
      signatureKey,
    };
  }

  const fallbackName = signature.length
    ? signature
        .map((entry) => canonicalNameForLocus(entry.geneId, entry.copies, morphs))
        .join(" + ")
    : "Wild Type";

  return {
    name: fallbackName,
    alternateRecognisedCombinations: [],
    signature: signature.map((entry) => ({
      ...entry,
      name: canonicalNameForLocus(entry.geneId, entry.copies, morphs),
    })),
    signatureKey,
  };
}
