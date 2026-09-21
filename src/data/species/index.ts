export * from './speciesTypes';
export * from './speciesSources';
export * from './speciesRegistry';
// Load expansion modules after the canonical registry so their species are merged into the shared array/map.
export * from './speciesExpansionBatch1';

export * from './universalSpeciesTypes';
export * from './universalSpeciesSources';
export * from './universalSpeciesRegistry';
export * from './universalSpeciesCareTypes';
export * from './universalSpeciesCare';
export * from './universalSpeciesCareOverrides';
