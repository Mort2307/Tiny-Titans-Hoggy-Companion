import type { MasterMorphDefinition } from "../masterMorphDatabase";

const trait = (
  speciesKey: string,
  name: string,
  inheritance: MasterMorphDefinition["inheritance"],
  sourceUrl: string,
  sourceLabel = "ReptiNode",
  aliases: string[] = [],
  kind: MasterMorphDefinition["kind"] = "Gene",
): MasterMorphDefinition => ({
  geneId: `${speciesKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  aliases,
  kind,
  isGene: kind === "Gene",
  category: kind === "Gene" ? "Species gene" : kind,
  inheritance,
  hetPossible: kind === "Gene" && inheritance === "Recessive",
  verification: "Recognised",
  description: `Species-scoped ${name} trait supported by the current multi-source genetics evidence set.`,
  educationalNotes: "Species-scoped reference entry. Keep taxon, locality/line and individual breeder proof visible before treating a genetic claim as proven.",
  sourceUrl,
  sourceLabel,
});

const REPTINODE = "https://reptinode.fr/en/genetics/";

export const SPECIES_GENETICS_EXPANSION_BATCH_5: Record<string, MasterMorphDefinition[]> = {
  "Python bivittatus": [
    trait("python-bivittatus", "Albino (T−)", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Albino", "Amelanistic", "Amel", "T- Albino"]),
    trait("python-bivittatus", "Patternless (Green)", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Patternless", "Green"]),
    trait("python-bivittatus", "Granite", "Recessive", `${REPTINODE}python-bivittatus`),
    trait("python-bivittatus", "Labyrinth", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Laby"]),
    trait("python-bivittatus", "Hypomelanistic", "Incomplete Dominant", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Hypo", "Super Hypo", "Ivory"]),
    trait("python-bivittatus", "Caramel (Ultramel T+)", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Ultramel Caramel", "T+ Caramel", "Ultramel"]),
    trait("python-bivittatus", "Caramel (Gulf Coast T+)", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Gulf Coast Caramel"]),
    trait("python-bivittatus", "Caramel (Waterview/WEI T+)", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Waterview Caramel", "WEI Caramel"]),
    trait("python-bivittatus", "Piebald", "Recessive", `${REPTINODE}python-bivittatus`, "ReptiNode", ["Pied"]),
  ],

  "Python brongersmai": [
    trait("python-brongersmai", "Albino (T+)", "Recessive", `${REPTINODE}python-brongersmai`, "ReptiNode", ["T+ Albino"]),
    trait("python-brongersmai", "Albino (T−)", "Recessive", `${REPTINODE}python-brongersmai`, "ReptiNode", ["T- Albino"]),
    trait("python-brongersmai", "Matrix", "Incomplete Dominant", `${REPTINODE}python-brongersmai`),
    trait("python-brongersmai", "Goldeneye", "Incomplete Dominant", `${REPTINODE}python-brongersmai`, "ReptiNode", ["GE"]),
    trait("python-brongersmai", "Batik", "Incomplete Dominant", `${REPTINODE}python-brongersmai`),
    trait("python-brongersmai", "Genetic Stripe", "Incomplete Dominant", `${REPTINODE}python-brongersmai`, "ReptiNode", ["G-Stripe"]),
    trait("python-brongersmai", "Piebald", "Recessive", `${REPTINODE}python-brongersmai`, "ReptiNode", ["Pied"]),
  ],

  "Boaedon capensis": [
    trait("boaedon-capensis", "Scaleless", "Recessive", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["Silky"]),
    trait("boaedon-capensis", "Albino (T−)", "Recessive", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["Albino", "Amelanistic", "T- Albino"]),
    trait("boaedon-capensis", "Albino (T+) / Butter", "Recessive", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["T+ Albino", "Butter"]),
    trait("boaedon-capensis", "Anerythristic", "Recessive", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["Anery"]),
    trait("boaedon-capensis", "Hypomelanistic (Illico / Ghost)", "Incomplete Dominant", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["Hypo", "Illico", "Ghost"]),
    trait("boaedon-capensis", "Pied", "Recessive", `${REPTINODE}boaedon-capensis`, "ReptiNode", ["Piebald"]),
    trait("boaedon-capensis", "Patternless", "Recessive", `${REPTINODE}boaedon-capensis`),
  ],

  "Thamnophis sirtalis": [
    trait("thamnophis-sirtalis", "Albino (T−)", "Recessive", `${REPTINODE}thamnophis-sirtalis`, "ReptiNode", ["Albino", "Amelanistic"]),
    trait("thamnophis-sirtalis", "Anerythristic", "Recessive", `${REPTINODE}thamnophis-sirtalis`, "ReptiNode", ["Anery"]),
    trait("thamnophis-sirtalis", "Melanistic", "Recessive", `${REPTINODE}thamnophis-sirtalis`, "ReptiNode", ["Black"]),
    trait("thamnophis-sirtalis", "Granite / Speckled", "Recessive", `${REPTINODE}thamnophis-sirtalis`, "ReptiNode", ["Granite", "Speckled"]),
  ],

  "Corallus batesii": [
    trait("corallus-batesii", "Melanistic (Black Basin)", "Recessive", `${REPTINODE}corallus-batesii`, "ReptiNode", ["Black Basin", "Melanistic"]),
    trait("corallus-batesii", "Pied / Calico (Anomalie)", "Dominant", `${REPTINODE}corallus-batesii`, "ReptiNode", ["Pied", "Calico", "Anomalie"]),
  ],

  "Zamenis longissimus": [
    trait("zamenis-longissimus", "Albino (T−)", "Recessive", `${REPTINODE}zamenis-longissimus`, "ReptiNode", ["Albino", "Amelanistic"]),
    trait("zamenis-longissimus", "Hypomelanistic Dilute", "Recessive", `${REPTINODE}zamenis-longissimus`, "ReptiNode", ["Hypo", "Dilute"]),
    trait("zamenis-longissimus", "Genetic Black / Melanistic", "Dominant", `${REPTINODE}zamenis-longissimus`, "ReptiNode", ["Melanistic", "Black"]),
  ],
};
