import {
  calculateGeneticsV3,
  type V3Calculation,
  type V3ParentGenetics,
} from "./geneticsEngineV3";
import {
  getSpeciesCalculatorMorph,
  resolveSpeciesMorph,
  resolveSpeciesUnderlyingGenes,
} from "../data/species/speciesGeneticsResolver";

/**
 * Normalises the user-facing visual record into biologically valid parent copy states
 * before V3 calculation. In particular, recessive visual traits are homozygous,
 * while dominant/incomplete-dominant visuals remain unresolved unless copy evidence exists.
 */
function normaliseParent(parent: V3ParentGenetics): V3ParentGenetics {
  const known = { ...(parent.knownGeneCopies ?? {}) };

  for (const visualMorphId of parent.visualMorphs) {
    const resolved = resolveSpeciesMorph(parent.speciesId, visualMorphId);
    const components = resolveSpeciesUnderlyingGenes(parent.speciesId, visualMorphId);

    for (const component of components) {
      const geneId = component.morphId;
      const morph = getSpeciesCalculatorMorph(parent.speciesId, geneId);
      if (!morph?.isGene || known[geneId] !== undefined) continue;

      // A visual recessive phenotype requires two copies at that gene.
      if (morph.inheritance === "Recessive") {
        known[geneId] = 2;
        continue;
      }

      // A recognised super form establishes two copies; ordinary dominant/ID
      // visuals stay unknown until the keeper has genotype evidence.
      if (
        (morph.inheritance === "Dominant" || morph.inheritance === "Incomplete Dominant")
        && (component.copies >= 2 || resolved?.kind === "Super")
      ) {
        known[geneId] = 2;
      }
    }
  }

  return {
    ...parent,
    ...(Object.keys(known).length ? { knownGeneCopies: known } : {}),
  };
}

export function calculateGeneticsV3Safe(mother: V3ParentGenetics, father: V3ParentGenetics): V3Calculation {
  return calculateGeneticsV3(normaliseParent(mother), normaliseParent(father));
}
