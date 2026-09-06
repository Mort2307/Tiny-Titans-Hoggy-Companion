import type { V3ParentGenetics } from "../../utils/geneticsEngineV3";

export type GeneticsEngineV3Fixture = {
  id: string;
  description: string;
  mother: V3ParentGenetics;
  father: V3ParentGenetics;
  expected: {
    certainty?: "exact" | "bounded";
    requiredVisual?: string[];
    requiredPhenotype?: string[];
    requiredProbabilityRange?: [number, number];
    requiredProbability?: number;
    mustIncludeDiagnostic?: string;
    mustNotInventPercentage?: boolean;
  };
};

export const GENETICS_ENGINE_V3_FIXTURES: GeneticsEngineV3Fixture[] = [
  {
    id: "retic-unknown-tiger-x-normal",
    description: "A visually Tiger Reticulated Python without known zygosity must produce bounded possibilities, never a fabricated prior.",
    mother: { speciesId: "malayopython-reticulatus", visualMorphs: ["Tiger"], hets: [] },
    father: { speciesId: "malayopython-reticulatus", visualMorphs: [], hets: [] },
    expected: { certainty: "bounded", requiredProbabilityRange: [0.5, 1], mustNotInventPercentage: true },
  },
  {
    id: "ball-piebald-het-x-het",
    description: "Two confirmed 100% Het Piebald Ball Pythons must produce the classic exact 25/50/25 genotype distribution.",
    mother: { speciesId: "python-regius", visualMorphs: [], hets: [{ gene: "Piebald", percentage: "100%" }] },
    father: { speciesId: "python-regius", visualMorphs: [], hets: [{ gene: "Piebald", percentage: "100%" }] },
    expected: { certainty: "exact" },
  },
  {
    id: "corn-motley-x-stripe-allelic-locus",
    description: "Motley and Stripe must cross through the CLCN2 allele matrix, yielding the documented heteroallelic intermediate phenotype rather than independent-gene arithmetic.",
    mother: { speciesId: "pantherophis-guttatus", visualMorphs: ["Motley"], hets: [] },
    father: { speciesId: "pantherophis-guttatus", visualMorphs: ["Stripe"], hets: [] },
    expected: { certainty: "exact", requiredPhenotype: ["Motley/Stripe (intermediate)"], requiredProbability: 1 },
  },
  {
    id: "corn-motley-het-x-normal",
    description: "A Corn Snake carrying 100% Het Motley must be treated as a wild-type/Motley allele pair at the CLCN2 locus.",
    mother: { speciesId: "pantherophis-guttatus", visualMorphs: [], hets: [{ gene: "Motley", percentage: "100%" }] },
    father: { speciesId: "pantherophis-guttatus", visualMorphs: [], hets: [] },
    expected: { certainty: "exact" },
  },
  {
    id: "hognose-grey-fog-components",
    description: "The canonical Grey Fog combination must be discovered from its registry components rather than a hardcoded ID list.",
    mother: { speciesId: "heterodon-nasicus", visualMorphs: ["Arctic"], hets: [] },
    father: { speciesId: "heterodon-nasicus", visualMorphs: ["Conda"], hets: [] },
    expected: { requiredVisual: ["grey-fog"] },
  },
];
