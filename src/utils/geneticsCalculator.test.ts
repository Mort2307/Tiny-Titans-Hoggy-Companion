import { describe, expect, it } from "vitest";
import { calculateBreeding, calculateSingleGene } from "./geneticsCalculator";

describe("genetics calculator core inheritance", () => {
  it("calculates a recessive het x het as 25/50/25", () => {
    const outcomes = calculateSingleGene("albino", 1, 1);
    const byCopies = new Map(outcomes.map((outcome) => [outcome.copies, outcome.probability]));

    expect(byCopies.get(0)).toBeCloseTo(25, 8);
    expect(byCopies.get(1)).toBeCloseTo(50, 8);
    expect(byCopies.get(2)).toBeCloseTo(25, 8);
  });

  it("calculates incomplete-dominant Arctic x Arctic as 25/50/25", () => {
    const outcomes = calculateSingleGene("arctic", 1, 1);
    const byCopies = new Map(outcomes.map((outcome) => [outcome.copies, outcome.probability]));

    expect(byCopies.get(0)).toBeCloseTo(25, 8);
    expect(byCopies.get(1)).toBeCloseTo(50, 8);
    expect(byCopies.get(2)).toBeCloseTo(25, 8);
  });

  it("calculates a visual recessive x clear as 100% het", () => {
    const outcomes = calculateSingleGene("albino", 2, 0);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].copies).toBe(1);
    expect(outcomes[0].probability).toBeCloseTo(100, 8);
  });

  it("does not create a visual recessive from one visual parent and one clear parent", () => {
    const result = calculateBreeding(
      { morphs: ["Albino"], hets: [] },
      { morphs: [], hets: [] },
    );

    expect(result.offspring.some((outcome) => outcome.name === "Albino")).toBe(false);
    expect(result.offspring.some((outcome) => outcome.name === "Normal")).toBe(false);
    expect(result.offspring.some((outcome) => outcome.hetComponents.some((component) => component.geneId === "albino"))).toBe(true);
  });

  it("never invents Super Lavender from a recessive locus", () => {
    const result = calculateBreeding(
      { morphs: ["Lavender"], hets: [] },
      { morphs: ["Lavender"], hets: [] },
    );

    expect(result.offspring.some((outcome) => /Super Lavender/i.test(outcome.name))).toBe(false);
  });

  it("keeps total probability at 100% for a multi-locus cross", () => {
    const result = calculateBreeding(
      { morphs: ["Arctic"], hets: ["albino"] },
      { morphs: ["Arctic"], hets: ["albino"] },
    );

    const total = result.offspring.reduce((sum, outcome) => sum + outcome.percentage, 0);
    expect(total).toBeCloseTo(100, 6);
  });
});
