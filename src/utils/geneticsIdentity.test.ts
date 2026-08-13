import { describe, expect, it } from "vitest";

import { findMorph } from "../data/morphs";
import {
  normaliseGeneticsValue,
  resolveStrictMorph,
} from "./geneticsIdentity";

describe("genetics identity", () => {
  it("normalises identity comparisons without alias resolution", () => {
    expect(normaliseGeneticsValue("  Axanthic  ")).toBe("axanthic");
    expect(normaliseGeneticsValue("AxAnThIc")).toBe("axanthic");
  });

  it("keeps Albino, Arctic and Axanthic as distinct identities", () => {
    const albino = resolveStrictMorph("albino");
    const arctic = resolveStrictMorph("arctic");
    const axanthic = resolveStrictMorph("axanthic");

    expect(albino?.geneId).toBe("albino");
    expect(arctic?.geneId).toBe("arctic");
    expect(axanthic?.geneId).toBe("axanthic");

    expect(new Set([albino?.geneId, arctic?.geneId, axanthic?.geneId]).size).toBe(3);
  });

  it("resolves canonical names to their own gene IDs", () => {
    for (const name of ["Albino", "Arctic", "Axanthic", "Conda"]) {
      const morph = findMorph(name);
      const strict = resolveStrictMorph(name);

      expect(morph).toBeDefined();
      expect(strict?.geneId).toBe(morph?.geneId);
    }
  });

  it("does not use aliases as strict identity", () => {
    const albino = resolveStrictMorph("Amel");

    expect(albino).toBeUndefined();
  });
});
