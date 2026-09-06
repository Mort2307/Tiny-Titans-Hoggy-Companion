import { getMasterCalculatorMorphs, getMasterHetGenes, getMasterVisualMorphs, type MasterMorphDefinition } from "../masterMorphDatabase";
import { resolveCanonicalGenetics, findCanonicalMorphForComposition, type CanonicalGeneticsResolution } from "../../utils/canonicalGenetics";
import type { MorphComponent } from "../morphs";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES_EXPANDED } from "./speciesGeneticsCataloguesExpanded";
import { SPECIES_GENETICS_COMBINATIONS } from "./speciesGeneticsCombinations";
import { getSpeciesGeneticsCoverage, getSpeciesGeneticsCoverageSummary } from "./speciesGeneticsCoverage";

type SpeciesRecord = (typeof INITIAL_SNAKE_SPECIES)[number];
export type SpeciesGeneticsStatus = "mapped" | "partial" | "baseline-only";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const normalTrait = (speciesName: string): MasterMorphDefinition => ({
  geneId: "normal",
  name: "Wild Type / Unclassified",
  aliases: ["Normal", "Wild Type", "Wildtype", "Wild", "Unclassified"],
  kind: "Gene",
  isGene: false,
  category: "Baseline phenotype",
  inheritance: "Unknown",
  hetPossible: false,
  verification: "Recognised",
  description: `Baseline wild-type / unclassified phenotype reference for ${speciesName}. Community photographs may document unusual colour, pattern or morphology for later expert review; this entry does not imply a genetic morph.`,
  educationalNotes: "Baseline reference only. A visible difference is not automatically a genetic morph. Community submissions can document unusual animals for Creator review and future evidence gathering.",
});

const BALL_PYTHON_SOURCE = "https://www.morphmarket.com/all/c/reptiles/pythons/ball-pythons";
const ballPythonTrait = (name: string, inheritance: MasterMorphDefinition["inheritance"], aliases: string[] = []): MasterMorphDefinition => ({
  geneId: normalise(name).replace(/[^a-z0-9]+/g, "-"),
  name,
  aliases,
  kind: "Gene",
  isGene: true,
  category: "Species gene",
  inheritance,
  hetPossible: inheritance === "Recessive",
  verification: "Recognised",
  description: `Recognised ${name} trait for Python regius.`,
  educationalNotes: "Species-scoped catalogue entry. Confirm individual lineage and documentation before treating a genetic claim as proven.",
  sourceUrl: BALL_PYTHON_SOURCE,
  sourceLabel: "MorphMarket Ball Python trait index",
});

const BALL_PYTHON_TRAITS: MasterMorphDefinition[] = [
  ballPythonTrait("Albino", "Recessive", ["Amelanistic", "Amel"]),
  ballPythonTrait("Axanthic", "Recessive", ["Anery"]),
  ballPythonTrait("Clown", "Recessive"),
  ballPythonTrait("Desert Ghost", "Recessive", ["DG"]),
  ballPythonTrait("Ghost", "Recessive", ["Hypo"]),
  ballPythonTrait("Genetic Stripe", "Recessive", ["G Stripe"]),
  ballPythonTrait("Lavender Albino", "Recessive", ["Lavender", "Lav Albino"]),
  ballPythonTrait("Piebald", "Recessive", ["Pied"]),
  ballPythonTrait("Puzzle", "Recessive"),
  ballPythonTrait("Tri-Stripe", "Recessive", ["Tristripe", "Tri Stripe"]),
  ballPythonTrait("Ultramel", "Recessive"),
  ballPythonTrait("Enhancer", "Recessive"),
  ballPythonTrait("Axanthic (MJ)", "Recessive", ["Markus Jayne Axanthic"]),
  ballPythonTrait("Banana", "Incomplete Dominant", ["Coral Glow"]),
  ballPythonTrait("Bamboo", "Incomplete Dominant"),
  ballPythonTrait("Black Pastel", "Incomplete Dominant"),
  ballPythonTrait("Butter", "Incomplete Dominant"),
  ballPythonTrait("Cinnamon", "Incomplete Dominant"),
  ballPythonTrait("Fire", "Incomplete Dominant"),
  ballPythonTrait("Lesser", "Incomplete Dominant"),
  ballPythonTrait("Mojave", "Incomplete Dominant"),
  ballPythonTrait("Mystic", "Incomplete Dominant"),
  ballPythonTrait("Orange Dream", "Incomplete Dominant", ["OD"]),
  ballPythonTrait("Pastel", "Incomplete Dominant"),
  ballPythonTrait("Phantom", "Incomplete Dominant"),
  ballPythonTrait("Enchi", "Incomplete Dominant"),
  ballPythonTrait("GHI", "Incomplete Dominant"),
  ballPythonTrait("Mahogany", "Incomplete Dominant"),
  ballPythonTrait("Red Stripe", "Incomplete Dominant"),
  ballPythonTrait("Yellow Belly", "Incomplete Dominant"),
  ballPythonTrait("Champagne", "Incomplete Dominant"),
  ballPythonTrait("Cypress", "Incomplete Dominant"),
  ballPythonTrait("Gravel", "Incomplete Dominant"),
  ballPythonTrait("Huffman", "Incomplete Dominant"),
  ballPythonTrait("Leopard", "Incomplete Dominant"),
  ballPythonTrait("Lori", "Incomplete Dominant"),
  ballPythonTrait("Special", "Incomplete Dominant"),
  ballPythonTrait("Jolt", "Incomplete Dominant"),
  ballPythonTrait("Raven", "Incomplete Dominant"),
  ballPythonTrait("Honey", "Incomplete Dominant"),
  ballPythonTrait("Scaleless Head", "Incomplete Dominant"),
  ballPythonTrait("Pinstripe", "Dominant"),
  ballPythonTrait("Spider", "Dominant"),
  ballPythonTrait("Spotnose", "Dominant"),
  ballPythonTrait("Ashen", "Dominant"),
  ballPythonTrait("Citron", "Incomplete Dominant"),
];

const SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  ...SPECIES_GENETICS_CATALOGUES_EXPANDED,
  "Python regius": BALL_PYTHON_TRAITS,
};

function getSpeciesRecord(speciesId: string | null | undefined): SpeciesRecord | undefined {
  return speciesId ? INITIAL_SNAKE_SPECIES.find((species) => species.id === speciesId) : undefined;
}

function isHognose(speciesId: string | null | undefined): boolean {
  return speciesId === "heterodon-nasicus";
}

function getGeneCatalogue(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  const species = getSpeciesRecord(speciesId);
  return species ? SPECIES_CATALOGUES[species.acceptedScientificName] ?? [] : [];
}

function getCatalogue(speciesId: string | null | undefined): MasterMorphDefinition[] {
  const genes = getGeneCatalogue(speciesId);
  if (isHognose(speciesId)) return genes;
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  return [...genes, ...(SPECIES_GENETICS_COMBINATIONS[species.acceptedScientificName] ?? [])];
}

function findSpeciesDefinition(speciesId: string | null | undefined, value: string): MasterMorphDefinition | undefined {
  const wanted = normalise(value);
  return getCatalogue(speciesId).find((entry) =>
    normalise(entry.geneId) === wanted ||
    normalise(entry.name) === wanted ||
    entry.aliases.some((alias) => normalise(alias) === wanted),
  );
}

