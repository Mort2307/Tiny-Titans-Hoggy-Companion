import type { MasterMorphDefinition } from "../data/masterMorphDatabase.ts";
import { SPECIES_GENETICS_CATALOGUES } from "../data/species/speciesGeneticsCatalogues.ts";
import { SPECIES_GENETICS_COMBINATIONS } from "../data/species/speciesGeneticsCombinations.ts";
import type { GeneticsDatabase, LocusDefinition, InheritanceModel, EvidenceRecord, CombinationDefinition } from "./geneticsModel.ts";
import { CORN_SNAKE_GENETICS_DATABASE } from "./cornSnakeGenetics.ts";
import { HOGNOSE_GENETICS_DATABASE } from "./hognoseGenetics.ts";

export const SPECIES_GENETICS_CATALOGUES_EXPANDED = SPECIES_GENETICS_CATALOGUES;

const inheritanceMap: Record<string, InheritanceModel> = { Recessive: "recessive", Dominant: "dominant", "Incomplete Dominant": "incomplete_dominant", "Co-Dominant": "codominant", Polygenic: "polygenic", "Line-bred": "line_bred", Unknown: "unknown" };
const explicitAllelicOverrides = new Set(["pantherophis guttatus|amel", "pantherophis guttatus|amelanistic / albino", "pantherophis guttatus|ultra", "pantherophis guttatus|motley", "pantherophis guttatus|stripe", "heterodon nasicus|arctic", "heterodon nasicus|conda"]);

function sourceTypeFor(morph: MasterMorphDefinition): EvidenceRecord["sourceType"] {
  const type = morph.sourceLinks?.[0]?.type;
  if (type === "scientific-literature") return "peer_reviewed";
  if (type === "taxonomy") return "taxonomy";
  if (type === "breeder-reference") return "documented_breeder";
  if (type === "community-reference") return "community";
  return "specialist_database";
}

function evidenceFor(morph: MasterMorphDefinition): EvidenceRecord[] {
  const confidence: EvidenceRecord["confidence"] = morph.evidenceStatus === "confirmed" || morph.verification === "Confirmed" ? "high" : morph.evidenceStatus === "unresolved" || morph.verification === "Unverified" ? "unresolved" : "moderate";
  return [{ sourceType: sourceTypeFor(morph), claim: `${morph.name}: ${morph.description}`, confidence, source: morph.sourceLinks?.[0]?.url ?? morph.sourceUrl, note: morph.evidenceNote ?? morph.educationalNotes }];
}

function catalogueLocus(species: string, morph: MasterMorphDefinition): LocusDefinition | undefined {
  if (!morph.isGene || morph.kind !== "Gene") return undefined;
  if (explicitAllelicOverrides.has(`${species.trim().toLowerCase()}|${morph.name.trim().toLowerCase()}`)) return undefined;
  const inheritance = inheritanceMap[morph.inheritance] ?? "unknown";
  if (["polygenic", "line_bred", "unknown", "complex"].includes(inheritance)) return undefined;
  return { id: `catalogue:${species}:${morph.geneId}`, species, name: morph.name, inheritance, alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id: morph.geneId, name: morph.name, aliases: morph.aliases, phenotype: morph.name }], superStatus: inheritance === "incomplete_dominant" || inheritance === "codominant" ? "unresolved" : "not_applicable", evidence: evidenceFor(morph), notes: "Compatibility locus generated from the species catalogue. Explicit allelic-series definitions override this fallback model." };
}

const catalogueLoci = Object.entries(SPECIES_GENETICS_CATALOGUES_EXPANDED).flatMap(([species, traits]: [string, MasterMorphDefinition[]]) => traits.map((trait) => catalogueLocus(species, trait)).filter((value): value is LocusDefinition => Boolean(value)));
export const GENETICS_DATABASE: GeneticsDatabase = { loci: [...catalogueLoci, ...CORN_SNAKE_GENETICS_DATABASE.loci, ...HOGNOSE_GENETICS_DATABASE.loci], combinations: [...SPECIES_GENETICS_COMBINATIONS, ...CORN_SNAKE_GENETICS_DATABASE.combinations, ...HOGNOSE_GENETICS_DATABASE.combinations] };
export function getSpeciesLoci(species: string): LocusDefinition[] { return GENETICS_DATABASE.loci.filter((locus) => locus.species === species); }
export function getEvidenceForLocus(locus: LocusDefinition): EvidenceRecord[] { return locus.evidence; }
export function getMasterCatalogueEvidence(morph: MasterMorphDefinition): EvidenceRecord[] { return evidenceFor(morph); }
export function getCombinationByName(species: string, name: string): CombinationDefinition | undefined { const query = name.trim().toLowerCase(); return GENETICS_DATABASE.combinations.find((entry) => entry.species === species && [entry.name, entry.id, ...(entry.aliases ?? [])].some((value) => value.toLowerCase() === query)); }
export function countSpeciesLoci(species: string): number { return getSpeciesLoci(species).length; }
export function getMasterMorphById(geneId: string): MasterMorphDefinition | undefined {
  return Object.values(SPECIES_GENETICS_CATALOGUES_EXPANDED).flat().find((morph) => morph.geneId === geneId);
}