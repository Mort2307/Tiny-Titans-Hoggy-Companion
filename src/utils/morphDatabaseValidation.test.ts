import { describe, expect, it } from "vitest";
import { morphs } from "../data/morphs";
import { validateMorphDatabase } from "./morphDatabaseValidation";

describe("morph database integrity", () => {
  it("has no structural integrity errors", () => {
    const issues = validateMorphDatabase(morphs);
    expect(issues).toEqual([]);
  });

  it("rejects a Super form whose base gene does not exist", () => {
    const issues = validateMorphDatabase([
      {
        geneId: "fake-super",
        name: "Super Lavender",
        kind: "Super",
        isGene: false,
        superFormId: "lavender",
        inheritance: "Recessive",
        verification: "Unverified",
      },
    ]);

    expect(issues.some((issue) => issue.message.includes("unknown gene"))).toBe(true);
  });

  it("rejects a Super form pointing at a non-gene", () => {
    const issues = validateMorphDatabase([
      {
        geneId: "lavender",
        name: "Lavender",
        kind: "Line-bred",
        isGene: false,
        inheritance: "Line-bred",
        verification: "Recognised",
      },
      {
        geneId: "fake-super",
        name: "Super Lavender",
        kind: "Super",
        isGene: false,
        superFormId: "lavender",
        inheritance: "Recessive",
        verification: "Unverified",
      },
    ]);

    expect(issues.some((issue) => issue.message.includes("genuine Gene"))).toBe(true);
  });

  it("rejects duplicate gene IDs", () => {
    const issues = validateMorphDatabase([
      {
        geneId: "arctic",
        name: "Arctic",
        kind: "Gene",
        isGene: true,
        inheritance: "Incomplete Dominant",
        verification: "Confirmed",
      },
      {
        geneId: "ARCTIC",
        name: "Another Arctic",
        kind: "Gene",
        isGene: true,
        inheritance: "Incomplete Dominant",
        verification: "Confirmed",
      },
    ]);

    expect(issues.some((issue) => issue.message.includes("Duplicate geneId"))).toBe(true);
  });
});
