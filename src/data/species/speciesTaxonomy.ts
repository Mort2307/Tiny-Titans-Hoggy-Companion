import type { SnakeSpeciesRecord } from './speciesTypes';

export interface SnakeSpeciesTaxonomyGenus {
  id: string;
  label: string;
  scientificLabel: string;
  species: SnakeSpeciesRecord[];
}

export interface SnakeSpeciesTaxonomyGroup {
  id: string;
  label: string;
  scientificLabel: string;
  genera: SnakeSpeciesTaxonomyGenus[];
}

const HOGNOSE_GENERA = new Set(['Heterodon', 'Leioheterodon', 'Xenodon']);

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function classifyGroup(species: SnakeSpeciesRecord): { id: string; label: string; scientificLabel: string } {
  const genus = species.genus;
  const family = species.family;
  const common = species.commonNames.join(' ').toLowerCase();

  if (HOGNOSE_GENERA.has(genus) || common.includes('hognose')) {
    return { id: 'hognose', label: 'Hognose', scientificLabel: 'Heterodon • Leioheterodon • Xenodon' };
  }
  if (family === 'Pythonidae') return { id: 'pythons', label: 'Pythons', scientificLabel: 'Pythonidae' };
  if (family === 'Boidae' || family === 'Eunectidae') return { id: 'boas-anacondas', label: 'Boas & Anacondas', scientificLabel: `${family}` };
  if (family === 'Viperidae') return { id: 'vipers', label: 'Vipers', scientificLabel: 'Viperidae' };
  if (family === 'Elapidae') return { id: 'elapids', label: 'Cobras, Kraits & Elapids', scientificLabel: 'Elapidae' };
  if (family === 'Colubridae') return { id: 'colubrids', label: 'Colubrids', scientificLabel: 'Colubridae' };
  if (family === 'Natricidae') return { id: 'natricines', label: 'Natricine Snakes', scientificLabel: 'Natricidae' };
  if (family === 'Lamprophiidae' || family === 'Pseudoxyrhophiidae') {
    return { id: 'african-colubroids', label: 'African & Malagasy Colubroids', scientificLabel: family };
  }
  if (family === 'Homalopsidae') return { id: 'homalopsids', label: 'Asian Water Snakes', scientificLabel: 'Homalopsidae' };
  if (family === 'Xenodermidae') return { id: 'xenodermids', label: 'Xenodermid Snakes', scientificLabel: 'Xenodermidae' };
  return { id: `family-${slug(family)}`, label: family, scientificLabel: family };
}

export function buildSnakeSpeciesTaxonomy(speciesRecords: SnakeSpeciesRecord[]): SnakeSpeciesTaxonomyGroup[] {
  const groups = new Map<string, SnakeSpeciesTaxonomyGroup>();

  for (const species of speciesRecords) {
    const groupMeta = classifyGroup(species);
    let group = groups.get(groupMeta.id);
    if (!group) {
      group = { ...groupMeta, genera: [] };
      groups.set(groupMeta.id, group);
    }

    const genusId = `${group.id}-${slug(species.genus)}`;
    let genus = group.genera.find((candidate) => candidate.id === genusId);
    if (!genus) {
      genus = {
        id: genusId,
        label: species.genus,
        scientificLabel: species.genus,
        species: [],
      };
      group.genera.push(genus);
    }

    genus.species.push(species);
  }

  for (const group of groups.values()) {
    group.genera.sort((a, b) => a.label.localeCompare(b.label));
    for (const genus of group.genera) {
      genus.species.sort((a, b) => (a.commonNames[0] ?? a.acceptedScientificName).localeCompare(b.commonNames[0] ?? b.acceptedScientificName));
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.id === 'hognose') return -1;
    if (b.id === 'hognose') return 1;
    return a.label.localeCompare(b.label);
  });
}

export function flattenSnakeSpeciesTaxonomy(groups: SnakeSpeciesTaxonomyGroup[]): SnakeSpeciesRecord[] {
  return groups.flatMap((group) => group.genera.flatMap((genus) => genus.species));
}
