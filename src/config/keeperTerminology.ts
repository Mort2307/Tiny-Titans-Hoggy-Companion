export const KEEPER_COMPANION_TERMINOLOGY = {
  appName: "Tiny Titans Keeper Companion",
  shortName: "Tiny Titans",
  collectionLabel: "My Animals",
  animalSingular: "animal",
  animalPlural: "animals",
  speciesLabel: "Species",
  speciesQuestion: "What species is this animal?",
  speciesSearchPlaceholder: "Search species, common name, scientific name, genus or family…",
  speciesHelp: "Choose a canonical species when you can. Tiny Titans can keep multiple species in the same collection, and an animal can remain awaiting identification when the exact species is not yet known.",
  collectionDescription: "Keep your animals together in one collection, while each individual stays linked to its own species, records and evidence.",
  intelligenceDescription: "Titan Intelligence works from the animals, species context and records available to your account. Species-specific guidance stays attached to the relevant animal rather than assuming every animal is the same.",
} as const;

export type KeeperCompanionTerminology = typeof KEEPER_COMPANION_TERMINOLOGY;
