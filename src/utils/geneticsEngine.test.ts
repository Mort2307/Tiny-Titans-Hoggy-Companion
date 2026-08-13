import { describe, expect, it } from "vitest";
import { calculateGeneCross, generateGametes } from "./geneticsEngine";

describe("genetics engine cross validation", () => {
  it("normal x normal produces 100% zero-copy offspring", () => {
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

  it("66% possible het uses the Mendelian two-thirds carrier probability", () => {
    expect(generateGametes({ geneId: "gene", copies: 1, visual: false, probability: 2 / 3 })).toEqual([
      { copies: 1, probability: 1 / 3 },
      { copies: 0, probability: 2 / 3 },
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

  it("generated gamete probabilities always total one", () => {
    const states = [
      { copies: 0, probability: 1 },
      { copies: 1, probability: 0.5 },
      { copies: 1, probability: 2 / 3 },
      { copies: 1, probability: 1 },
      { copies: 2, probability: 1 },
    ];
    for (const state of states) {
      const gametes = generateGametes({ geneId: "gene", copies: state.copies, visual: state.copies === 2, probability: state.probability });
      expect(gametes.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 10);
    }
  });

  it("gene-cross probabilities always total one", () => {
    const states = [
      { copies: 0, probability: 1 },
      { copies: 1, probability: 0.5 },
      { copies: 1, probability: 2 / 3 },
      { copies: 1, probability: 1 },
      { copies: 2, probability: 1 },
    ];
    for (const mother of states) for (const father of states) {
      const outcomes = calculateGeneCross({ geneId: "gene", copies: mother.copies, visual: mother.copies === 2, probability: mother.probability }, { geneId: "gene", copies: father.copies, visual: father.copies === 2, probability: father.probability });
      expect(outcomes.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 10);
    }
  });
});
