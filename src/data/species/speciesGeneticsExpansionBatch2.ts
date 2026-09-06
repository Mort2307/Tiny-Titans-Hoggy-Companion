import type { MasterMorphDefinition } from "../masterMorphDatabase";

type InheritanceType = MasterMorphDefinition["inheritance"];

const MM = "https://www.morphmarket.com/morphpedia/";

function trait(
  species: string,
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  aliases: string[] = [],
  kind: MasterMorphDefinition["kind"] = "Gene",
): MasterMorphDefinition {
  const isGene = kind === "Gene";
  return {
    geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aliases,
    kind,
    isGene,
    category: isGene ? "Species gene" : kind,
    inheritance,
    hetPossible: isGene && inheritance === "Recessive",
    verification: "Recognised",
    description: `${name} is recorded here as a species-scoped genetic trait for ${species}.`,
    educationalNotes: "Species-scoped genetics entry. Do not transfer the inheritance model to another species merely because the display name is the same. Confirm lineage, provenance and breeder records for an individual animal.",
    sourceUrl: `${MM}${sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia / community genetics evidence",
  };
}

/**
 * Evidence-backed second expansion wave.
 *
 * This file intentionally contains only species/locus combinations for which
 * a source or accepted genetics discussion can be identified. Trait names are
 * not copied between species merely because they share a display name.
 */
export const SPECIES_GENETICS_EXPANSION_BATCH_2: Record<string, MasterMorphDefinition[]> = {
  "Boaedon capensis": [
    trait("Boaedon capensis", "Blue-Eyed", "Recessive", "house-snakes/blue-eyed/", ["Blue Eyed", "BE"]),
    trait("Boaedon capensis", "Hypo", "Recessive", "house-snakes/hypo/", ["Hypomelanistic"]),
    trait("Boaedon capensis", "T+ Albino", "Recessive", "house-snakes/t-plus-albino/", ["T+", "T Positive Albino"]),
    trait("Boaedon capensis", "T- Albino", "Recessive", "house-snakes/t-minus-albino/", ["T-", "T Negative Albino"]),
  ],

  "Pantherophis obsoletus": [
    trait("Pantherophis obsoletus", "Albino", "Recessive", "rat-snakes/amelanistic/", ["Amelanistic", "Amel"]),
    trait("Pantherophis obsoletus", "Anerythristic", "Recessive", "rat-snakes/anerythristic/", ["Anery"]),
    trait("Pantherophis obsoletus", "Hypomelanistic", "Recessive", "rat-snakes/hypomelanistic/", ["Hypo"]),
    trait("Pantherophis obsoletus", "Whitesided", "Recessive", "rat-snakes/whitesided/", ["White-sided"]),
    trait("Pantherophis obsoletus", "Calico", "Recessive", "rat-snakes/calico/"),
    trait("Pantherophis obsoletus", "Moonshine", "Recessive", "rat-snakes/moonshine/"),
    trait("Pantherophis obsoletus", "Leucistic", "Incomplete Dominant", "rat-snakes/rusty/", ["Super Rusty", "SuperRusty", "Lucy"]),
  ],

  "Elaphe obsoleta lindheimeri": [
    trait("Elaphe obsoleta lindheimeri", "Leucistic", "Recessive", "rat-snakes/leucistic-texas/", ["Blue Eyed Leucistic", "BEL", "Lucy"]),
    trait("Elaphe obsoleta lindheimeri", "Scaleless", "Recessive", "rat-snakes/scaleless/", ["Scaleless Texas"]),
    trait("Elaphe obsoleta lindheimeri", "Albino", "Recessive", "rat-snakes/amelanistic/", ["Amelanistic", "Amel"]),
  ],

  "Pituophis catenifer": [
    trait("Pituophis catenifer", "Albino", "Recessive", "gopher-snakes/albino/", ["Amelanistic", "Amel"]),
    trait("Pituophis catenifer", "Anerythristic", "Recessive", "gopher-snakes/anery/", ["Anery"]),
    trait("Pituophis catenifer", "Axanthic", "Recessive", "gopher-snakes/axanthic/", ["Anery", "Xanthic-free"]),
    trait("Pituophis catenifer", "Hypomelanistic", "Recessive", "gopher-snakes/hypo/", ["Hypo"]),
    trait("Pituophis catenifer", "Scaleless", "Recessive", "gopher-snakes/scaleless/"),
  ],

  "Pantherophis emoryi": [
    trait("Pantherophis emoryi", "Albino", "Recessive", "rat-snakes/amelanistic/", ["Amelanistic", "Amel"]),
    trait("Pantherophis emoryi", "Anerythristic", "Recessive", "rat-snakes/anerythristic/", ["Anery"]),
    trait("Pantherophis emoryi", "Silverleaf", "Recessive", "rat-snakes/silverleaf/"),
    trait("Pantherophis emoryi", "Hypomelanistic", "Recessive", "rat-snakes/hypomelanistic/", ["Hypo"]),
    trait("Pantherophis emoryi", "Scaleless", "Recessive", "rat-snakes/scaleless/"),
  ],

  "Python regius": [
    trait("Python regius", "Pied", "Recessive", "ball-pythons/piebald/", ["Piebald"]),
    trait("Python regius", "Clown", "Recessive", "ball-pythons/clown/"),
    trait("Python regius", "Desert Ghost", "Recessive", "ball-pythons/desert-ghost/", ["DG"]),
    trait("Python regius", "Banana", "Incomplete Dominant", "ball-pythons/banana/", ["Coral Glow"]),
    trait("Python regius", "Pastel", "Incomplete Dominant", "ball-pythons/pastel/"),
    trait("Python regius", "Enchi", "Incomplete Dominant", "ball-pythons/enchi/"),
    trait("Python regius", "Leopard", "Incomplete Dominant", "ball-pythons/leopard/"),
    trait("Python regius", "Pinstripe", "Dominant", "ball-pythons/pinstripe/"),
  ],

  "Morelia spilota": [
    // Corrections are deliberate: Morphpedia documents Carpet Hypo as an
    // incomplete-dominant trait, not a recessive one.
    trait("Morelia spilota", "Hypo", "Incomplete Dominant", "carpet-pythons/hypo/", ["Hypomelanistic"]),
    trait("Morelia spilota", "Caramel", "Incomplete Dominant", "carpet-pythons/caramel/"),
    trait("Morelia spilota", "Jaguar", "Incomplete Dominant", "carpet-pythons/jaguar/", ["Jag"]),
    trait("Morelia spilota", "Zebra", "Incomplete Dominant", "carpet-pythons/zebra/"),
    trait("Morelia spilota", "Granite", "Recessive", "carpet-pythons/granite/"),
    trait("Morelia spilota", "Genetic Stripe", "Recessive", "carpet-pythons/genetic-stripe/"),
  ],

  "Malayopython reticulatus": [
    // Tiger is treated as incomplete-dominant here because the recognized
    // super form is used in the hobby and in calculator-style trait systems.
    trait("Malayopython reticulatus", "Tiger", "Incomplete Dominant", "reticulated-pythons/tiger/", ["Tiger Retic"]),
    trait("Malayopython reticulatus", "Phantom", "Incomplete Dominant", "reticulated-pythons/phantom/", ["Blue Eyed Leucistic"]),
    trait("Malayopython reticulatus", "Pied", "Recessive", "reticulated-pythons/pied/", ["Piebald"]),
    trait("Malayopython reticulatus", "Genetic Stripe", "Recessive", "reticulated-pythons/genetic-stripe/"),
  ],

  "Epicrates cenchria": [
    trait("Epicrates cenchria", "Calico", "Recessive", "rainbow-boas/calico/"),
    trait("Epicrates cenchria", "Anery (Sharp)", "Recessive", "rainbow-boas/anery-sharp/", ["Sharp Anery", "Anerythristic"]),
    trait("Epicrates cenchria", "Piebald", "Recessive", "rainbow-boas/piebald/"),
  ],
};
