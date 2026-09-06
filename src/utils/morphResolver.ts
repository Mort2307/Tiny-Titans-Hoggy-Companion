import { masterMorphs, resolveMasterMorph, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { MorphComponent } from "../data/morphs";
import { getCanonicalComposition, findCanonicalMorphForComposition, canonicalComponentsToFormula } from "./canonicalGenetics";

export type ResolvedMorph = {
  selected: string[];
  combination?: MasterMorphDefinition;
  components: MorphComponent[];
  displayName: string;
  recognisedCombination: boolean;
  hasUnresolvedComponents: boolean;
};

function mergeComponents(components: MorphComponent[]): MorphComponent[] {
  const map = new Map<string, MorphComponent>();
  for (const component of components) {
    const existing = map.get(component.morphId);
    if (!existing) map.set(component.morphId, { ...component, copies: component.copies ?? 1 });
    else existing.copies = (existing.copies ?? 1) + (component.copies ?? 1);
  }
  return [...map.values()].sort((a, b) => a.morphId.localeCompare(b.morphId));
}
function asMaster(value: string | MasterMorphDefinition): MasterMorphDefinition | undefined { return typeof value === "string" ? resolveMasterMorph(value) : value; }

export function expandMorphToComponents(morph: MasterMorphDefinition): MorphComponent[] {
  const canonical = getCanonicalComposition(morph);
  if (canonical.length) return canonical;
  return morph.components?.map((component) => ({ ...component, copies: component.copies ?? 1 })) ?? [];
}
export function expandSelectedMorphs(selectedMorphs: string[]): MorphComponent[] {
  return mergeComponents(selectedMorphs.flatMap((value) => { const morph = asMaster(value); return morph ? expandMorphToComponents(morph) : []; }));
}
export function findRecognisedCombination(selectedMorphs: string[]): MasterMorphDefinition | undefined {
  const components = expandSelectedMorphs(selectedMorphs);
  return findCanonicalMorphForComposition(components);
}
export function resolveMorphSelection(selectedMorphs: string[]): ResolvedMorph {
  const cleaned = selectedMorphs.map((value) => value.trim()).filter(Boolean);
  if (!cleaned.length) return { selected: [], components: [], displayName: "", recognisedCombination: false, hasUnresolvedComponents: false };
  const components = expandSelectedMorphs(cleaned);
  const combination = findRecognisedCombination(cleaned);
  const formula = canonicalComponentsToFormula(components);
  return { selected: cleaned, combination, components, displayName: combination?.name ?? (formula || cleaned.join(" + ")), recognisedCombination: Boolean(combination), hasUnresolvedComponents: cleaned.some((value) => !resolveMasterMorph(value)) };
}
export function getRecognisedCombinationName(selectedMorphs: string[]): string | undefined { return findRecognisedCombination(selectedMorphs)?.name; }
export function getUnderlyingGenetics(selectedMorphs: string[]): MorphComponent[] { return resolveMorphSelection(selectedMorphs).components; }
export function isRecognisedCombination(selectedMorphs: string[]): boolean { return Boolean(findRecognisedCombination(selectedMorphs)); }
export function getCombinationExplanation(selectedMorphs: string[]): string | undefined {
  const result = resolveMorphSelection(selectedMorphs);
  if (!result.combination) return undefined;
  return `${result.combination.name} = ${canonicalComponentsToFormula(result.components)}`;
}
export function deduplicateComponents(components: MorphComponent[]): MorphComponent[] { return mergeComponents(components); }
export function getMorphDefinition(value: string): MasterMorphDefinition | undefined { return resolveMasterMorph(value); }
export { masterMorphs };
