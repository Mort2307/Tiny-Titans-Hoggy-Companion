import { seed, type UniversalSpeciesSeed } from "./universalSpeciesSeedTypes";

/** Provisional, taxonomy-first marine animal identities.
 * No copied photographs, assumed captive-care parameters, genetic morphs or breeding targets.
 * Species names/families require individual taxonomic review against WoRMS.
 */
const coral = (scientific: string, common: string, order: string, family: string, aliases: string[] = []) =>
  seed(scientific, common, "cnidarian", "Anthozoa", order, family, "specialist", "aquatic", "unknown", aliases, "corals-anemones");
const echinoderm = (scientific: string, common: string, taxClass: string, order: string, family: string, aliases: string[] = []) =>
  seed(scientific, common, "echinoderm", taxClass, order, family, "specialist", "aquatic", "unknown", aliases, "echinoderms");

export const UNIVERSAL_MARINE_INVERTEBRATE_SEEDS: UniversalSpeciesSeed[] = [
  coral("Entacmaea quadricolor", "Bubble-tip Anemone", "Actiniaria", "Actiniidae"),
  coral("Heteractis magnifica", "Magnificent Sea Anemone", "Actiniaria", "Stichodactylidae"),
  coral("Stichodactyla haddoni", "Haddon's Carpet Anemone", "Actiniaria", "Stichodactylidae"),
  coral("Acropora millepora", "Acropora millepora", "Scleractinia", "Acroporidae"),
  coral("Acropora tenuis", "Acropora tenuis", "Scleractinia", "Acroporidae"),
  coral("Montipora digitata", "Finger Montipora", "Scleractinia", "Acroporidae"),
  coral("Montipora capricornis", "Plating Montipora", "Scleractinia", "Acroporidae"),
  coral("Pocillopora damicornis", "Cauliflower Coral", "Scleractinia", "Pocilloporidae"),
  coral("Euphyllia glabrescens", "Torch Coral", "Scleractinia", "Euphylliidae"),
  coral("Duncanopsammia axifuga", "Duncan Coral", "Scleractinia", "Dendrophylliidae"),
  coral("Tubastraea coccinea", "Orange Sun Coral", "Scleractinia", "Dendrophylliidae"),
  coral("Zoanthus sociatus", "Zoanthid", "Zoantharia", "Zoanthidae"),
  echinoderm("Linckia laevigata", "Blue Sea Star", "Asteroidea", "Valvatida", "Ophidiasteridae"),
  echinoderm("Fromia monilis", "Necklace Sea Star", "Asteroidea", "Valvatida", "Goniasteridae"),
  echinoderm("Protoreaster nodosus", "Chocolate Chip Sea Star", "Asteroidea", "Valvatida", "Oreasteridae"),
  echinoderm("Tripneustes gratilla", "Collector Sea Urchin", "Echinoidea", "Camarodonta", "Toxopneustidae"),
  echinoderm("Diadema setosum", "Long-spined Sea Urchin", "Echinoidea", "Diadematoida", "Diadematidae"),
  echinoderm("Echinometra mathaei", "Boring Sea Urchin", "Echinoidea", "Camarodonta", "Echinometridae"),
  echinoderm("Holothuria atra", "Black Sea Cucumber", "Holothuroidea", "Holothuriida", "Holothuriidae"),
  echinoderm("Holothuria edulis", "Pinkfish Sea Cucumber", "Holothuroidea", "Holothuriida", "Holothuriidae"),
  echinoderm("Stichopus chloronotus", "Greenfish Sea Cucumber", "Holothuroidea", "Synallactida", "Stichopodidae"),
];
