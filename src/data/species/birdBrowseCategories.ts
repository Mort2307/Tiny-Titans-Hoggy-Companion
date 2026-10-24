import type { UniversalSpeciesRecord } from './universalSpeciesTypes';

/**
 * Keeper-facing categories are filters only, not alternate taxonomy or species IDs.
 * This keeps the canonical /species/group/birds route and all species links stable.
 */
export const BIRD_BROWSE_CATEGORIES = [
  { id: 'all', label: 'All birds', families: [] },
  { id: 'parrots', label: 'Parrots, parakeets & cockatoos', families: ['Psittaculidae', 'Psittacidae', 'Cacatuidae'] },
  { id: 'finches', label: 'Finches & songbirds', families: ['Estrildidae', 'Fringillidae', 'Sturnidae'] },
  { id: 'doves', label: 'Doves & pigeons', families: ['Columbidae'] },
  { id: 'gamebirds', label: 'Quail, pheasants & poultry', families: ['Phasianidae', 'Odontophoridae'] },
  { id: 'waterfowl', label: 'Ducks & waterfowl', families: ['Anatidae'] },
  { id: 'specialist', label: 'Toucans, turacos & hornbills', families: ['Ramphastidae', 'Musophagidae', 'Bucerotidae'] },
] as const;

export type BirdBrowseCategory = (typeof BIRD_BROWSE_CATEGORIES)[number]['id'];

export function matchesBirdBrowseCategory(species: UniversalSpeciesRecord, category: BirdBrowseCategory): boolean {
  if (species.className !== 'bird') return false;
  const definition = BIRD_BROWSE_CATEGORIES.find((item) => item.id === category);
  return Boolean(definition && (definition.id === 'all' || definition.families.some((family) => family === species.family)));
}
