import type { V3ParentGenetics } from "../../utils/geneticsEngineV3";

export type GeneticsEngineV3Fixture = {
  id: string;
  description: string;
  mother: V3ParentGenetics;
  father: V3ParentGenetics;
  expected: {
    certainty?: "exact" | "bounded";
    requiredVisual?: string[];
    mustIncludeDiagnostic?: string;
    mustNotInventPercentage?: boolean;
  };
};

export const GENETICS_ENGINE_V3_FIXTURES: GeneticsEngineV3Fixture[] = [
  {
    id: "retic-unknown-tiger-x-normal",
    description: "A visually Tiger Reticulated Python without known zygosity must produce bounded possibilities, not a fabricated 50/50 prior.",
    mother: { speciesId: "malayopython-reticulatus", visualMorphs: ["Tiger"], hets: [] },
    father: { speciesId: "malayopython-reticulatus", visualMorphs: [], hets: [] },
    expected: { certainty: "bounded", mustNotInventPercentage: true },
  },
  {
    id: "corn-motley-x-stripe-allelic-safety",
    description: "Motley and Stripe are alleles at the same CLCN2 locus and must not be calculated as independent genes.",
    mother: { speciesId: "pantherophis-guttatus", visualMorphs: ["Motley"], hets: [] },
    father: { speciesId: "pantherophis-guttatus", visualMorphs: ["Stripe"], hets: [] },
    expected: { mustIncludeDiagnostic: "Alleles at pantherophis-guttatus-clcn2-pattern", mustNotInventPercentage: true },
  },
  {
    id: "hognose-grey-fog-components",
    description: "The canonical Grey Fog combination must be discovered from its registry components rather than a hardcoded ID list.",
    mother: { speciesId: "heterodon-nasicus", visualMorphs: ["Arctic"], hets: [] },
    father: { speciesId: "heterodon-nasicus", visualMorphs: ["Conda"], hets: [] },
    expected: { requiredVisual: ["grey-fog"] },
  },
];
