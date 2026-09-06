import type { MasterMorphDefinition } from "../masterMorphDatabase";

const trait = (
  speciesKey: string,
  name: string,
  inheritance: MasterMorphDefinition["inheritance"],
  sourceUrl: string,
  sourceLabel: string,
  aliases: string[] = [],
  notes?: string,
): MasterMorphDefinition => ({
  geneId: `${speciesKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  aliases,
  kind: "Gene",
  isGene: true,
  category: "Species gene",
  inheritance,
  hetPossible: inheritance === "Recessive",
  verification: "Recognised",
  description: `Species-scoped ${name} trait supported by the current multi-source genetics evidence set.`,
  educationalNotes: notes ?? "Species-scoped reference entry. Confirm lineage, proof crosses and breeder documentation before treating an individual animal as genetically proven.",
  sourceUrl,
  sourceLabel,
});

/**
 * Multi-source expansion wave.
 *
 * Sources are deliberately stored at the trait level so a future evidence UI
 * can show exactly where a genetics claim came from. These entries are not
 * intended to be silently transferred to other species with the same display
 * name.
 */
export const SPECIES_GENETICS_EXPANSION_BATCH_4: Record<string, MasterMorphDefinition[]> = {
  "Antaresia maculosa": [
    trait("antaresia-maculosa", "Albino", "Recessive", "https://reptinode.fr/en/genetics/antaresia-maculosa", "ReptiNode", ["Amelanistic", "T- Albino"]),
    trait("antaresia-maculosa", "Granite", "Dominant", "https://reptinode.fr/en/genetics/antaresia-maculosa", "ReptiNode", ["Peppered Granite"]),
    trait("antaresia-maculosa", "Ebony", "Dominant", "https://reptinode.fr/en/genetics/antaresia-maculosa", "ReptiNode", ["Hypermelanistic"]),
    trait("antaresia-maculosa", "Axanthic", "Recessive", "https://reptinode.fr/en/genetics/antaresia-maculosa", "ReptiNode"),
  ],

  "Aspidites ramsayi": [
    trait("aspidites-ramsayi", "Albino", "Recessive", "https://reptinode.fr/en/genetics/aspidites-ramsayi", "ReptiNode", ["Amelanistic", "T- Albino"]),
    trait("aspidites-ramsayi", "Axanthic", "Recessive", "https://reptinode.fr/en/genetics/aspidites-ramsayi", "ReptiNode", ["Anery"]),
    trait("aspidites-ramsayi", "Hypo", "Dominant", "https://reptinode.fr/en/genetics/aspidites-ramsayi", "ReptiNode", ["Hypomelanistic"]),
    trait("aspidites-ramsayi", "Jaguar", "Dominant", "https://reptinode.fr/en/genetics/aspidites-ramsayi", "ReptiNode", ["Jag"], "ReptiNode flags this trait as neuro-linked/questionable in its genetics registry; retain the research warning rather than treating the phenotype name as proof of a simple Mendelian locus."),
  ],

  "Lampropeltis getula": [
    trait("lampropeltis-getula", "Albino (T-)", "Recessive", "https://reptinode.fr/en/genetics/lampropeltis-getula", "ReptiNode", ["Albino", "Amelanistic", "T- Albino"]),
    trait("lampropeltis-getula", "Hypomelanistic (Florida Line)", "Dominant", "https://reptinode.fr/en/genetics/lampropeltis-getula", "ReptiNode", ["Florida Hypo", "Brooks Hypo"]),
    trait("lampropeltis-getula", "Axanthic", "Recessive", "https://reptinode.fr/en/genetics/lampropeltis-getula", "ReptiNode", ["Anery"]),
    trait("lampropeltis-getula", "Mosaic / Whitesided", "Dominant", "https://reptinode.fr/en/genetics/lampropeltis-getula", "ReptiNode", ["Mosaic", "Whitesided", "White Side"]),
    trait("lampropeltis-getula", "Lavender (T+ Albino)", "Recessive", "https://reptinode.fr/en/genetics/lampropeltis-getula", "ReptiNode", ["Lavender Albino", "T+ Albino", "Lavender"]),
  ],

  "Lampropeltis nigrita": [
    trait("lampropeltis-nigrita", "Albino (T-)", "Recessive", "https://reptinode.fr/en/genetics/lampropeltis-nigrita", "ReptiNode", ["Albino", "Amelanistic", "T- Albino"]),
    trait("lampropeltis-nigrita", "Hypomelanistic", "Recessive", "https://reptinode.fr/en/genetics/lampropeltis-nigrita", "ReptiNode", ["Hypo"]),
    trait("lampropeltis-nigrita", "Hypermelanistic", "Dominant", "https://reptinode.fr/en/genetics/lampropeltis-nigrita", "ReptiNode", ["Black", "Wild Type Black"]),
  ],

  "Pantherophis obsoletus": [
    trait("pantherophis-obsoletus", "Leucistic (Blue-Eyed)", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode", ["BEL", "Blue Eyed Leucistic", "Leucistic"]),
    trait("pantherophis-obsoletus", "Albino (Amelanistic)", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode", ["Albino", "Amelanistic", "Amel"]),
    trait("pantherophis-obsoletus", "Rusty", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode", ["Erythristic"]),
    trait("pantherophis-obsoletus", "White-Sided", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode", ["Licorice Stick", "Whitesided"]),
    trait("pantherophis-obsoletus", "Hypomelanistic", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode", ["Hypo"]),
    trait("pantherophis-obsoletus", "Calico", "Recessive", "https://reptinode.fr/en/genetics/pantherophis-obsoletus", "ReptiNode"),
  ],

  "Pituophis catenifer": [
    trait("pituophis-catenifer", "Albino (T-)", "Recessive", "https://reptinode.fr/en/genetics/pituophis-catenifer", "ReptiNode", ["Albino", "Amelanistic"]),
    trait("pituophis-catenifer", "Whitesided", "Recessive", "https://reptinode.fr/en/genetics/pituophis-catenifer", "ReptiNode", ["Sockhead", "White Side"]),
    trait("pituophis-catenifer", "Axanthic", "Recessive", "https://reptinode.fr/en/genetics/pituophis-catenifer", "ReptiNode", ["Anery"]),
    trait("pituophis-catenifer", "Patternless", "Recessive", "https://reptinode.fr/en/genetics/pituophis-catenifer", "ReptiNode"),
  ],

  "Aspidites melanocephalus": [
    trait("aspidites-melanocephalus", "Axanthic", "Recessive", "https://reptinode.fr/en/genetics/aspidites-melanocephalus", "ReptiNode", ["Anery"]),
    trait("aspidites-melanocephalus", "Albino (T-)", "Recessive", "https://reptinode.fr/en/genetics/aspidites-melanocephalus", "ReptiNode", ["Albino", "Amelanistic"]),
    trait("aspidites-melanocephalus", "Hypo", "Dominant", "https://reptinode.fr/en/genetics/aspidites-melanocephalus", "ReptiNode", ["Hypomelanistic"]),
  ],

  "Liasis mackloti": [
    trait("liasis-mackloti", "Hypomelanistic (Golden)", "Dominant", "https://reptinode.fr/es/genetics/liasis-mackloti", "ReptiNode", ["Golden Hypo", "Hypo"]),
    trait("liasis-mackloti", "Granite / Speckled", "Dominant", "https://reptinode.fr/es/genetics/liasis-mackloti", "ReptiNode", ["Granite", "Speckled"]),
  ],

  "Bothrochilus boa": [
    trait("bothrochilus-boa", "Patternless / Melanistic", "Dominant", "https://reptinode.fr/genetics/bothrochilus-boa", "ReptiNode", ["Patternless", "Melanistic"], "ReptiNode presents this as a documented registry entry but the name/phenotype is less established than mainstream captive morph loci. Keep evidence state visible."),
  ],
};
