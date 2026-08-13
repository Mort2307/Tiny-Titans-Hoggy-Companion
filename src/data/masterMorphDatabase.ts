import { morphs as canonicalMorphs, type MorphDefinition } from "./morphs";
import { hognoseMorphCatalog, type MorphReferenceEntry } from "./hognoseMorphCatalog";

/**
 * Tiny Titans master keeper-facing morph catalogue.
 *
 * Canonical genetics records always win. Hognose-Morphs reference records
 * fill catalogue gaps without pretending an unverified/reference-only trait
 * is a Mendelian locus in the canonical database.
 */
export type MasterMorphDefinition = MorphDefinition & {
  sourceUrl?: string;
  sourceLabel?: string;
  contains?: string[];
};

const normalise = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

function mergeMorphs(
  canonical: MorphDefinition[],
  reference: MorphReferenceEntry[],
): MasterMorphDefinition[] {
  const result: MasterMorphDefinition[] = [...canonical];
  const ids = new Set(canonical.map((morph) => normalise(morph.geneId)));
  const names = new Set(canonical.map((morph) => normalise(morph.name)));

  for (const entry of reference) {
    const id = normalise(entry.geneId);
    const name = normalise(entry.name);

    // Canonical records take precedence over reference aliases/duplicates.
    if (ids.has(id) || names.has(name)) continue;

    result.push(entry);
    ids.add(id);
    names.add(name);
  }

  return result;
}

export const masterMorphs: MasterMorphDefinition[] = mergeMorphs(
  canonicalMorphs,
  hognoseMorphCatalog,
);

export function resolveMasterMorph(value: string): MasterMorphDefinition | undefined {
  const query = normalise(value);

  const byId = masterMorphs.find(
    (morph) => normalise(morph.geneId) === query,
  );
  if (byId) return byId;

  const byName = masterMorphs.find(
    (morph) => normalise(morph.name) === query,
  );
  if (byName) return byName;

  const byAlias = masterMorphs.find(
    (morph) => morph.aliases?.some((alias) => normalise(alias) === query),
  );
  return byAlias;
}

export function getMasterMorphByGeneId(geneId: string): MasterMorphDefinition | undefined {
  return masterMorphs.find(
    (morph) => normalise(morph.geneId) === normalise(geneId),
  );
}

export function getMasterMorphByName(name: string): MasterMorphDefinition | undefined {
  return resolveMasterMorph(name);
}

export function getMasterHetGenes(): MasterMorphDefinition[] {
  return masterMorphs.filter(
    (morph) => morph.isGene && morph.kind === "Gene" && morph.hetPossible === true,
  );
}

export function getMasterVisualMorphs(): MasterMorphDefinition[] {
  return masterMorphs.filter(
    (morph) =>
      (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination") &&
      !morph.isProject &&
      morph.verification !== "Disputed" &&
      morph.verification !== "Unverified",
  );
}

export function getMasterCalculatorMorphs(): MasterMorphDefinition[] {
  // Reference entries are selectable too, but only records marked as genes,
  // supers or combinations participate in the genetics engine.
  return getMasterVisualMorphs();
}
