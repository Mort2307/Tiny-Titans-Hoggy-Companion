import { morphs } from "./morphs";
import { calculatorNamedCombinations } from "./geneticsComboRegistry";

// Keep named calculator combinations in the same runtime lookup collection as
// the central morph database without duplicating records in the large data file.
// These remain combinations, never independent loci.
for (const combination of calculatorNamedCombinations) {
  const alreadyPresent = morphs.some((morph) => morph.geneId === combination.geneId);
  if (!alreadyPresent) morphs.push(combination);
}
