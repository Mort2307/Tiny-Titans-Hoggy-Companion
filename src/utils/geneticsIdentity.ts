import {
  getMasterMorphByGeneId,
  getMasterMorphByName,
  masterMorphs,
  resolveMasterMorph,
  type MasterMorphDefinition,
} from "../data/masterMorphDatabase";
import type { MorphDefinition, MorphComponent } from "../data/morphs";

export type GeneticIdentity = { geneId: string; name: string; morph: MorphDefinition };
export type UnderlyingGeneIdentity = { geneId: string; name: string; copies: number; morph: MorphDefinition };
export type HetPercentage = "100%" | "66%" | "50%";
export type HetIdentity = { geneId: string; name: string; percentage: HetPercentage };

export function normaliseGeneticsValue(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[×✕]/g, "x").replace(/\s+/g, " ");
}

/** Strict identity: canonical geneId/name only. Aliases are deliberately excluded. */
export function resolveStrictMorph(value: string, options?: MorphDefinition[]): MorphDefinition | undefined {
  const query = normaliseGeneticsValue(value);
  const source = options ?? masterMorphs;
  const byId = source.find((morph) => normaliseGeneticsValue(morph.geneId) === query);
  if (byId) return byId;
  const byName = source.find((morph) => normaliseGeneticsValue(morph.name) === query);
  if (byName) return byName;
  return getMasterMorphByGeneId(value) ?? getMasterMorphByName(value);
}

/** Human-input resolution: aliases, formulas and canonical combination names are allowed. */
export function resolveMorphInput(value: string): MasterMorphDefinition | undefined {
  return resolveMasterMorph(value);
}

export function getGeneticIdentity(morph: MorphDefinition): GeneticIdentity {
  return { geneId: morph.geneId, name: morph.name, morph };
}

export function resolveGeneticIdentity(value: string, options?: MorphDefinition[]): GeneticIdentity | undefined {
  const morph = resolveStrictMorph(value, options);
  return morph ? getGeneticIdentity(morph) : undefined;
}

export function resolveCanonicalGeneticIdentity(value: string): GeneticIdentity | undefined {
  const morph = resolveMasterMorph(value);
  return morph ? getGeneticIdentity(morph) : undefined;
}

export function sameMorphIdentity(first: string, second: string, options?: MorphDefinition[]): boolean {
  const firstMorph = resolveStrictMorph(first, options);
  const secondMorph = resolveStrictMorph(second, options);
  if (!firstMorph || !secondMorph) return normaliseGeneticsValue(first) === normaliseGeneticsValue(second);
  return firstMorph.geneId === secondMorph.geneId;
}

export function getGeneId(value: string, options?: MorphDefinition[]): string | undefined {
  return resolveStrictMorph(value, options)?.geneId;
}

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
