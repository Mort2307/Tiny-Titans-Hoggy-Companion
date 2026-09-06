import type { MorphDefinition } from "../data/morphs";

// Tiny Titans genetics contracts. Stable geneId values are the identity;
// display names and aliases are presentation/input only.

export type HetPercentage = 50 | 66 | 100 | "50%" | "66%" | "100%";
export type GeneticHetPercentage = number;

export type Het = {
  gene: string;
  percentage: HetPercentage;
  geneId?: string;
};

export type ParentGenetics = {
  morphs: string[];
  hets: string[];
  hetPercentages?: Record<string, HetPercentage>;
};

export type GeneCopyState = 0 | 1 | 2;

export type InheritanceState =
  | "Clear"
  | "Het"
  | "Visual"
  | "Super"
  | "Unknown";

export type GeneState = {
  geneId: string;
  name: string;
  copies: GeneCopyState;
  state: InheritanceState;
  morph: MorphDefinition;
};

export type OffspringComponent = {
  geneId: string;
  name: string;
  copies: number;
  state: InheritanceState;
};

export type OffspringResult = {
  id: string;
  name: string;
  percentage: number;
  visualComponents: OffspringComponent[];
  hetComponents: OffspringComponent[];
  possibleHetComponents: OffspringComponent[];
  recognisedCombination: boolean;
  combination?: MorphDefinition;
  hasUnresolvedGenetics: boolean;
};

export type GeneticsCalculatorInput = {
  /** Species identity is now part of the breeding calculation context. */
  speciesId?: string | null;
  female: ParentGenetics;
  male: ParentGenetics;
};

export type GeneticsCalculatorResult = {
  input: GeneticsCalculatorInput;
  offspring: OffspringResult[];
  hasUnresolvedGenetics: boolean;
};

export type GeneticProbability = {
  geneId: string;
  copies: GeneCopyState;
  percentage: number;
};

export type CombinationResult = {
  combination: MorphDefinition;
  percentage: number;
  underlyingComponents: OffspringComponent[];
};

export type HetResult = {
  geneId: string;
  name: string;
  percentage: GeneticHetPercentage;
  certainty: "Confirmed" | "Possible";
};

export type BreedingSummary = {
  outcomeCount: number;
  visualOutcomes: OffspringResult[];
  hetOutcomes: HetResult[];
  combinations: CombinationResult[];
  hasUnresolvedGenetics: boolean;
};

export type GeneticsValidationIssue =
  | "UNKNOWN_MORPH"
  | "INVALID_HET"
  | "DUPLICATE_GENE"
  | "CONFLICTING_HET"
  | "UNRESOLVED_COMBINATION"
  | "INVALID_GENETIC_STATE";

export type GeneticsValidationResult = {
  valid: boolean;
  issues: GeneticsValidationIssue[];
  messages: string[];
};

export type GeneticsIssueType =
  | "Incorrect Morph"
  | "Incorrect Combination"
  | "Incorrect Genetics"
  | "Incorrect Het"
  | "Missing Morph"
  | "Other";

export type GeneticsIssueReport = {
  type: GeneticsIssueType;
  morphId?: string;
  morphName?: string;
  description: string;
  calculatorInput?: GeneticsCalculatorInput;
  result?: OffspringResult;
  createdAt: string;
};

export type GeneticsParent = ParentGenetics;
export type GeneticsResult = OffspringResult;
