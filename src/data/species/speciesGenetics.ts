import {
  getMasterCalculatorMorphs,
  getMasterHetGenes,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
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

export type SpeciesGeneticsStatus = "mapped" | "partial" | "baseline-only";

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
  category: "Species gene",
  inheritance,
  hetPossible: options.hetPossible ?? inheritance === "Recessive",
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
const BALL_PYTHON_SOURCE = `${MORPHMARKET}all/c/reptiles/pythons/ball-pythons`;
const BALL_PYTHON_SOURCE_LABEL = "MorphMarket Ball Python trait index";

const BALL_PYTHON_TRAITS: MasterMorphDefinition[] = [
  trait("Albino", "Recessive", { aliases: ["Amelanistic", "Amel"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Axanthic", "Recessive", { aliases: ["Anery"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Clown", "Recessive", { hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Desert Ghost", "Recessive", { aliases: ["DG"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Ghost", "Recessive", { aliases: ["Hypo"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Genetic Stripe", "Recessive", { aliases: ["G Stripe"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Lavender Albino", "Recessive", { aliases: ["Lavender", "Lav Albino"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Piebald", "Recessive", { aliases: ["Pied"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Puzzle", "Recessive", { hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Tri-Stripe", "Recessive", { aliases: ["Tristripe", "Tri Stripe"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Ultramel", "Recessive", { hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Banana", "Incomplete Dominant", { aliases: ["Coral Glow"], sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Bamboo", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Black Pastel", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Butter", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Cinnamon", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Fire", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Lesser", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Mojave", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Mystic", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Orange Dream", "Incomplete Dominant", { aliases: ["OD"], sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Pastel", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Phantom", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Enchi", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("GHI", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Mahogany", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Red Stripe", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Yellow Belly", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Champagne", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Cypress", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Gravel", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Huffman", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Leopard", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Lori", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Special", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Pinstripe", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Spider", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Spotnose", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Ashen", "Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Citron", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Enhancer", "Recessive", { hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Jolt", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Raven", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Honey", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Scaleless Head", "Incomplete Dominant", { sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
  trait("Axanthic (MJ)", "Recessive", { aliases: ["Markus Jayne Axanthic"], hetPossible: true, sourceUrl: BALL_PYTHON_SOURCE, sourceLabel: BALL_PYTHON_SOURCE_LABEL }),
];

const SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  ...SPECIES_GENETICS_CATALOGUES,
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
  const speciesName = species.commonNames[0] ?? species.acceptedScientificName;
  return mapped?.length ? [normalTrait(speciesName), ...mapped] : [normalTrait(speciesName)];
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
  return [];
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  if (!speciesId) return "baseline-only";
  if (isHognose(speciesId)) return "mapped";
  const species = getSpeciesRecord(speciesId);
  return species && SPECIES_CATALOGUES[species.acceptedScientificName] ? "partial" : "baseline-only";
}
