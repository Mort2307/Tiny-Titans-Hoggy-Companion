import type { GeneticsDatabase, LocusDefinition } from "./geneticsModel";

const hognoseEvidence = [{
  sourceType: "specialist_database" as const,
  claim: "Arctic and Conda are modelled as separate loci; Grey Fog is represented as a named combination rather than an independent gene.",
  confidence: "moderate" as const,
  note: "Species-specific model. Community terminology and phenotype naming remain evidence-linked rather than silently promoted to genes.",
}];

const arctic: LocusDefinition = {
  id: "heterodon-nasicus-arctic",
  species: "Heterodon nasicus",
  name: "Arctic",
  inheritance: "incomplete_dominant",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true },
    { id: "arctic", name: "Arctic", phenotype: "Arctic" },
  ],
  superStatus: "supported",
  superAlleleId: "arctic",
  evidence: hognoseEvidence,
};

const conda: LocusDefinition = {
  id: "heterodon-nasicus-conda",
  species: "Heterodon nasicus",
  name: "Conda",
  inheritance: "incomplete_dominant",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true },
    { id: "conda", name: "Conda", phenotype: "Conda" },
  ],
  superStatus: "supported",
  superAlleleId: "conda",
  evidence: hognoseEvidence,
};

export const HOGNOSE_GENETICS_DATABASE: GeneticsDatabase = {
  loci: [arctic, conda],
  combinations: [{
    id: "heterodon-nasicus-grey-fog",
    species: "Heterodon nasicus",
    name: "Grey Fog",
    aliases: ["Arctic Conda"],
    componentLocusIds: [arctic.id, conda.id],
    status: "recognised",
    evidence: hognoseEvidence,
  }],
};
