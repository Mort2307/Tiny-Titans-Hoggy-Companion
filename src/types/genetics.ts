import type { MorphDefinition } from "../data/morphs";

// ============================================================
// TINY TITANS — GENETICS TYPES
// ============================================================
//
// Shared genetics contracts used by:
//
// • Snake profiles
// • HetSelector
// • SnakeCard
// • Genetics Calculator
// • Genetics Engine
// • Breeding Planner
// • Genetics reports
//
// IMPORTANT:
// These are DATA TYPES only.
// Genetics logic belongs in the genetics utility/engine layer.
// ============================================================


// ============================================================
// HET PERCENTAGE
// ============================================================
//
// The existing UI historically uses both:
//
//   100
//   "100%"
//
// So the shared type deliberately accepts both representations
// while we finish migrating the genetics system.
//
// New engine code should prefer numeric percentages.
// ============================================================

export type HetPercentage =
  | 50
  | 66
  | 100
  | "50%"
  | "66%"
  | "100%";


// ============================================================
// HET
// ============================================================
//
// This is the shape expected by the existing snake UI.
//
// `gene` is retained for compatibility with the current
// HetSelector and SnakeCard components.
//
// `geneId` can be added later when the UI is fully migrated
// to stable database IDs.
// ============================================================

export type Het = {
  gene: string;
  percentage: HetPercentage;
};


// ============================================================
// PARENT GENETICS
// ============================================================

export type ParentGenetics = {
  /**
   * Stable gene IDs for visual morphs.
   *
   * Example:
   *
   * ["arctic", "super-conda"]
   */
  morphs: string[];

  /**
   * Stable gene IDs for known hets.
   */
  hets: string[];
};


// ============================================================
// GENOTYPE STATE
// ============================================================

export type GeneCopyState =
  | 0
  | 1
  | 2;


// ============================================================
// INHERITANCE STATE
// ============================================================

export type InheritanceState =
  | "Clear"
  | "Het"
  | "Visual"
  | "Super"
  | "Unknown";


// ============================================================
// GENE STATE
// ============================================================

export type GeneState = {
  /**
   * Stable database gene ID.
   */
  geneId: string;

  /**
   * Canonical display name.
   */
  name: string;

  /**
   * Number of copies represented.
   */
  copies: GeneCopyState;

  /**
   * How the state is interpreted.
   */
  state: InheritanceState;

  /**
   * Original morph database definition.
   */
  morph: MorphDefinition;
};


// ============================================================
// OFFSPRING COMPONENT
// ============================================================

export type OffspringComponent = {
  /**
   * Stable gene ID.
   */
  geneId: string;

  /**
   * Canonical display name.
   */
  name: string;

  /**
   * Number of copies.
   */
  copies: number;

  /**
   * Whether this component is visual,
   * het or otherwise unresolved.
   */
  state: InheritanceState;
};


// ============================================================
// OFFSPRING RESULT
// ============================================================

export type OffspringResult = {
  /**
   * Unique internal result key.
   *
   * This should be generated from genetic identity,
   * NOT from display names.
   */
  id: string;

  /**
   * Human-readable result name.
   */
  name: string;

  /**
   * Probability from 0–100.
   */
  percentage: number;

  /**
   * Confirmed visual components.
   */
  visualComponents: OffspringComponent[];

  /**
   * Known het components.
   */
  hetComponents: OffspringComponent[];

  /**
   * Possible het components where probability
   * rather than certainty exists.
   */
  possibleHetComponents: OffspringComponent[];

  /**
   * Whether the result is a recognised
   * combination in morphs.ts.
   */
  recognisedCombination: boolean;

  /**
   * Recognised combination definition,
   * when applicable.
   */
  combination?: MorphDefinition;

  /**
   * Whether some underlying genetics
   * remain unresolved.
   */
  hasUnresolvedGenetics: boolean;
};


// ============================================================
// CALCULATOR INPUT
// ============================================================

export type GeneticsCalculatorInput = {
  female: ParentGenetics;
  male: ParentGenetics;
};


// ============================================================
// CALCULATOR RESULT
// ============================================================

