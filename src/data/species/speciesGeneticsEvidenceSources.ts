/**
 * Genetics evidence sources used by the species-scoped genetics layer.
 *
 * This is intentionally broader than any single morph marketplace. The app
 * should triangulate captive genetics from specialist databases, documented
 * breeder/proof-cross material, veterinary/scientific literature, and current
 * community records. Taxonomic sources are kept separate from morph claims.
 */
export type GeneticsEvidenceTier =
  | "molecular"
  | "peer-reviewed"
  | "specialist-genetics"
  | "documented-breeder"
  | "community"
  | "taxonomy";

export type GeneticsEvidenceSource = {
  id: string;
  publisher: string;
  title: string;
  url: string;
  tier: GeneticsEvidenceTier;
  useFor: string[];
  notes: string;
};

export const SPECIES_GENETICS_EVIDENCE_SOURCES: GeneticsEvidenceSource[] = [
  {
    id: "reptileDatabase",
    publisher: "The Reptile Database",
    title: "The Reptile Database",
    url: "https://www.reptile-database.org/",
    tier: "taxonomy",
    useFor: ["accepted scientific names", "synonyms", "species identity", "taxonomic scope"],
    notes: "Taxonomic authority/reference. Do not use species taxonomy alone to infer captive morph inheritance.",
  },
  {
    id: "reptidex",
    publisher: "ReptiDex",
    title: "Reptile Morph Guide & Genetics Library",
    url: "https://reptidex.com/genetics",
    tier: "specialist-genetics",
    useFor: ["alleles", "loci", "inheritance", "combo formulas", "super forms", "risk alleles"],
    notes: "Specialist genetics database with explicit allele/locus/inheritance modelling. Use as an important current cross-check, not as the sole authority.",
  },
  {
    id: "morphMarketMorphpedia",
    publisher: "MorphMarket",
    title: "Morphpedia",
    url: "https://www.morphmarket.com/morphpedia/",
    tier: "specialist-genetics",
    useFor: ["species trait records", "inheritance claims", "recognised morph names", "proof-cross community records"],
    notes: "Species/trait-focused captive genetics reference. Conflicts and revisions must remain visible rather than silently overwritten.",
  },
  {
    id: "southMountainReptilesCorn",
    publisher: "South Mountain Reptiles",
    title: "Corn Snake Morph Photos",
    url: "https://cornsnake.net/pages/corn-snake-morph-photos",
    tier: "documented-breeder",
    useFor: ["corn snake morph identity", "combo naming", "line/breeder terminology"],
    notes: "Long-running specialist breeder reference. Useful for phenotype/combo corroboration and trade terminology.",
  },
  {
    id: "gossBoaGenetics",
    publisher: "Goss Reptiles",
    title: "Boa Genetics",
    url: "https://www.gossreptiles.com/boagenetics",
    tier: "documented-breeder",
    useFor: ["boa inheritance examples", "Punnett outcomes", "combo naming", "het notation"],
    notes: "Detailed breeder genetics reference. Best used alongside current genetics databases and source reconciliation.",
  },
  {
    id: "myReptileAtlasBoa",
    publisher: "My Reptile Atlas",
    title: "Boa Constrictor Genetics Calculator",
    url: "https://myreptileatlas.com/calculator/boa-constrictor",
    tier: "specialist-genetics",
    useFor: ["boa loci", "allelic complexes", "line-specific albino/anery distinctions", "pairing safety"],
    notes: "Current calculator/reference explicitly distinguishes multiple boa albino and anery lines and known locus interactions.",
  },
  {
    id: "pubmedBallPythonMorphs",
    publisher: "PubMed / peer-reviewed literature",
    title: "A community-science approach identifies genetic variants associated with three color morphs in ball pythons",
    url: "https://pubmed.ncbi.nlm.nih.gov/36260636/",
    tier: "molecular",
    useFor: ["molecular support", "candidate causal variants", "ball python Albino", "ball python Lavender Albino", "ball python Ultramel"],
    notes: "Peer-reviewed molecular evidence. Molecular association is kept distinct from captive inheritance terminology and phenotype naming.",
  },
  {
    id: "scienceDirectReptileColorGenetics",
    publisher: "Seminars in Cell & Developmental Biology",
    title: "Genetics and evolution of colour patterns in reptiles",
    url: "https://www.sciencedirect.com/science/article/pii/S1084952113000530",
    tier: "peer-reviewed",
    useFor: ["general reptile colour genetics", "Mendelian inheritance context", "limits of evidence", "pattern polymorphism"],
    notes: "Background review supporting cautious interpretation of colour polymorphisms and the limits of extrapolating between taxa.",
  },
];

export const GENETICS_EVIDENCE_POLICY = {
  hierarchy: [
    "molecular",
    "peer-reviewed",
    "specialist-genetics",
    "documented-breeder",
    "community",
    "taxonomy",
  ] as GeneticsEvidenceTier[],
  rules: [
    "Never infer inheritance solely from phenotype appearance.",
    "Never transfer a same-named locus between species without species-specific evidence.",
    "A combination name is a phenotype/composition label, not a standalone locus.",
    "A super form is generated from copy state when the underlying locus supports homozygosity; it is not entered as a fake independent gene.",
    "Allelic complexes and alternate lines must retain distinct identities where complementation/proof-cross evidence supports that distinction.",
    "Conflicting or community-only claims remain explicitly marked rather than silently upgraded to confirmed.",
    "Taxonomy validates the animal's species identity; it does not validate a morph's inheritance.",
  ],
} as const;
