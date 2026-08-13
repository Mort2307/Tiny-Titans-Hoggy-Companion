import { describe, expect, it } from "vitest";
import { calculateGeneCross, generateGametes } from "./geneticsEngine";

describe("genetics engine cross validation", () => {
  it("normal x normal produces two zero-copy gametes", () => {
    expect(calculateGeneCross({ geneId: "gene", copies: 0, visual: false, probability: 1 }, { geneId: "gene", copies: 0, visual: false, probability: 1 })).toEqual([{ copies: 0, probability: 1 }]);
  });

  it("recessive visual x normal produces 100% single-copy offspring", () => {
    expect(calculateGeneCross({ geneId: "gene", copies: 2, visual: true, probability: 1 }, { geneId: "gene", copies: 0, visual: false, probability: 1 })).toEqual([{ copies: 1, probability: 1 }]);
  });

  it("recessive visual x visual produces 100% two-copy offspring", () => {
    expect(calculateGeneCross({ geneId: "gene", copies: 2, visual: true, probability: 1 }, { geneId: "gene", copies: 2, visual: true, probability: 1 })).toEqual([{ copies: 2, probability: 1 }]);
  });

  it("heterozygous x heterozygous produces the Mendelian 25/50/25 distribution", () => {
    expect(calculateGeneCross({ geneId: "gene", copies: 1, visual: false, probability: 1 }, { geneId: "gene", copies: 1, visual: false, probability: 1 })).toEqual([
      { copies: 0, probability: 0.25 },
      { copies: 1, probability: 0.5 },
      { copies: 2, probability: 0.25 },
    ]);
  });

  it("50% possible het transmits the allele at 25% probability", () => {
    expect(generateGametes({ geneId: "gene", copies: 1, visual: false, probability: 0.5 })).toEqual([
      { copies: 1, probability: 0.25 },
      { copies: 0, probability: 0.75 },
    ]);
  });

  it("66% possible het transmits the allele at one third probability", () => {
    expect(generateGametes({ geneId: "gene", copies: 1, visual: false, probability: 0.66 })).toEqual([
      { copies: 1, probability: 0.33 },
      { copies: 0, probability: 0.67 },
    ]);
  });

  it("100% het transmits the allele at 50% probability", () => {
    expect(generateGametes({ geneId: "gene", copies: 1, visual: false, probability: 1 })).toEqual([
      { copies: 1, probability: 0.5 },
      { copies: 0, probability: 0.5 },
    ]);
  });

  it("two-copy parents always contribute one copy to each gamete", () => {
    expect(generateGametes({ geneId: "gene", copies: 2, visual: true, probability: 1 })).toEqual([{ copies: 1, probability: 1 }]);
  });

  it("all generated gamete probabilities total exactly one", () => {
    for (const state of [0, 1, 2]) {
      const probability = state === 0 ? 1 : state === 1 ? 0.66 : 1;
      const gametes = generateGametes({ geneId: "gene", copies: state, visual: state === 2, probability });
      expect(gametes.reduce((sum, item) => sum + item.probability, 0)).toBe(1);
    }
  });
});
