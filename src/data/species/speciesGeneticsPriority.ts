import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { getSpeciesGeneticsCoverage, type SpeciesGeneticsCoverage } from "./speciesGeneticsCoverage";

export type GeneticsEvidencePriority = "tier-1" | "tier-2" | "tier-3" | "watchlist";
export type SpeciesGeneticsPriorityRecord = {
  speciesId: string;
  scientificName: string;
  commonName: string;
  priority: GeneticsEvidencePriority;
  rationale: string;
};

const PRIORITY_BY_SCIENTIFIC_NAME: Record<string, { priority: GeneticsEvidencePriority; rationale: string }> = {
  "Python regius": { priority: "tier-1", rationale: "Multiple species-specific molecularly characterized colour loci and established breeder genetics." },
  "Pantherophis guttatus": { priority: "tier-1", rationale: "Multiple molecularly characterized colour/pattern loci plus extensive established breeding terminology." },
  "Malayopython reticulatus": { priority: "tier-1", rationale: "Long-established captive morph system with documented specialist inheritance records." },
  "Boa constrictor": { priority: "tier-1", rationale: "Large established captive morph system with documented dominant/incomplete-dominant and recessive inheritance." },
  "Morelia spilota": { priority: "tier-1", rationale: "Established captive morph system with documented specialist breeding evidence, including incomplete-dominant traits." },
  "Python bivittatus": { priority: "tier-2", rationale: "Large established captive trait vocabulary; molecular confirmation is more uneven, so evidence should be promoted trait-by-trait." },
  "Lampropeltis triangulum": { priority: "tier-2", rationale: "Strong captive breeding evidence across milk-snake morphs, but species/subspecies trade taxonomy needs careful resolution." },
  "Lampropeltis californiae": { priority: "tier-2", rationale: "Established captive kingsnake morph vocabulary with multiple Mendelian traits requiring species-specific provenance." },
  "Eryx colubrinus": { priority: "tier-2", rationale: "Established sand-boa morph culture with multiple reported inheritance modes; molecular evidence remains comparatively sparse." },
  "Gongylophis colubrinus": { priority: "tier-2", rationale: "Common trade naming overlaps with Eryx colubrinus, so taxonomy and evidence provenance must be kept explicit." },
};

export function getSpeciesGeneticsPriority(speciesId: string): SpeciesGeneticsPriorityRecord | undefined {
  const species = INITIAL_SNAKE_SPECIES.find((entry) => entry.id === speciesId);
  if (!species) return undefined;
  const configured = PRIORITY_BY_SCIENTIFIC_NAME[species.acceptedScientificName];
  const coverage = getSpeciesGeneticsCoverage(speciesId);
  const priority = configured?.priority ?? (coverage?.traitCount ? "tier-3" : "watchlist");
  return {
    speciesId,
    scientificName: species.acceptedScientificName,
    commonName: species.commonNames[0] ?? species.acceptedScientificName,
    priority,
    rationale: configured?.rationale ?? (coverage?.traitCount ? "Some genetics records exist; next step is evidence promotion and taxonomy cleanup." : "No species-specific genetics catalogue yet; gather evidence before adding calculator traits."),
  };
}

export function getSpeciesGeneticsPriorityQueue(): SpeciesGeneticsPriorityRecord[] {
  const rank: Record<GeneticsEvidencePriority, number> = { "tier-1": 0, "tier-2": 1, "tier-3": 2, watchlist: 3 };
  return INITIAL_SNAKE_SPECIES
    .map((species) => getSpeciesGeneticsPriority(species.id))
    .filter((entry): entry is SpeciesGeneticsPriorityRecord => Boolean(entry))
    .sort((a, b) => rank[a.priority] - rank[b.priority] || a.commonName.localeCompare(b.commonName));
}

export function getSpeciesGeneticsPriorityCoverage() {
  const queue = getSpeciesGeneticsPriorityQueue();
  return {
    speciesCount: queue.length,
    tier1: queue.filter((entry) => entry.priority === "tier-1").length,
    tier2: queue.filter((entry) => entry.priority === "tier-2").length,
    tier3: queue.filter((entry) => entry.priority === "tier-3").length,
    watchlist: queue.filter((entry) => entry.priority === "watchlist").length,
  };
}
