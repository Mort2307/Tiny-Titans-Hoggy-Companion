import type { GeneticsDatabase, LocusDefinition } from "./geneticsModel.ts";

const evidence = (claim: string) => [{
  sourceType: "specialist_database" as const,
  claim,
  confidence: "moderate" as const,
  note: "Species-specific genetics model entry. Keep molecularly unresolved relationships explicitly marked until the evidence supports a stronger classification.",
}];

const cornAmelLocus: LocusDefinition = {
  id: "pantherophis-guttatus-amel-locus",
  species: "Pantherophis guttatus",
  name: "Amel locus",
  inheritance: "allelic",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true, phenotype: "Normal pigmentation" },
    { id: "amel", name: "Amel", aliases: ["Amelanistic", "Albino"], phenotype: "Amelanistic / Albino" },
    { id: "ultra", name: "Ultra", phenotype: "Ultra phenotype" },
  ],
  superStatus: "not_applicable",
  evidence: evidence("Amel and Ultra are modelled as alternative alleles at one locus rather than independent genes."),
  notes: "Allelic-series modelling prevents double-counting Amel and Ultra as separate loci.",
};

const cornPatternLocus: LocusDefinition = {
  id: "pantherophis-guttatus-pattern-locus",
  species: "Pantherophis guttatus",
  name: "Motley/Stripe locus",
  inheritance: "allelic",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true, phenotype: "Normal pattern" },
    { id: "motley", name: "Motley", phenotype: "Motley pattern" },
    { id: "stripe", name: "Stripe", phenotype: "Stripe pattern" },
  ],
  superStatus: "not_applicable",
  evidence: evidence("Motley and Stripe are modelled as an allelic series for calculator purposes where they occupy the same recognised pattern locus."),
};

export const CORN_SNAKE_GENETICS_DATABASE: GeneticsDatabase = {
  loci: [cornAmelLocus, cornPatternLocus],
  combinations: [],
};