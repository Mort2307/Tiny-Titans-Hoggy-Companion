import { masterMorphs, resolveMasterMorph, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { MorphDefinition, MorphComponent } from "../data/morphs";

export type GeneticIdentity = { geneId: string; name: string; morph: MorphDefinition };
export type UnderlyingGeneIdentity = { geneId: string; name: string; copies: number; morph: MorphDefinition };
export type HetPercentage = "100%" | "66%" | "50%";
export type HetIdentity = { geneId: string; name: string; percentage: HetPercentage };

export function normaliseGeneticsValue(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[×✕]/g, "x").replace(/\s+/g, " ");
}

export function resolveStrictMorph(value: string, options?: MorphDefinition[]): MorphDefinition | undefined {
  const query = normaliseGeneticsValue(value);
  const source = options ?? masterMorphs;
  return source.find((morph) => normaliseGeneticsValue(morph.geneId) === query || normaliseGeneticsValue(morph.name) === query)
    ?? (options ? undefined : resolveMasterMorph(value));
}

export function resolveMorphInput(value: string): MasterMorphDefinition | undefined { return resolveMasterMorph(value); }
export function getGeneticIdentity(morph: MorphDefinition): GeneticIdentity { return { geneId: morph.geneId, name: morph.name, morph }; }
export function resolveGeneticIdentity(value: string, options?: MorphDefinition[]): GeneticIdentity | undefined { const morph = resolveStrictMorph(value, options); return morph ? getGeneticIdentity(morph) : undefined; }
export function resolveCanonicalGeneticIdentity(value: string): GeneticIdentity | undefined { const morph = resolveMasterMorph(value); return morph ? getGeneticIdentity(morph) : undefined; }
export function sameMorphIdentity(first: string, second: string, options?: MorphDefinition[]): boolean {
  const a = resolveStrictMorph(first, options); const b = resolveStrictMorph(second, options);
  return a && b ? a.geneId === b.geneId : normaliseGeneticsValue(first) === normaliseGeneticsValue(second);
}
export function getGeneId(value: string, options?: MorphDefinition[]): string | undefined { return resolveStrictMorph(value, options)?.geneId; }
export function getCanonicalMorphName(value: string, options?: MorphDefinition[]): string { return resolveStrictMorph(value, options)?.name ?? value; }

export function resolveUnderlyingGeneIdentities(value: string): UnderlyingGeneIdentity[] {
  const morph = resolveMasterMorph(value);
  if (!morph?.geneticSignature) return [];
  return morph.geneticSignature.split("|").filter(Boolean).map((part) => {
    const [geneId, copiesText] = part.split(":");
    const copies = Math.max(1, Number(copiesText) || 1);
    const resolved = masterMorphs.find((entry) => entry.geneId === geneId);
    return { geneId, name: resolved?.name ?? geneId, copies, morph: resolved ?? morph };
  });
}

export function resolveUnderlyingGeneComponents(value: string): MorphComponent[] {
  return resolveUnderlyingGeneIdentities(value).map(({ geneId, copies }) => ({ morphId: geneId, type: "Gene", copies }));
}

export function getUnderlyingGeneIdentities(value: string): UnderlyingGeneIdentity[] { return resolveUnderlyingGeneIdentities(value); }
export function getUnderlyingGeneMap(value: string): Map<string, number> { return new Map(resolveUnderlyingGeneIdentities(value).map((gene) => [gene.geneId, gene.copies])); }
export function getGeneCopies(morphValue: string, geneId: string): number { return getUnderlyingGeneMap(morphValue).get(geneId) ?? 0; }
export function isIndependentGene(value: string, options?: MorphDefinition[]): boolean { const morph = resolveStrictMorph(value, options); return Boolean(morph?.isGene && morph.kind === "Gene"); }
export function isSuperForm(value: string, options?: MorphDefinition[]): boolean { return resolveStrictMorph(value, options)?.kind === "Super"; }
export function isCombination(value: string, options?: MorphDefinition[]): boolean { return resolveStrictMorph(value, options)?.isCombination === true; }
export function isHetCapableGene(value: string, options?: MorphDefinition[]): boolean { const morph = resolveStrictMorph(value, options); return Boolean(morph?.isGene && morph.kind === "Gene" && morph.hetPossible); }

