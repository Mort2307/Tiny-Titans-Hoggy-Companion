import type { MasterMorphDefinition } from "../masterMorphDatabase.ts";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

function trait(
  name: string,
  inheritance: InheritanceType,
  sourceUrl: string,
  sourceLabel: string,
  overrides: Partial<MasterMorphDefinition> = {},
): MasterMorphDefinition {
  return {
    geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aliases: [],
    kind: "Gene",
    isGene: true,
    category: "MorphMarket Trait",
    inheritance,
    hetPossible: inheritance === "Recessive",
    verification: "Recognised",
    evidenceStatus: "recognised",
    evidenceNote: "Species-scoped catalogue record. Promote to calculator-grade only when the evidence layer supports the inheritance claim.",
    sourceUrl,
    sourceLabel,
    ...overrides,
  };
}

const SPECIES = {
  "Pantherophis guttatus": [
    trait("Amel", "Recessive", `${morphMarket}corn-snakes/amel/`, "MorphMarket Morphpedia"),
    trait("Anery", "Recessive", `${morphMarket}corn-snakes/anery/`, "MorphMarket Morphpedia"),
    trait("Caramel", "Recessive", `${morphMarket}corn-snakes/caramel/`, "MorphMarket Morphpedia"),
    trait("Hypo", "Recessive", `${morphMarket}corn-snakes/hypo/`, "MorphMarket Morphpedia"),
    trait("Lavender", "Recessive", `${morphMarket}corn-snakes/lavender/`, "MorphMarket Morphpedia"),
    trait("Motley", "Recessive", `${morphMarket}corn-snakes/motley/`, "MorphMarket Morphpedia"),
    trait("Stripe", "Recessive", `${morphMarket}corn-snakes/stripe/`, "MorphMarket Morphpedia"),
    trait("Palmetto", "Recessive", `${morphMarket}corn-snakes/palmetto/`, "MorphMarket Morphpedia"),
  ] satisfies MasterMorphDefinition[],
};

// Preserve the canonical catalogue populated by the repository. This local helper contract
// only exists to make this module safe to import directly under Node's type-strip runtime.
export const SPECIES_GENETICS_CATALOGUES: Record<string, MasterMorphDefinition[]> = SPECIES;
