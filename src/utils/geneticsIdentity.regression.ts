import {
  getGeneticIdentity,
  resolveStrictMorph,
  sameMorphIdentity,
} from "./geneticsIdentity";
import { getMorphByGeneId } from "../data/morphs";

/**
 * Genetics identity regression checks.
 *
 * This is intentionally framework-free while the repository has no test
 * runner installed. It can be wired into Vitest once the test dependency is
 * added, without changing the assertions themselves.
 */
export function runGeneticsIdentityRegressionChecks(): void {
  const albino = getMorphByGeneId("albino");
  const arctic = getMorphByGeneId("arctic");
  const axanthic = getMorphByGeneId("axanthic");
  const conda = getMorphByGeneId("conda");

  if (!albino || !arctic || !axanthic || !conda) {
    throw new Error(
      "Required genetics regression morphs are missing from the morph database.",
    );
  }

  const assert = (condition: boolean, message: string): void => {
    if (!condition) {
      throw new Error(`Genetics regression failed: ${message}`);
    }
  };

  assert(
    !sameMorphIdentity("albino", "arctic"),
    "Albino and Arctic must have different identities",
  );
  assert(
    !sameMorphIdentity("albino", "axanthic"),
    "Albino and Axanthic must have different identities",
  );
  assert(
    !sameMorphIdentity("arctic", "axanthic"),
    "Arctic and Axanthic must have different identities",
  );
  assert(
    !sameMorphIdentity("conda", "axanthic"),
    "Conda and Axanthic must have different identities",
  );

  const selected = ["axanthic", "albino", "arctic", "conda"];
  const resolved = selected.map(
    (value) => resolveStrictMorph(value)?.geneId,
  );

  assert(
    JSON.stringify(resolved) === JSON.stringify(selected),
    "independent morph selections must resolve to their own geneIds",
  );
  assert(
    new Set(resolved).size === 4,
    "independent morph selections must remain unique",
  );

  assert(
    resolveStrictMorph(albino.name)?.geneId === "albino",
    "Albino canonical name must resolve to albino",
  );
  assert(
    resolveStrictMorph(arctic.name)?.geneId === "arctic",
    "Arctic canonical name must resolve to arctic",
  );
  assert(
    resolveStrictMorph(axanthic.name)?.geneId === "axanthic",
    "Axanthic canonical name must resolve to axanthic",
  );
  assert(
    resolveStrictMorph(conda.name)?.geneId === "conda",
    "Conda canonical name must resolve to conda",
  );

  for (const morph of [albino, arctic, axanthic, conda]) {
    for (const alias of morph.aliases ?? []) {
      if (alias === morph.name || alias === morph.geneId) {
        continue;
      }

      assert(
        resolveStrictMorph(alias)?.geneId !== morph.geneId,
        `strict resolution must not use alias '${alias}' for ${morph.geneId}`,
      );
    }
  }

  const identity = getGeneticIdentity(axanthic);
  assert(identity.geneId === "axanthic", "Axanthic identity must use axanthic geneId");
  assert(identity.morph === axanthic, "Axanthic identity must retain the source morph");
}
