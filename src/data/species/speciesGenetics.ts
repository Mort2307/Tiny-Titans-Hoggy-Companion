import { calculatorNamedCombinations } from "../geneticsComboRegistry";
import {
  getMasterCalculatorMorphs,
  getMasterHetGenes,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_EXPANSION_BATCH_1 } from "./speciesGeneticsExpansionBatch1";
import { SPECIES_GENETICS_EXPANSION_BATCH_2 } from "./speciesGeneticsExpansionBatch2";
import { getSpeciesGeneticsCoverage, getSpeciesGeneticsCoverageSummary } from "./speciesGeneticsCoverage";

type SpeciesRecord = (typeof INITIAL_SNAKE_SPECIES)[number];
export type SpeciesGeneticsStatus = "mapped" | "partial" | "baseline-only";

const normalise = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[×✕]/g, "x").replace(/\s+/g, " ");

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

function composeSpeciesCatalogues(): Record<string, MasterMorphDefinition[]> {
  const result: Record<string, MasterMorphDefinition[]> = {};
  const batches = [
    SPECIES_GENETICS_CATALOGUES,
    SPECIES_GENETICS_EXPANSION_BATCH_1,
    SPECIES_GENETICS_EXPANSION_BATCH_2,
  ];
  for (const batch of batches) {
    for (const [speciesName, traits] of Object.entries(batch)) {
      const existing = result[speciesName] ?? [];
      result[speciesName] = [
        ...existing,
        ...traits.filter((trait) => !existing.some((entry) => entry.geneId === trait.geneId || normalise(entry.name) === normalise(trait.name))),
      ];
    }
  }
  return result;
}

const SPECIES_CATALOGUES = composeSpeciesCatalogues();

function getSpeciesRecord(speciesId: string | null | undefined): SpeciesRecord | undefined {
  return speciesId ? INITIAL_SNAKE_SPECIES.find((species) => species.id === speciesId) : undefined;
}

function isHognose(speciesId: string | null | undefined): boolean {
  return speciesId === "heterodon-nasicus";
}

function getCatalogue(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  return species ? SPECIES_CATALOGUES[species.acceptedScientificName] ?? [] : [];
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = SPECIES_CATALOGUES[species.acceptedScientificName] ?? [];
  const name = species.commonNames[0] ?? species.acceptedScientificName;
  return [normalTrait(name), ...mapped];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterHetGenes();
  return getCatalogue(speciesId).filter((morph) =>
    morph.isGene === true &&
    morph.kind === "Gene" &&
    morph.hetPossible === true &&
    morph.evidenceStatus === "confirmed" &&
    morph.verification === "Confirmed",
  );
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  return getCatalogue(speciesId).filter((morph) =>
    morph.isGene === true &&
    morph.kind === "Gene" &&
    ["Recessive", "Incomplete Dominant", "Dominant"].includes(morph.inheritance) &&
    morph.evidenceStatus === "confirmed" &&
    morph.verification === "Confirmed",
  );
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  if (!speciesId) return "baseline-only";
  if (isHognose(speciesId)) return "mapped";
  const coverage = getSpeciesGeneticsCoverage(speciesId);
  return coverage?.traitCount ? "partial" : "baseline-only";
}

export type GeneticsSearchEvidence = {
  verification: string;
  status: string;
  note?: string;
  confidence: "confirmed" | "recognised" | "unknown";
};

export type GeneticsSearchResult = {
  entry: MasterMorphDefinition;
  speciesId: string;
  speciesName: string;
  score: number;
  matchedOn: string[];
  aliases: string[];
  components: Array<{ geneId: string; name: string; copies: number }>;
  calculatorEligible: boolean;
  evidence: GeneticsSearchEvidence;
  explanation: string;
};

function getSpeciesName(species: SpeciesRecord): string {
  return species.commonNames[0] ?? species.acceptedScientificName;
}

function confidenceFromEvidence(entry: MasterMorphDefinition): GeneticsSearchEvidence["confidence"] {
  const status = String(entry.evidenceStatus ?? "").toLowerCase();
  const verification = String(entry.verification ?? "").toLowerCase();
  if (status === "confirmed" || verification === "confirmed") return "confirmed";
  if (verification === "recognised" || status === "recognised") return "recognised";
  return "unknown";
}

function scoreField(value: string, query: string, exact: number, starts: number, contains: number, tokenScore: number): number {
  const field = normalise(value);
  const tokens = query.split(" ").filter(Boolean);
  if (!field) return 0;
  if (field === query) return exact;
  if (field.startsWith(query)) return starts;
  if (field.includes(query)) return contains;
  if (tokens.length > 1 && tokens.every((token) => field.split(" ").some((part) => part.startsWith(token)))) return tokenScore;
  return 0;
}