export function resolveHetIdentity(gene: string, percentage: HetPercentage, options?: MorphDefinition[]): HetIdentity | undefined {
  const morph = resolveStrictMorph(gene, options);
  return morph?.isGene && morph.kind === "Gene" && morph.hetPossible ? { geneId: morph.geneId, name: morph.name, percentage } : undefined;
}
export function sameHetIdentity(a: string, ap: HetPercentage, b: string, bp: HetPercentage, options?: MorphDefinition[]): boolean {
  const first = resolveHetIdentity(a, ap, options); const second = resolveHetIdentity(b, bp, options);
  return first && second ? first.geneId === second.geneId && first.percentage === second.percentage : normaliseGeneticsValue(a) === normaliseGeneticsValue(b) && ap === bp;
}
export function hetStatesConflict(a: string, ap: HetPercentage, b: string, bp: HetPercentage, options?: MorphDefinition[]): boolean {
  const first = resolveHetIdentity(a, ap, options); const second = resolveHetIdentity(b, bp, options);
  return first && second ? first.geneId === second.geneId : normaliseGeneticsValue(a) === normaliseGeneticsValue(b);
}

export type HetSelectionConflict = { geneId: string; name: string; percentage: HetPercentage };
export function getHetSelectionConflict(gene: string, percentage: HetPercentage, selected: Array<{ gene: string; percentage: HetPercentage }>, options?: MorphDefinition[]): HetSelectionConflict | undefined {
  const candidate = resolveHetIdentity(gene, percentage, options); if (!candidate) return undefined;
  const existing = selected.find((item) => resolveHetIdentity(item.gene, item.percentage, options)?.geneId === candidate.geneId);
  return existing ? { geneId: candidate.geneId, name: candidate.name, percentage: existing.percentage } : undefined;
}
export function canSelectHet(gene: string, percentage: HetPercentage, selected: Array<{ gene: string; percentage: HetPercentage }>, options?: MorphDefinition[]): boolean { return !getHetSelectionConflict(gene, percentage, selected, options); }
export function getIndependentGenes(options: MorphDefinition[]): MorphDefinition[] { return options.filter((morph) => morph.isGene && morph.kind === "Gene"); }
export function getHetGenes(options: MorphDefinition[]): MorphDefinition[] { return options.filter((morph) => morph.isGene && morph.kind === "Gene" && morph.hetPossible); }

export function getCombinationComponents(value: string): MorphDefinition[] {
  const resolved = resolveMasterMorph(value);
  if (!resolved?.isCombination) return [];
  return (resolved.geneticSignature?.split("|") ?? []).map((part) => part.split(":")[0]).map((geneId) => masterMorphs.find((entry) => entry.geneId === geneId)).filter((entry): entry is MasterMorphDefinition => Boolean(entry));
}

export type GeneticSummary = {
  identity: GeneticIdentity;
  isGene: boolean;
  isSuper: boolean;
  isCombination: boolean;
  underlyingGenes: UnderlyingGeneIdentity[];
  directComponents: MorphDefinition[];
};
export function getGeneticSummary(value: string, options?: MorphDefinition[]): GeneticSummary | undefined {
  const morph = resolveStrictMorph(value, options); if (!morph) return undefined;
  return { identity: getGeneticIdentity(morph), isGene: Boolean(morph.isGene && morph.kind === "Gene"), isSuper: morph.kind === "Super", isCombination: morph.isCombination === true, underlyingGenes: getUnderlyingGeneIdentities(morph.name), directComponents: getCombinationComponents(morph.name) };
}
export function debugGeneticIdentity(value: string) {
  const strict = resolveStrictMorph(value); const resolved = resolveMorphInput(value); const underlyingGenes = getUnderlyingGeneIdentities(value);
  return { input: value, strict: strict ? { geneId: strict.geneId, name: strict.name, kind: strict.kind } : undefined, aliasAware: resolved ? { geneId: resolved.geneId, name: resolved.name, kind: resolved.kind } : undefined, underlyingGenes: underlyingGenes.map((gene) => ({ geneId: gene.geneId, name: gene.name, copies: gene.copies })) };
}
