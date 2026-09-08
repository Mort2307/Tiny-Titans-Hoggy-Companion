import type { GeneticsDatabase, LocusDefinition } from "./geneticsModel.ts";

const species = "Heterodon nasicus";
const evidence = (claim: string, confidence: "high" | "moderate" | "limited" | "unresolved" = "moderate") => [{
  sourceType: "specialist_database" as const,
  claim,
  confidence,
  source: "https://www.hognose-morphs.com/morphs/all",
  note: "Named combinations remain phenotype labels; the underlying loci are modelled separately. Hognose Hub is used as a secondary cross-check for component genetics.",
}, {
  sourceType: "specialist_database" as const,
  claim: "Western Hognose component genetics cross-check.",
  confidence,
  source: "https://hognosehub.com/genetics-lab/guide",
}];

const recessive = (id: string, name: string, aliases: string[] = []): LocusDefinition => ({
  id: `heterodon-nasicus-${id}`,
  species,
  name,
  inheritance: "recessive",
  alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id, name, aliases, phenotype: name }],
  superStatus: "not_applicable",
  evidence: evidence(`${name} is modelled as a recessive Western Hognose trait.`),
});

const dominant = (id: string, name: string, aliases: string[] = []): LocusDefinition => ({
  id: `heterodon-nasicus-${id}`,
  species,
  name,
  inheritance: "dominant",
  alleles: [{ id: "wild", name: "Wild type", isWildType: true }, { id, name, aliases, phenotype: name }],
  superStatus: "not_applicable",
  evidence: evidence(`${name} is listed as a dominant Western Hognose trait.`),
});

const arcticAntarctic: LocusDefinition = {
  id: "heterodon-nasicus-arctic-antarctic",
  species,
  name: "Arctic / Antarctic",
  inheritance: "allelic",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true },
    { id: "arctic", name: "Arctic", phenotype: "Arctic" },
    { id: "antarctic", name: "Antarctic", phenotype: "Antarctic" },
  ],
  superStatus: "supported",
  superAlleleId: "arctic",
  evidence: evidence("Arctic and Antarctic are represented as alleles of the same locus; Arctic/Antarctic is a compound heterozygous expression rather than two independent loci.", "high"),
  notes: "Arctic x2 is Superarctic. Antarctic x2 is Superantarctic. Arctic/Antarctic is compound heterozygous.",
};

const conda: LocusDefinition = {
  id: "heterodon-nasicus-conda",
  species,
  name: "Conda / Anaconda",
  inheritance: "incomplete_dominant",
  alleles: [
    { id: "wild", name: "Wild type", isWildType: true },
    { id: "conda", name: "Conda", aliases: ["Anaconda"], phenotype: "Conda" },
  ],
  superStatus: "supported",
  superAlleleId: "conda",
  evidence: evidence("Conda/Anaconda is an incomplete-dominant Western Hognose pattern-reduction mutation. One copy is Conda/Anaconda; two copies are Superconda.", "high"),
  notes: "Conda and Anaconda are lookup aliases for the same locus. Superconda is the two-copy state.",
};

const loci: LocusDefinition[] = [
  recessive("albino", "Albino", ["Amelanistic", "Amel"]),
  recessive("axanthic", "Axanthic", ["Anery", "Anerythristic"]),
  recessive("caramel", "Caramel"),
  recessive("evans-hypo", "Evan's Hypo", ["Evans Hypo", "Dutch Hypo", "Hypo"]),
  recessive("lavender", "Lavender", ["Lav"]),
  recessive("leucistic", "Leucistic", ["Lucy"]),
  recessive("pink-pastel-albino", "Pink Pastel Albino", ["PPA"]),
  recessive("pistachio", "Pistachio"),
  recessive("sable", "Sable"),
  recessive("swiss-chocolate", "Swiss Chocolate", ["Swiss Choc", "Chocolate"]),
  recessive("toffeebelly", "Toffeebelly", ["Toffee Belly", "Toffee"]),
  dominant("cinnamon", "Cinnamon"),
  dominant("skullface", "Skullface"),
  arcticAntarctic,
  conda,
];

export const HOGNOSE_GENETICS_DATABASE: GeneticsDatabase = {
  loci,
  combinations: [
    {
      id: "heterodon-nasicus-grey-fog",
      species,
      name: "Grey Fog",
      aliases: ["Arctic Conda", "Arctic Anaconda"],
      componentLocusIds: [arcticAntarctic.id, conda.id],
      components: [{ locusId: arcticAntarctic.id, alleleId: "arctic" }, { locusId: conda.id, alleleId: "conda" }],
      status: "recognised",
      evidence: evidence("Grey Fog is Arctic x1 + Conda/Anaconda x1.", "high"),
    },
    {
      id: "heterodon-nasicus-moonstruck",
      species,
      name: "Moonstruck",
      aliases: ["Arctic Conda Lavender", "Lavender Arctic Conda"],
      componentLocusIds: [arcticAntarctic.id, conda.id, "heterodon-nasicus-lavender"],
      components: [{ locusId: arcticAntarctic.id, alleleId: "arctic" }, { locusId: conda.id, alleleId: "conda" }, { locusId: "heterodon-nasicus-lavender", alleleId: "lavender" }],
      status: "recognised",
      evidence: evidence("Moonstruck is Lavender x2 + Arctic x1 + Conda/Anaconda x1.", "high"),
    },
    {
      id: "heterodon-nasicus-platinum",
      species,
      name: "Platinum",
      aliases: ["Arctic Superconda", "Arctic Super Conda"],
      componentLocusIds: [arcticAntarctic.id, conda.id],
      components: [{ locusId: arcticAntarctic.id, alleleId: "arctic" }, { locusId: conda.id, alleleId: "conda", copies: 2 }],
      status: "recognised",
      evidence: evidence("Platinum is Arctic x1 + Superconda (Conda x2).", "high"),
    },
    {
      id: "heterodon-nasicus-crystal-diamond-superconda",
      species,
      name: "Crystal Diamond Superconda",
      aliases: ["Superarctic Coral Superconda"],
      componentLocusIds: ["heterodon-nasicus-albino", "heterodon-nasicus-lavender", arcticAntarctic.id, conda.id],
      components: [
        { locusId: "heterodon-nasicus-albino", alleleId: "albino", copies: 2 },
        { locusId: "heterodon-nasicus-lavender", alleleId: "lavender", copies: 2 },
        { locusId: arcticAntarctic.id, alleleId: "arctic", copies: 2 },
        { locusId: conda.id, alleleId: "conda", copies: 2 },
      ],
      status: "recognised",
      evidence: evidence("Crystal Diamond Superconda is Albino x2 + Lavender x2 + Superarctic (Arctic x2) + Superconda (Conda x2).", "high"),
    },
  ],
};
