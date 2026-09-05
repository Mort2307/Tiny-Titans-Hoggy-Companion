import type { SourceCitation } from './speciesTypes';

export const SPECIES_RESEARCH_SOURCES: Record<string, SourceCitation> = {
  greenAnacondaReptiNode2026: {
    id: 'greenAnacondaReptiNode2026',
    title: 'Green Anaconda — Care Sheet & Morphs',
    publisher: 'ReptiNode',
    url: 'https://reptinode.fr/en/genetics/eunectes-murinus',
    accessedOn: '2026-09-05',
    evidenceLevel: 'moderate',
    notes: 'Current specialist keeper reference for Eunectes murinus. Includes a daytime thermal gradient, water temperature, humidity and specialist enclosure requirements. Source disagreement on focal basking is preserved rather than flattened.'
  },
  greenAnacondaHerpeton2026: {
    id: 'greenAnacondaHerpeton2026',
    title: 'Eunectes murinus Care Guide',
    publisher: 'Herpeton Academy',
    url: 'https://academy.herpeton.net/en/caresheets/snakes/eunectes-murinus/',
    accessedOn: '2026-09-05',
    evidenceLevel: 'moderate',
    notes: 'Current specialist keeper guide. Treats adult Eunectes murinus as a facility-scale animal and gives practical temperature and water-system guidance.'
  },
};
