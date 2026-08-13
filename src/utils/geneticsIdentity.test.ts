import { describe, expect, it } from "vitest";
import {
  getGeneticIdentity,
  resolveStrictMorph,
  sameMorphIdentity,
} from "./geneticsIdentity";
import { getMorphByGeneId } from "../data/morphs";

const albino = getMorphByGeneId("albino");
const arctic = getMorphByGeneId("arctic");
const axanthic = getMorphByGeneId("axanthic");
const conda = getMorphByGeneId("conda");

if (!albino || !arctic || !axanthic || !conda) {
  throw new Error("Required regression-test morphs are missing from the morph database.");
}

describe("Tiny Titans genetics identity regression tests", () => {
  it("keeps Albino, Arctic, Axanthic and Conda as distinct identities", () => {
    expect(sameMorphIdentity("albino", "arctic")).toBe(false);
    expect(sameMorphIdentity("albino", "axanthic")).toBe(false);
    expect(sameMorphIdentity("arctic", "axanthic")).toBe(false);
    expect(sameMorphIdentity("conda", "axanthic")).toBe(false);
  });

  it("resolves each regression morph by its canonical geneId", () => {
    expect(resolveStrictMorph("albino")?.geneId).toBe("albino");
    expect(resolveStrictMorph("arctic")?.geneId).toBe("arctic");
    expect(resolveStrictMorph("axanthic")?.geneId).toBe("axanthic");
    expect(resolveStrictMorph("conda")?.geneId).toBe("conda");
  });

  it("resolves canonical names to their own gene IDs", () => {
    expect(resolveStrictMorph(albino.name)?.geneId).toBe("albino");
    expect(resolveStrictMorph(arctic.name)?.geneId).toBe("arctic");
    expect(resolveStrictMorph(axanthic.name)?.geneId).toBe("axanthic");
    expect(resolveStrictMorph(conda.name)?.geneId).toBe("conda");
  });

  it("does not treat aliases as strict genetic identities", () => {
    for (const morph of [albino, arctic, axanthic, conda]) {
      for (const alias of morph.aliases ?? []) {
        expect(resolveStrictMorph(alias)?.geneId).not.toBe(morph.geneId);
      }
    }
  });

  it("preserves distinct identities when selections are processed independently", () => {
    const selected = ["axanthic", "albino", "arctic", "conda"];
    const resolved = selected.map((value) => resolveStrictMorph(value)?.geneId);

    expect(resolved).toEqual(["axanthic", "albino", "arctic", "conda"]);
    expect(new Set(resolved).size).toBe(4);
  });

  it("returns the correct genetic identity object", () => {
    const identity = getGeneticIdentity(axanthic);

    expect(identity.geneId).toBe("axanthic");
    expect(identity.name).toBe(axanthic.name);
    expect(identity.morph).toBe(axanthic);
  });
});
