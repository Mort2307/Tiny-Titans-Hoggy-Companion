import {
  getMasterCalculatorMorphs,
  getMasterHetGenes,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import type { SnakeSpeciesRecord } from "./speciesTypes";

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

const ballPythonTrait = (name: string, inheritance: MasterMorphDefinition["inheritance"], options: { aliases?: string[]; hetPossible?: boolean } = {}): MasterMorphDefinition => ({
  geneId: normalise(name).replace(/[^a-z0-9]+/g, "-"),
  name,
  aliases: options.aliases ?? [],
  kind: "Gene",
  isGene: true,
  category: "Species gene",
  inheritance,
  hetPossible: options.hetPossible ?? inheritance === "Recessive",
  verification: "Recognised",
  description: `Recognised ${name} trait for Python regius.`,
  educationalNotes: "Species-scoped catalogue entry. Confirm individual lineage and documentation before treating a genetic claim as proven.",
  sourceUrl: BALL_PYTHON_SOURCE,
  sourceLabel: BALL_PYTHON_SOURCE_LABEL,
});

const BALL_PYTHON_TRAITS: MasterMorphDefinition[] = [
  ballPythonTrait("Albino", "Recessive", { aliases: ["Amelanistic", "Amel"] }),
  ballPythonTrait("Axanthic", "Recessive", { aliases: ["Anery"] }),
  ballPythonTrait("Clown", "Recessive"),
  ballPythonTrait("Desert Ghost", "Recessive", { aliases: ["DG"] }),
  ballPythonTrait("Ghost", "Recessive", { aliases: ["Hypo"] }),
  ballPythonTrait("Genetic Stripe", "Recessive", { aliases: ["G Stripe"] }),
  ballPythonTrait("Lavender Albino", "Recessive", { aliases: ["Lavender", "Lav Albino"] }),
  ballPythonTrait("Piebald", "Recessive", { aliases: ["Pied"] }),
  ballPythonTrait("Puzzle", "Recessive"),
  ballPythonTrait("Tri-Stripe", "Recessive", { aliases: ["Tristripe", "Tri Stripe"] }),
  ballPythonTrait("Ultramel", "Recessive"),
  ballPythonTrait("Banana", "Incomplete Dominant", { aliases: ["Coral Glow"] }),
  ballPythonTrait("Bamboo", "Incomplete Dominant"),
  ballPythonTrait("Black Pastel", "Incomplete Dominant"),
  ballPythonTrait("Butter", "Incomplete Dominant"),
  ballPythonTrait("Cinnamon", "Incomplete Dominant"),
  ballPythonTrait("Fire", "Incomplete Dominant"),
  ballPythonTrait("Lesser", "Incomplete Dominant"),
  ballPythonTrait("Mojave", "Incomplete Dominant"),
  ballPythonTrait("Mystic", "Incomplete Dominant"),
  ballPythonTrait("Orange Dream", "Incomplete Dominant", { aliases: ["OD"] }),
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
  ballPythonTrait("Pinstripe", "Dominant"),
  ballPythonTrait("Spider", "Dominant"),
  ballPythonTrait("Spotnose", "Dominant"),
  ballPythonTrait("Ashen", "Dominant"),
  ballPythonTrait("Citron", "Incomplete Dominant"),
  ballPythonTrait("Enhancer", "Recessive"),
  ballPythonTrait("Jolt", "Incomplete Dominant"),
  ballPythonTrait("Raven", "Incomplete Dominant"),
  ballPythonTrait("Honey", "Incomplete Dominant"),
  ballPythonTrait("Scaleless Head", "Incomplete Dominant"),
  ballPythonTrait("Axanthic (MJ)", "Recessive", { aliases: ["Markus Jayne Axanthic"] }),
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