function resolveSearchComponents(entry: MasterMorphDefinition, speciesEntries: MasterMorphDefinition[]): GeneticsSearchResult["components"] {
  return (entry.components ?? []).map((component) => {
    const resolved = speciesEntries.find((candidate) =>
      candidate.geneId === component.morphId ||
      normalise(candidate.name) === normalise(component.morphId) ||
      (candidate.aliases ?? []).some((alias) => normalise(alias) === normalise(component.morphId)),
    );
    return {
      geneId: component.morphId,
      name: resolved?.name ?? component.morphId,
      copies: component.copies ?? (component.type === "Super" ? 2 : 1),
    };
  });
}

function buildExplanation(entry: MasterMorphDefinition, components: GeneticsSearchResult["components"]): string {
  if (entry.kind === "Combination" && components.length) {
    return `${entry.name} is a recognised combination, not a separate locus: ${components.map((component) => `${component.name}${component.copies > 1 ? ` ×${component.copies}` : ""}`).join(" + ")}.`;
  }
  if (entry.kind === "Polygenic" || entry.inheritance === "Polygenic") {
    return `${entry.name} is recorded as polygenic evidence and is intentionally excluded from Mendelian locus calculations.`;
  }
  if (entry.kind === "Line-bred" || entry.inheritance === "Line-bred") {
    return `${entry.name} is recorded as line-bred evidence and is intentionally excluded from Mendelian locus calculations.`;
  }
  if (!entry.isGene || entry.inheritance === "Unknown") {
    return `${entry.name} is a species-scoped reference record; Tiny Titans does not infer a calculable locus from phenotype alone.`;
  }
  if (entry.inheritance === "Recessive") {
    return `${entry.name} is catalogued as a recessive gene. Individual animal state still depends on documented lineage/genotype evidence.`;
  }
  return `${entry.name} is catalogued as ${entry.inheritance}. Tiny Titans will not infer homozygous/super state unless the individual record explicitly supports it.`;
}

/** Species-aware genetics search. Search never falls back across species. */
export function searchGenetics(
  speciesId: string | null | undefined,
  query: string,
  options?: { limit?: number },
): GeneticsSearchResult[] {
  if (!speciesId) return [];
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];

  const speciesEntries = getSpeciesVisualMorphs(speciesId);
  const searchEntries = isHognose(speciesId)
    ? [...speciesEntries, ...calculatorNamedCombinations.filter((combo) => !speciesEntries.some((entry) => entry.geneId === combo.geneId))]
    : speciesEntries;
  const q = normalise(query);
  const limit = Math.max(1, options?.limit ?? 100);
  const calculatorIds = new Set(getSpeciesCalculatorMorphs(speciesId).map((entry) => entry.geneId));
  const speciesName = getSpeciesName(species);

  if (!q) {
    return searchEntries.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit).map((entry) => {
      const components = resolveSearchComponents(entry, speciesEntries);
      return {
        entry,
        speciesId,
        speciesName,
        score: 0,
        matchedOn: [],
        aliases: entry.aliases ?? [],
        components,
        calculatorEligible: calculatorIds.has(entry.geneId),
        evidence: {
          verification: entry.verification,
          status: entry.evidenceStatus ?? entry.verification,
          note: entry.evidenceNote,
          confidence: confidenceFromEvidence(entry),
        },
        explanation: buildExplanation(entry, components),
      };
    });
  }

  return searchEntries.map((entry) => {
    const matchedOn: string[] = [];
    let score = 0;
    const nameScore = scoreField(entry.name, q, 1200, 850, 500, 300);
    if (nameScore) { score += nameScore; matchedOn.push("name"); }
    for (const alias of entry.aliases ?? []) {
      const aliasScore = scoreField(alias, q, 1100, 800, 475, 275);
      if (aliasScore) { score = Math.max(score, aliasScore) + Math.min(aliasScore, 225); matchedOn.push("alias"); }
    }
    for (const component of entry.components ?? []) {
      const componentScore = scoreField(component.morphId, q, 700, 550, 400, 225);
      if (componentScore) { score = Math.max(score, componentScore); matchedOn.push("component"); }
    }
    if (!score) return null;
    const components = resolveSearchComponents(entry, speciesEntries);
    return {
      entry,
      speciesId,
      speciesName,
      score,
      matchedOn,
      aliases: entry.aliases ?? [],
      components,
      calculatorEligible: calculatorIds.has(entry.geneId),
      evidence: {
        verification: entry.verification,
        status: entry.evidenceStatus ?? entry.verification,
        note: entry.evidenceNote,
        confidence: confidenceFromEvidence(entry),
      },
      explanation: buildExplanation(entry, components),
    } satisfies GeneticsSearchResult;
  }).filter((result): result is GeneticsSearchResult => result !== null).sort((a, b) => b.score - a.score).slice(0, limit);
}

export { getSpeciesGeneticsCoverageSummary };
