import { describe, expect, it } from "vitest";
import { morphs } from "../data/morphs";
import { validateMorphDatabase } from "./morphDatabaseValidation";

describe("morph database integrity", () => {
  it("has no structural integrity errors", () => {
    const issues = validateMorphDatabase(morphs);
    expect(issues).toEqual([]);
  });

  it("requires a real gene behind every Super relationship", () => {
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

    expect(issues.some((issue) => issue.message.includes("genuine Gene"))).toBe(false);
    expect(issues.some((issue) => issue.message.includes("Super form"))).toBe(false);
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
