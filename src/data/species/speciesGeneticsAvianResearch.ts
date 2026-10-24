import type { MasterMorphDefinition } from "../masterMorphDatabase";

/**
 * Ringneck-only research-backed phenotype records.
 * Inheritance is descriptive; avian offspring calculations remain disabled
 * until sex, loci, combinations and population evidence have been reviewed.
 * NEVER attach stock or third-party images to these entries.
 */
const RINGNECK: MasterMorphDefinition[] = [
  {
    geneId: "violet",
    name: "Violet",
    aliases: ["Violet factor", "Violet Green", "Violet Blue"],
    kind: "Gene", isGene: true, category: "Colour mutation",
    inheritance: "Incomplete Dominant", hetPossible: false,
    verification: "Recognised",
    description: "A documented violet colour factor in rose-ringed parakeets. Appearance depends on the base colour series and factor count; visual identification alone cannot establish genotype.",
    educationalNotes: "Single-factor and double-factor violet are not separate species. Combine this with other mutation names only when bird-specific evidence documents each inherited component. Calculator predictions await specialist review.",
    sourceUrl: "https://aviculturist.org/birds/rose-ringed-parakeet/appendix/e",
    sourceLabel: "The Aviculturist — Rose-ringed Parakeet mutation catalogue",
  },
  {
    geneId: "cleartail",
    name: "Cleartail",
    aliases: ["Clearhead-Cleartail", "Clearheaded Cleartail", "Yellowhead-Yellowtail", "Whitehead-Whitetail"],
    kind: "Gene", isGene: true, category: "Colour/pattern mutation",
    inheritance: "Recessive", hetPossible: true,
    verification: "Recognised",
    description: "A documented clearhead/cleartail colour-pattern mutation of rose-ringed parakeets. Historical variety names differ with the underlying colour series.",
    educationalNotes: "The referenced avian genetics help documentation describes cleartail as recessive to the normal phenotype. Breeder terminology and lineage should be checked for the exact bird; unsupported pairing predictions are withheld.",
    sourceUrl: "https://www.readkong.com/page/genetic-calculator-indian-ringneck-parrot-help-file-4270900",
    sourceLabel: "K. Yorke (2016) — Indian Ringneck avian genetics calculator reference",
  },
  {
    geneId: "violet-cleartail",
    name: "Violet Cleartail",
    aliases: ["Violet Clearhead-Cleartail", "Violet CT"],
    kind: "Combination", isGene: false, category: "Named colour combination",
    inheritance: "Unknown", hetPossible: false,
    verification: "Recognised",
    description: "A named combination of the violet factor and cleartail phenotype in rose-ringed parakeets. It is not a third standalone mutation or a separate species.",
    educationalNotes: "Interpret violet factor, base colour and cleartail inheritance independently. Do not assign a simple, unsupported single-locus mode or breeding probability to the combined label.",
    sourceUrl: "https://aviculturist.org/birds/rose-ringed-parakeet/a-thousand-names-for-a-hundred-birds",
    sourceLabel: "The Aviculturist — variation naming and genetic identity review",
  },
];

export const AVIAN_VARIATION_RESEARCH: Record<string, MasterMorphDefinition[]> = {
  "Psittacula krameri": RINGNECK,
};
