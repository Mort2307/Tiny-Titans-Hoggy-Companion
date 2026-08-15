// ============================================================
// TINY TITANS — GENETICS CALCULATOR ENGINE
// ============================================================
//
// SINGLE SOURCE OF TRUTH FOR OFFSPRING INHERITANCE
//
// UI components MUST NOT contain genetics calculations.
//
// ============================================================

import {
  getGenes,
  getMorphByGeneId,
  type MorphDefinition,
} from "../data/morphs";

import {
  getGeneId,
  resolveStrictMorph,
} from "./geneticsIdentity";

import {
  expandMorphToComponents,
} from "./morphResolver";

import type {
  GeneticsCalculatorInput,
  GeneticsCalculatorResult,
  OffspringComponent,
  OffspringResult,
  ParentGenetics,
  BreedingSummary,
  HetResult,
  GeneCopyState,
} from "../types/genetics";

// ============================================================
// INTERNAL TYPES
// ============================================================

type AlleleState = {
  geneId: string;
  copies: 0 | 1 | 2;
};

type ParentLocus = {
  geneId: string;
  mother: AlleleState;
  father: AlleleState;
};

// ============================================================
// BUILD OFFSPRING COMPONENT
// ============================================================

function buildComponent(
  geneId: string,
  copies: number
): OffspringComponent | undefined {
  const morph = getDefinition(geneId);
  if (!morph || copies <= 0) return undefined;

  // `copies` comes from the probability/locus engine as a number. At this
  // point the inheritance engine has already constrained it to 1 or 2.
  const safeCopies = copies as GeneCopyState;
  const state = getLocusState(morph, safeCopies);

  return {
    geneId,
    name: morph.name,
    copies: safeCopies,
    state,
  };
}

// ============================================================
// RESULT DISPLAY NAME
// ============================================================

function getVisualComponents(
  loci: Map<string, number>
): OffspringComponent[] {
  const components: OffspringComponent[] = [];