export type GeneticsCalculatorResult = {
  /**
   * Original calculation input.
   */
  input: GeneticsCalculatorInput;

  /**
   * All calculated offspring outcomes.
   */
  offspring: OffspringResult[];

  /**
   * Whether the calculation contains
   * genetics that Tiny Titans cannot currently
   * resolve with confidence.
   */
  hasUnresolvedGenetics: boolean;
};


// ============================================================
// GENETIC PROBABILITY
// ============================================================

export type GeneticProbability = {
  /**
   * Stable genetic identity key.
   */
  geneId: string;

  /**
   * Number of copies.
   */
  copies: number;

  /**
   * Probability 0–100.
   */
  percentage: number;
};


// ============================================================
// COMBINATION RESULT
// ============================================================

export type CombinationResult = {
  /**
   * Recognised combination definition.
   */
  combination: MorphDefinition;

  /**
   * Probability of producing it.
   */
  percentage: number;

  /**
   * Underlying genetic components.
   */
  underlyingComponents: OffspringComponent[];
};


// ============================================================
// HET RESULT
// ============================================================

export type HetResult = {
  /**
   * Stable gene identity.
   */
  geneId: string;

  /**
   * Canonical name.
   */
  name: string;

  /**
   * Probability of carrying the gene.
   */
  percentage:
    | 50
    | 66
    | 100;

  /**
   * Whether this is confirmed or
   * probability-based.
   */
  certainty:
    | "Confirmed"
    | "Possible";
};


// ============================================================
// GENETICS HET PERCENTAGE
// ============================================================
//
// Compatibility alias used by some of the genetics engine code.
//
// Unlike HetPercentage above, this is deliberately numeric because
// the calculation engine should work with actual probabilities,
// not display strings.
// ============================================================

export type GeneticHetPercentage =
  | 50
  | 66
  | 100;


// ============================================================
// BREEDING SUMMARY
// ============================================================

export type BreedingSummary = {
  /**
   * Number of unique offspring outcomes.
   */
  outcomeCount: number;

  /**
   * Visual outcomes.
   */
  visualOutcomes: OffspringResult[];

  /**
   * Possible het outcomes.
   */
  hetOutcomes: HetResult[];

  /**
   * Recognised combinations.
   */
  combinations: CombinationResult[];

  /**
   * Whether unresolved genetics
   * were encountered.
   */
  hasUnresolvedGenetics: boolean;
};


// ============================================================
// VALIDATION
// ============================================================

export type GeneticsValidationIssue =
  | "UNKNOWN_MORPH"
  | "INVALID_HET"
  | "DUPLICATE_GENE"
  | "CONFLICTING_HET"
  | "UNRESOLVED_COMBINATION"
  | "INVALID_GENETIC_STATE";


// ============================================================
// VALIDATION RESULT
// ============================================================

export type GeneticsValidationResult = {
  valid: boolean;

  issues: GeneticsValidationIssue[];

  /**
   * Human-readable messages intended for
   * development/debugging and future
   * Report Issue functionality.
   */
  messages: string[];
};


// ============================================================
// REPORT ISSUE
// ============================================================

export type GeneticsIssueType =
  | "Incorrect Morph"
  | "Incorrect Combination"
  | "Incorrect Genetics"
  | "Incorrect Het"
  | "Missing Morph"
  | "Other";


export type GeneticsIssueReport = {
  /**
   * Issue category.
   */
  type: GeneticsIssueType;

  /**
   * Morph or combination being reported.
   */
  morphId?: string;

  /**
   * Optional displayed morph name.
   */
  morphName?: string;

  /**
   * Description supplied by the user.
   */
  description: string;

  /**
   * Optional calculator context.
   */
  calculatorInput?: GeneticsCalculatorInput;

  /**
   * Optional result being reported.
   */
  result?: OffspringResult;

  /**
   * Timestamp.
   */
  createdAt: string;
};


// ============================================================
// LEGACY / UI COMPATIBILITY TYPES
// ============================================================
//
// These aliases let the existing calculator UI and the new
// genetics engine coexist while we migrate everything onto
// stable gene IDs.
//
// Do NOT remove these until the consuming components have been
// migrated.
// ============================================================

export type GeneticsParent = ParentGenetics;

export type GeneticsResult = OffspringResult;