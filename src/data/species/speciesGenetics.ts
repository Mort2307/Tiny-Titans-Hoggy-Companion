import {
  getMasterCalculatorMorphs,
  getMasterHetGenes,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import type { InheritanceType, SnakeSpeciesRecord } from "./speciesTypes";

/**
 * Species genetics is deliberately separate from taxonomy and husbandry.
 * A trait name is never assumed to mean the same genetics in another species.
 *
 * Hognose continues to use the existing fully audited master catalogue.
 * Other species get their own catalogue records as they are sourced. Every
 * registered species still receives a species-scoped Normal / Wild Type entry
 * so the UI never falls back to Hognose genetics.
 */

export type SpeciesGeneticsStatus = "mapped" | "baseline-only";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const trait = (
  name: string,
  inheritance: InheritanceType,
  options: {
    aliases?: string[];
    hetPossible?: boolean;
    description?: string;
    sourceUrl?: string;
    sourceLabel?: string;
  } = {},
): MasterMorphDefinition => ({
  geneId: normalise(name).replace(/[^a-z0-9]+/g, "-"),
  name,
  aliases: options.aliases ?? [],
  kind: "Gene",
  isGene: true,
  category: "Species trait",
  inheritance,
  hetPossible: options.hetPossible ?? false,
  verification: "Recognised",
  description: options.description ?? `Recognised ${name} trait for this species.`,
  educationalNotes: "Species-scoped catalogue entry. Confirm individual lineage and documentation before treating a genetic claim as proven.",
  sourceUrl: options.sourceUrl,
  sourceLabel: options.sourceLabel,
});

const normalTrait = (speciesName: string): MasterMorphDefinition => ({
  geneId: "normal",
  name: "Normal / Wild Type",
  aliases: ["Normal", "Wild Type", "Wildtype", "Wild"],
  kind: "Gene",
  isGene: false,
  category: "Baseline phenotype",
  inheritance: "Unknown",
  hetPossible: false,
  verification: "Recognised",
  description: `Normal / wild-type phenotype reference for ${speciesName}.`,
  educationalNotes: "Normal / wild type is a phenotype reference, not a mutant genetic locus and cannot be treated as a breeding gene.",
});

const MORPHMARKET = "https://www.morphmarket.com/";

/**
 * Ball Python has one of the deepest established captive trait catalogues.
 * These are species-scoped recognised traits; combinations are deliberately
 * left to the Ball Python calculator workstream rather than pretending that
 * every combo is an independent gene.
 *
 * Source principle: MorphMarket maintains species-specific trait indexes and
 * identifies traits by species because the same name can represent different
 * genetics in different species.
 */
const BALL_PYTHON_TRAITS: MasterMorphDefinition[] = [
  trait("Albino", "Recessive", { aliases: ["Amelanistic", "Amel"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Axanthic", "Recessive", { aliases: ["Anery"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Clown", "Recessive", { hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Desert Ghost", "Recessive", { aliases: ["DG"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Ghost", "Recessive", { aliases: ["Hypo"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Genetic Stripe", "Recessive", { aliases: ["G Stripe"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Lavender Albino", "Recessive", { aliases: ["Lavender", "Lav Albino"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Piebald", "Recessive", { aliases: ["Pied"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Puzzle", "Recessive", { hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Tri-Stripe", "Recessive", { aliases: ["Tristripe", "Tri Stripe"], hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Ultramel", "Recessive", { hetPossible: true, sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Banana", "Incomplete Dominant", { aliases: ["Coral Glow"], sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Bamboo", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Black Pastel", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Butter", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Cinnamon", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Fire", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Lesser", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Mojave", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Mystic", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Orange Dream", "Incomplete Dominant", { aliases: ["OD"], sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Pastel", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Phantom", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Pinstripe", "Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Spider", "Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Spotnose", "Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Enchi", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("GHI", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("HRA", "Incomplete Dominant", { aliases: ["Het Red Axanthic"], sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Mahogany", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Red Stripe", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Yellow Belly", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Champagne", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Cypress", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Gravel", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Hazard", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Huffman", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Leopard", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Lori", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Mimosa", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Mystic Potion", "Incomplete Dominant", { aliases: ["Mystic / Mojave"] }),
  trait("Sable", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Special", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
  trait("Yellow Head", "Incomplete Dominant", { sourceUrl: `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`, sourceLabel: "MorphMarket Ball Python trait index" }),
];

/**
 * Species-specific catalogues currently curated beyond Hognose. Keys are
 * accepted scientific names, which keeps the mapping resilient to common-name
 * aliases and prevents a morphology catalogue being attached to the wrong
 * species ID.
 *
 * This registry is intentionally explicit: we never apply a genus/family-wide
 * genetics list to every member because the same trait name can mean different
 * genetics between species.
 */
const SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  "Python regius": BALL_PYTHON_TRAITS,
};

function getSpeciesRecord(speciesId: string | null | undefined): SnakeSpeciesRecord | undefined {
  if (!speciesId) return undefined;
  return INITIAL_SNAKE_SPECIES.find((species) => species.id === speciesId);
}

function isHognose(speciesId: string | null | undefined): boolean {
  return speciesId === "heterodon-nasicus";
}

export function isSpeciesGeneticsMapped(speciesId: string | null | undefined): boolean {
  if (!speciesId) return false;
  if (isHognose(speciesId)) return true;
  const species = getSpeciesRecord(speciesId);
  return Boolean(species && SPECIES_CATALOGUES[species.acceptedScientificName]);
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = SPECIES_CATALOGUES[species.acceptedScientificName];
  return mapped?.length ? [normalTrait(species.commonNames[0] ?? species.acceptedScientificName), ...mapped] : [normalTrait(species.commonNames[0] ?? species.acceptedScientificName)];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterHetGenes();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = SPECIES_CATALOGUES[species.acceptedScientificName];
  return mapped?.filter((morph) => morph.isGene && morph.hetPossible === true) ?? [];
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  // Ball Python traits above are recognition entries only until their exact
  // inheritance/evidence records are wired into a species-specific calculator.
  return [];
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  return isSpeciesGeneticsMapped(speciesId) ? "mapped" : "baseline-only";
}
