export interface MorphEvidenceSourceDefinition {
  id: string;
  label: string;
  url: string;
  type: 'morphology-database' | 'community-reference' | 'breeder-reference' | 'taxonomy' | 'scientific-literature';
  authority: 'primary' | 'secondary' | 'community';
  notes: string;
}

/**
 * Linkable source registry for the morph evidence layer.
 *
 * Source labels in morphSourceAudit.ts resolve here so the UI can expose
 * actual references instead of presenting source names as unsupported claims.
 */
export const MORPH_EVIDENCE_SOURCES: Record<string, MorphEvidenceSourceDefinition> = {
  'MorphMarket Morphpedia': {
    id: 'morphmarket-morphpedia',
    label: 'MorphMarket Morphpedia',
    url: 'https://www.morphmarket.com/morphpedia/',
    type: 'morphology-database',
    authority: 'secondary',
    notes: 'Community-driven trait knowledge base. Useful for trait identity, inheritance terminology, historical context and cited references; not a substitute for scientific validation.'
  },
  'MorphMarket community': {
    id: 'morphmarket-community',
    label: 'MorphMarket community',
    url: 'https://community.morphmarket.com/c/colubrids/western-hognose/147',
    type: 'community-reference',
    authority: 'community',
    notes: 'Keeper and breeder discussions. Valuable for emerging claims and terminology but must never be silently promoted to confirmed genetics.'
  },
  'MorphMarket trait index': {
    id: 'morphmarket-trait-index',
    label: 'MorphMarket trait index',
    url: 'https://www.morphmarket.com/all/c/reptiles/colubrids/hognose-snakes/traits',
    type: 'morphology-database',
    authority: 'secondary',
    notes: 'Current marketplace trait indexing and naming. Useful as a current terminology signal.'
  },
  'MorphMarket gene request': {
    id: 'morphmarket-gene-request',
    label: 'MorphMarket Genetics & Species requests',
    url: 'https://community.morphmarket.com/c/morphmarket-support/genetics/71',
    type: 'community-reference',
    authority: 'community',
    notes: 'Tracks gene registration discussions, evidence supplied by breeders and accepted trait classifications.'
  },
  'Hognose Morphs': {
    id: 'hognose-morphs',
    label: 'Hognose Morphs',
    url: 'https://hognose-morphs.com/morphs/all',
    type: 'breeder-reference',
    authority: 'secondary',
    notes: 'Broad Western Hognose morph/combo catalogue. Use as a terminology and phenotype cross-reference, not as sole proof of inheritance.'
  },
  'Reptifit': {
    id: 'reptifit',
    label: 'Reptifit Hognose collection',
    url: 'https://www.reptifit.nl/en/collection',
    type: 'breeder-reference',
    authority: 'secondary',
    notes: 'Current breeder reference showing actively worked Western Hognose mutations and combinations.'
  }
};

export function resolveMorphEvidenceSources(labels: string[]): MorphEvidenceSourceDefinition[] {
  return labels.map((label) => MORPH_EVIDENCE_SOURCES[label]).filter((source): source is MorphEvidenceSourceDefinition => Boolean(source));
}
