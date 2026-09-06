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
    const key = component.morphId;
    const existing = map.get(key);
    if (!existing) map.set(key, { ...component, copies: component.copies ?? 1 });
    else existing.copies = (existing.copies ?? 1) + (component.copies ?? 1);
  }
  return [...map.values()].sort((a, b) => a.morphId.localeCompare(b.morphId));
}

function asMaster(value: string | MasterMorphDefinition): MasterMorphDefinition | undefined {
  return typeof value === "string" ? resolveMasterMorph(value) : value;
}

export function expandMorphToComponents(morph: MasterMorphDefinition): MorphComponent[] {
  const canonical = getCanonicalComposition(morph);
  if (canonical.length) return canonical;
  return morph.components?.map((component) => ({ ...component, copies: component.copies ?? 1 })) ?? [];
}

export function expandSelectedMorphs(selectedMorphs: string[]): MorphComponent[] {
  return mergeComponents(selectedMorphs.flatMap((value) => {
    const morph = asMaster(value);
    return morph ? expandMorphToComponents(morph) : [];
  }));
}

export function resolveMorphSelection(selectedMorphs: string[]): ResolvedMorph {
  const components = expandSelectedMorphs(selectedMorphs);
  const combination = findCanonicalMorphForComposition(components);
  const displayName = combination?.name ?? canonicalComponentsToFormula(components) || selectedMorphs.join(" + ");
  return {
    selected: selectedMorphs,
    combination,
    components,
    displayName,
    recognisedCombination: Boolean(combination),
    hasUnresolvedComponents: selectedMorphs.some((value) => !resolveMasterMorph(value)),
  };
}

export function deduplicateComponents(components: MorphComponent[]): MorphComponent[] {
  return mergeComponents(components);
}

export function getMorphDefinition(value: string): MasterMorphDefinition | undefined {
  return resolveMasterMorph(value);
}

export { masterMorphs };
