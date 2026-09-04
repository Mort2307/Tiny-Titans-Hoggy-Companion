import type { SourceCitation } from './speciesTypes';

export const SPECIES_SOURCES: Record<string, SourceCitation> = {
  reptileDatabase2026: {
    id: 'reptileDatabase2026',
    title: 'The Reptile Database',
    publisher: 'Uetz, Freed, Aguilar, Reyes, Kudera & Hošek (eds.)',
    url: 'https://www.reptile-database.org/',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Primary taxonomy authority for accepted living reptile names, synonyms, distribution and literature references. Taxonomy remains subject to revision.'
  },
  reptileDatabaseData2026: {
    id: 'reptileDatabaseData2026',
    title: 'Reptile Database data and downloadable checklists',
    publisher: 'The Reptile Database',
    url: 'https://www.reptile-database.org/data/index.html',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Structured taxonomic data and literature-reference datasets used as the canonical taxonomy ingestion source.'
  },
  merckReptileHusbandry2025: {
    id: 'merckReptileHusbandry2025',
    title: 'Management and Husbandry of Reptiles',
    publisher: 'Merck Veterinary Manual',
    url: 'https://www.merckvetmanual.com/exotic-and-laboratory-animals/reptiles/management-and-husbandry-of-reptiles',
    accessedOn: '2026-09-04',
    evidenceLevel: 'high',
    notes: 'Peer-reviewed veterinary husbandry reference; reviewed July 2025. Used for general reptile husbandry principles and selected species parameters, never as a substitute for species-specific evidence.'
  }
};
