import type { MasterMorphDefinition } from "../masterMorphDatabase";
import type { MorphComponent, MorphDefinition } from "../morphs";
import { calculatorNamedCombinations } from "../geneticsComboRegistry";
import { applyScientificEvidence } from "./speciesGeneticsScientificEvidence";
import { getSpeciesCalculatorMorphs, getSpeciesVisualMorphs } from "./speciesGenetics";

export type ScopedGeneticsMorph = MasterMorphDefinition | MorphDefinition;

const normalise = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[×✕]/g, "x").replace(/\s+/g, " ");
const isHognose = (speciesId: string) => speciesId === "heterodon-nasicus";

function applyScientificOverlay(speciesId: string, entries: ScopedGeneticsMorph[]): ScopedGeneticsMorph[] {
  const scientificNameBySpeciesId: Record<string, string> = {
    "python-regius": "Python regius",
    "pantherophis-guttatus": "Pantherophis guttatus",
  };
  const scientificName = scientificNameBySpeciesId[speciesId];
  if (!scientificName) return entries;
  return applyScientificEvidence({ [scientificName]: entries })[scientificName] ?? entries;
}

export function getSpeciesResolverEntries(speciesId: string): ScopedGeneticsMorph[] {
  const speciesEntries = applyScientificOverlay(speciesId, getSpeciesVisualMorphs(speciesId));
  if (!isHognose(speciesId)) return speciesEntries;
  const combinations = calculatorNamedCombinations.filter((combination) => !speciesEntries.some((entry) => entry.geneId === combination.geneId));
  return [...speciesEntries, ...combinations];
}

export function resolveSpeciesMorph(speciesId: string, value: string): ScopedGeneticsMorph | undefined {
  const query = normalise(value);
  return getSpeciesResolverEntries(speciesId).find((entry) => normalise(entry.geneId) === query || normalise(entry.name) === query || (entry.aliases ?? []).some((alias) => normalise(alias) === query));
}

function resolveComponentMorph(speciesId: string, component: MorphComponent): ScopedGeneticsMorph | undefined {
  return resolveSpeciesMorph(speciesId, component.morphId);
}

function flattenMorph(speciesId: string, morph: ScopedGeneticsMorph, inheritedCopies = 1, seen = new Set<string>()): Array<{ morphId: string; copies: number }> {
  const marker = `${morph.geneId}:${inheritedCopies}`;
  if (seen.has(marker)) return [];
  if (morph.kind === "Gene") return [{ morphId: morph.geneId, copies: Math.max(1, inheritedCopies) }];
  if (!morph.components?.length) return [];
  const nextSeen = new Set(seen).add(marker);
  const result: Array<{ morphId: string; copies: number }> = [];
  for (const component of morph.components) {
    const resolved = resolveComponentMorph(speciesId, component);
    if (!resolved) continue;
    const componentCopies = Math.max(1, component.copies ?? (component.type === "Super" ? 2 : 1));
    result.push(...flattenMorph(speciesId, resolved, inheritedCopies * componentCopies, nextSeen));
  }
  return result;
}

export function resolveSpeciesUnderlyingGenes(speciesId: string, value: string): Array<{ morphId: string; copies: number }> {
  const morph = resolveSpeciesMorph(speciesId, value);
  if (!morph) return [];
  const totals = new Map<string, number>();
  for (const component of flattenMorph(speciesId, morph)) totals.set(component.morphId, (totals.get(component.morphId) ?? 0) + component.copies);
  return [...totals.entries()].map(([morphId, copies]) => ({ morphId, copies }));
}

export function getSpeciesCalculatorMorph(speciesId: string, geneId: string): MasterMorphDefinition | undefined {
  const resolved = resolveSpeciesMorph(speciesId, geneId);
  if (resolved?.kind === "Gene" && resolved.isGene && resolved.evidenceStatus === "confirmed" && resolved.verification === "Confirmed") return resolved as MasterMorphDefinition;
  return getSpeciesCalculatorMorphs(speciesId).find((entry) => entry.geneId === geneId);
}

export function getSpeciesResolverStatus(speciesId: string): { speciesId: string; calculatorGeneIds: string[]; resolverEntryCount: number } {
  const entries = getSpeciesResolverEntries(speciesId);
  return {
    speciesId,
    calculatorGeneIds: entries.filter((entry) => entry.kind === "Gene" && entry.isGene && entry.evidenceStatus === "confirmed" && entry.verification === "Confirmed").map((entry) => entry.geneId),
    resolverEntryCount: entries.length,
  };
}
