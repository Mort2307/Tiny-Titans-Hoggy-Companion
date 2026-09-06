import { masterMorphs, resolveMasterMorph, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import type { MorphComponent } from "../data/morphs";

export type CanonicalGeneticsResolution = {
  morph?: MasterMorphDefinition;
  components: MorphComponent[];
  geneticSignature?: string;
  geneticFormula?: string;
  recognisedNames: string[];
  componentInheritance: Array<{ geneId: string; name: string; inheritance: MasterMorphDefinition["inheritance"]; copies: number }>;
  status: "exact" | "inferred" | "unresolved";
  unresolvedComponents: string[];
};

function signatureFromComponents(components: MorphComponent[]): string {
  const totals = new Map<string, number>();
  for (const component of components) {
    if (component.type !== "Gene") continue;
    totals.set(component.morphId, (totals.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([geneId, copies]) => `${geneId}:${copies}`)
    .join("|");
}

function parseSignature(signature: string | undefined): MorphComponent[] {
  if (!signature) return [];
  return signature.split("|").filter(Boolean).map((part) => {
    const [morphId, copiesValue] = part.split(":");
    const copies = Number(copiesValue);
    return { morphId, type: "Gene" as const, copies: Number.isFinite(copies) && copies > 0 ? copies : 1 };
  });
}

function displayName(geneId: string): string {
  return masterMorphs.find((entry) => entry.geneId === geneId)?.name ?? geneId;
}

export function getCanonicalComposition(value: string | MasterMorphDefinition): MorphComponent[] {
  const morph = typeof value === "string" ? resolveMasterMorph(value) : value;
  if (!morph) return [];
  return parseSignature(morph.geneticSignature) ?? [];
}

export function getCanonicalSignature(value: string | MasterMorphDefinition): string | undefined {
  const morph = typeof value === "string" ? resolveMasterMorph(value) : value;
  return morph?.geneticSignature || undefined;
}

export function getCanonicalGeneticFormula(value: string | MasterMorphDefinition): string | undefined {
  const morph = typeof value === "string" ? resolveMasterMorph(value) : value;
  return morph?.geneticFormula || undefined;
}

export function resolveCanonicalGenetics(value: string | MasterMorphDefinition): CanonicalGeneticsResolution {
  const morph = typeof value === "string" ? resolveMasterMorph(value) : value;
  if (!morph) {
    return {
      components: [],
      recognisedNames: [],
      componentInheritance: [],
      status: "unresolved",
      unresolvedComponents: [typeof value === "string" ? value : value.name],
    };
  }

  const components = getCanonicalComposition(morph);
  const componentInheritance = components.map((component) => {
    const definition = masterMorphs.find((entry) => entry.geneId === component.morphId);
    return {
      geneId: component.morphId,
      name: definition?.name ?? displayName(component.morphId),
      inheritance: definition?.inheritance ?? "Unknown",
      copies: component.copies ?? 1,
    };
  });

  return {
    morph,
    components,
    geneticSignature: morph.geneticSignature,
    geneticFormula: morph.geneticFormula,
    recognisedNames: morph.recognisedNames ?? [],
    componentInheritance,
    status: morph.compositionStatus ?? (components.length ? "exact" : "unresolved"),
    unresolvedComponents: morph.unresolvedComponents ?? [],
  };
}

export function findRecognisedNamesForComposition(components: MorphComponent[]): string[] {
  const signature = signatureFromComponents(components);
  if (!signature) return [];
  return masterMorphs
    .filter((entry) => entry.kind === "Combination" && entry.geneticSignature === signature && entry.verification !== "Unverified" && entry.verification !== "Disputed")
    .map((entry) => entry.name)
    .filter((name, index, names) => names.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .sort((a, b) => a.localeCompare(b));
}

export function findCanonicalMorphForComposition(components: MorphComponent[]): MasterMorphDefinition | undefined {
  const signature = signatureFromComponents(components);
  if (!signature) return undefined;
  return masterMorphs.find((entry) => entry.geneticSignature === signature && entry.kind === "Combination" && entry.verification !== "Unverified" && entry.verification !== "Disputed");
}

export function canonicalComponentsToFormula(components: MorphComponent[]): string {
  return [...components]
    .filter((component) => component.type === "Gene")
    .sort((a, b) => a.morphId.localeCompare(b.morphId))
    .map((component) => `${displayName(component.morphId)}${(component.copies ?? 1) > 1 ? ` ×${component.copies}` : ""}`)
    .join(" + ");
}