function signatureFromComponents(components: MorphComponent[]): string {
  const totals = new Map<string, number>();
  for (const component of components) {
    if (component.type !== "Gene") continue;
    totals.set(component.morphId, (totals.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}:${copies}`).join("|");
}

function parseSignature(signature: string | undefined): MorphComponent[] {
  if (!signature) return [];
  return signature.split("|").filter(Boolean).map((part) => {
    const [morphId, copiesValue] = part.split(":");
    const copies = Number(copiesValue);
    return { morphId, type: "Gene" as const, copies: Number.isFinite(copies) && copies > 0 ? copies : 1 };
  });
}

function splitFormula(value: string): string[] {
  return value.includes("+") || value.includes("×") || /\s+x\s+/i.test(value)
    ? value.split(/\s*(?:\+|×)\s*|\s+x\s+/i).map((part) => part.trim()).filter(Boolean)
    : [];
}

function speciesFormula(components: MorphComponent[], speciesId: string | null | undefined): string {
  return components
    .filter((component) => component.type === "Gene")
    .sort((a, b) => a.morphId.localeCompare(b.morphId))
    .map((component) => {
      const definition = findSpeciesDefinition(speciesId, component.morphId);
      const name = definition?.name ?? component.morphId;
      return `${name}${(component.copies ?? 1) > 1 ? ` ×${component.copies}` : ""}`;
    })
    .join(" + ");
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = getGeneCatalogue(speciesId);
  const name = species.commonNames[0] ?? species.acceptedScientificName;
  return [normalTrait(name), ...mapped];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterHetGenes();
  return getGeneCatalogue(speciesId).filter((morph) => morph.isGene && morph.hetPossible === true);
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  return getGeneCatalogue(speciesId).filter((morph) => morph.isGene && ["Recessive", "Incomplete Dominant", "Dominant"].includes(morph.inheritance));
}

/** Species-scoped identity lookup. This deliberately avoids the global
 * Hognose master resolver for every non-Hognose species so "Albino" in one
 * species cannot accidentally resolve to the same gene in another. */
export function getSpeciesGeneticDefinition(speciesId: string | null | undefined, value: string): MasterMorphDefinition | undefined {
  if (isHognose(speciesId)) return findSpeciesDefinition(speciesId, value);
  return findSpeciesDefinition(speciesId, value);
}

export function resolveSpeciesGenetics(speciesId: string | null | undefined, value: string | MasterMorphDefinition): CanonicalGeneticsResolution {
  if (isHognose(speciesId)) return resolveCanonicalGenetics(value);

  const catalogue = getCatalogue(speciesId);
  const input = typeof value === "string" ? value : value.name;
  const direct = typeof value === "string" ? findSpeciesDefinition(speciesId, value) : value;
  if (direct) {
    const components = direct.kind === "Combination" ? parseSignature(direct.geneticSignature) : [{ morphId: direct.geneId, type: "Gene" as const, copies: direct.inheritance === "Recessive" ? 2 : 1 }];
    const unresolvedComponents = components.filter((component) => !catalogue.some((entry) => entry.geneId === component.morphId)).map((component) => component.morphId);
    return {
      morph: direct,
      components,
      geneticSignature: direct.geneticSignature ?? signatureFromComponents(components),
      geneticFormula: direct.geneticFormula ?? speciesFormula(components, speciesId),
      recognisedNames: direct.kind === "Combination" ? [direct.name, ...direct.aliases] : [direct.name],
      componentInheritance: components.map((component) => {
        const definition = catalogue.find((entry) => entry.geneId === component.morphId);
        return { geneId: component.morphId, name: definition?.name ?? component.morphId, inheritance: definition?.inheritance ?? "Unknown", copies: component.copies ?? 1 };
      }),
      status: unresolvedComponents.length ? "unresolved" : "exact",
      unresolvedComponents,
    };
  }

  const parts = splitFormula(input);
  if (parts.length > 1) {
    const resolved = parts.map((part) => findSpeciesDefinition(speciesId, part));
    const unresolvedComponents = parts.filter((_, index) => !resolved[index]).map((part) => part);
    const components = resolved.filter((entry): entry is MasterMorphDefinition => Boolean(entry)).map((entry) => ({ morphId: entry.geneId, type: "Gene" as const, copies: entry.inheritance === "Recessive" ? 2 : 1 }));
    const signature = signatureFromComponents(components);
    const recognised = catalogue.find((entry) => entry.kind === "Combination" && entry.geneticSignature === signature);
    return {
      morph: recognised,
      components,
      geneticSignature: signature,
      geneticFormula: speciesFormula(components, speciesId),
      recognisedNames: recognised ? [recognised.name, ...recognised.aliases] : [],
      componentInheritance: components.map((component) => {
        const definition = catalogue.find((entry) => entry.geneId === component.morphId);
        return { geneId: component.morphId, name: definition?.name ?? component.morphId, inheritance: definition?.inheritance ?? "Unknown", copies: component.copies ?? 1 };
      }),
      status: unresolvedComponents.length ? "unresolved" : recognised ? "exact" : "inferred",
      unresolvedComponents,
    };
  }

  return { components: [], recognisedNames: [], componentInheritance: [], status: "unresolved", unresolvedComponents: [input] };
}

export function findSpeciesCanonicalMorphForComposition(speciesId: string | null | undefined, components: MorphComponent[]): MasterMorphDefinition | undefined {
  if (isHognose(speciesId)) return findCanonicalMorphForComposition(components);
  const signature = signatureFromComponents(components);
  if (!signature) return undefined;
  return (SPECIES_GENETICS_COMBINATIONS[getSpeciesRecord(speciesId)?.acceptedScientificName ?? ""] ?? [])
    .find((entry) => entry.kind === "Combination" && entry.geneticSignature === signature && entry.verification !== "Unverified" && entry.verification !== "Disputed");
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  if (!speciesId) return "baseline-only";
  if (isHognose(speciesId)) return "mapped";
  return getSpeciesGeneticsCoverage(speciesId)?.traitCount ? "partial" : "baseline-only";
}

export { getSpeciesGeneticsCoverage, getSpeciesGeneticsCoverageSummary };

export function isSpeciesGeneticsMapped(speciesId: string | null | undefined): boolean {
  return getSpeciesGeneticsStatus(speciesId) !== "baseline-only";
}
