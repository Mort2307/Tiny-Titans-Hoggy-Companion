import { describe, expect, it } from "vitest";
import type { MorphDefinition } from "../data/morphs";
import { sortMorphsByGeneticFamily } from "./morphSorting";

const morph = (
  geneId: string,
  name: string,
  kind: MorphDefinition["kind"] = "Gene",
  superFormId?: string,
): MorphDefinition => ({
  geneId,
  name,
  kind,
  isGene: kind === "Gene",
  superFormId,
  inheritance: kind === "Gene" ? "Incomplete Dominant" : "Incomplete Dominant",
  verification: "Confirmed",
});

describe("sortMorphsByGeneticFamily", () => {
  it("places a verified Super immediately after its underlying gene", () => {
    const input = [
      morph("super_conda", "Super Conda", "Super", "conda"),
      morph("axanthic", "Axanthic"),
      morph("conda", "Conda"),
      morph("arctic", "Arctic"),
      morph("super_arctic", "Super Arctic", "Super", "arctic"),
    ];

    expect(sortMorphsByGeneticFamily(input).map((item) => item.name)).toEqual([
      "Arctic",
      "Super Arctic",
      "Axanthic",
      "Conda",
      "Super Conda",
    ]);
  });

  it("does not invent a Super relationship from a name alone", () => {
    const input = [
      morph("super_lavender", "Super Lavender", "Gene"),
      morph("lavender", "Lavender"),
    ];

    expect(sortMorphsByGeneticFamily(input).map((item) => item.name)).toEqual([
      "Lavender",
      "Super Lavender",
    ]);
  });
});
