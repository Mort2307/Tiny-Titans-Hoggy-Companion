import type { MorphDefinition } from "../data/morphs";

/**
 * Sort morphs by genetic family rather than raw display-name order.
 *
 * A valid Super is grouped immediately after the underlying gene it
 * explicitly references through `superFormId`. We never infer a Super
 * relationship from the display name, because the genetics database is
 * the source of truth.
 */
export function sortMorphsByGeneticFamily(
  morphs: MorphDefinition[]
): MorphDefinition[] {
  const byGeneId = new Map(
    morphs.map((morph) => [morph.geneId.trim().toLowerCase(), morph])
  );

  const familyBaseName = (morph: MorphDefinition): string => {
    if (morph.kind === "Super" && morph.superFormId) {
      const base = byGeneId.get(morph.superFormId.trim().toLowerCase());
      if (base) return base.name;
    }

    return morph.name;
  };

  const familyRank = (morph: MorphDefinition): number => {
    if (morph.kind === "Super" && morph.superFormId) {
      const base = byGeneId.get(morph.superFormId.trim().toLowerCase());
      if (base) return 1;
    }

    return 0;
  };

  return [...morphs].sort((a, b) => {
    const familyCompare = familyBaseName(a).localeCompare(
      familyBaseName(b),
      undefined,
      { sensitivity: "base" }
    );

    if (familyCompare !== 0) return familyCompare;

    const rankCompare = familyRank(a) - familyRank(b);
    if (rankCompare !== 0) return rankCompare;

    return a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
  });
}
