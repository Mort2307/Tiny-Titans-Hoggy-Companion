import type { HusbandrySafetySource } from "../types/husbandrySafety";

export const HUSBANDRY_SAFETY_SOURCES: Record<string, HusbandrySafetySource> = {
  neherpLeafLitter: {
    id: "neherpLeafLitter",
    title: "Natural Leaf Litter for Bioactive Vivariums",
    publisher: "NEHERP",
    url: "https://www.neherpetoculture.com/substratesleaflitter",
    accessedOn: "2026-10-03",
    kind: "husbandry-practice",
    note: "Commercial husbandry source documenting live oak, magnolia and water oak as vivarium leaf litter. Useful husbandry-practice evidence, not controlled reptile toxicology.",
  },
  joshsFrogsLeafLitter: {
    id: "joshsFrogsLeafLitter",
    title: "Leaf Litter",
    publisher: "Josh's Frogs",
    url: "https://joshsfrogs.com/c/habitat/substrates/leaf_litter",
    accessedOn: "2026-10-03",
    kind: "husbandry-practice",
    note: "Commercial husbandry source describing live oak, sea grape and magnolia as commonly used chemical-free vivarium leaf litter.",
  },
  rhsHarmfulPlants: {
    id: "rhsHarmfulPlants",
    title: "Potentially harmful garden plants",
    publisher: "Royal Horticultural Society",
    url: "https://www.rhs.org.uk/prevention-protection/potentially-harmful-garden-plants",
    accessedOn: "2026-10-03",
    kind: "botanical-toxicology",
    note: "Botanical toxicity and irritancy reference. Most toxicity evidence is ingestion/contact based and is not reptile-enclosure-specific.",
  },
  rhsYew: {
    id: "rhsYew",
    title: "How to grow yew",
    publisher: "Royal Horticultural Society",
    url: "https://www.rhs.org.uk/plants/yew/growing-guide",
    accessedOn: "2026-10-03",
    kind: "botanical-toxicology",
    note: "RHS identifies yew foliage, seeds and wood as highly poisonous.",
  },
  aspcaOleander: {
    id: "aspcaOleander",
    title: "Toxic and Non-toxic Plants: Oleander",
    publisher: "ASPCA",
    url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/oleander",
    accessedOn: "2026-10-03",
    kind: "veterinary-toxicology",
    note: "Veterinary toxicology reference identifying cardiac glycosides in Nerium oleander. Mammalian evidence is used conservatively as a reason to exclude the plant from reptile enclosures.",
  },
  cdcPoisonousPlants: {
    id: "cdcPoisonousPlants",
    title: "Poisonous Plants and Work",
    publisher: "CDC / NIOSH",
    url: "https://www.cdc.gov/niosh/outdoor-workers/about/poisonous-plants.html",
    accessedOn: "2026-10-03",
    kind: "public-health",
    note: "Public-health reference for Toxicodendron exposure and persistent urushiol contamination. Relevant to keeper safety and enclosure contamination.",
  },
};

export const HUSBANDRY_SAFETY_SOURCE_LIST = Object.values(HUSBANDRY_SAFETY_SOURCES);
