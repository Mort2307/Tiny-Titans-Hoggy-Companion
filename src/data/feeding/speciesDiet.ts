import type { FoodType } from '../../types/Feeding';
import type { Snake } from '../../types/Snake';
import { findSnakeSpecies } from '../species/speciesRegistry';

export type PreyCategory =
  | 'rodent'
  | 'lagomorph'
  | 'bird'
  | 'fish'
  | 'amphibian'
  | 'egg'
  | 'reptile'
  | 'invertebrate'
  | 'other';

export type SpeciesDiet = {
  label: string;
  guild: string;
  recommended: FoodType[];
  additional: FoodType[];
  categories: PreyCategory[];
  note: string;
};

const ALL_FOOD_TYPES: FoodType[] = [
  'Pinkie Mouse', 'Fuzzy Mouse', 'Hopper Mouse', 'Adult Mouse',
  'Rat Pup', 'Rat Fuzzy', 'Adult Rat', 'Rabbit', 'Piglet', 'Quail',
  'Other Bird', 'Fish', 'Amphibian', 'Egg', 'Reptile Prey',
  'Invertebrate', 'Other',
];

function dedupe(values: FoodType[]): FoodType[] {
  return [...new Set(values)];
}

function fromExistingProfile(snake: Snake): SpeciesDiet | undefined {
  const species = findSnakeSpecies(snake.species);
  const feeding = species?.knowledge.feeding;
  if (!species || !feeding) return undefined;

  const text = [
    feeding.dietaryGuild ?? '',
    ...(feeding.preyCategories ?? []),
    feeding.notes ?? '',
  ].join(' ').toLowerCase();

  const categories = new Set<PreyCategory>();
  if (/rodent|mouse|rat|mammal/.test(text)) categories.add('rodent');
  if (/rabbit|hare|lagomorph/.test(text)) categories.add('lagomorph');
  if (/bird|avian|quail|chick/.test(text)) categories.add('bird');
  if (/fish|pisciv/.test(text)) categories.add('fish');
  if (/amphib/.test(text)) categories.add('amphibian');
  if (/egg|oviv/.test(text)) categories.add('egg');
  if (/reptile|lizard|snake/.test(text)) categories.add('reptile');
  if (/invertebrate|insect|arthropod/.test(text)) categories.add('invertebrate');

  const recommended: FoodType[] = [];
  if (categories.has('rodent')) recommended.push('Pinkie Mouse', 'Fuzzy Mouse', 'Hopper Mouse', 'Adult Mouse', 'Rat Pup', 'Rat Fuzzy', 'Adult Rat');
  if (categories.has('lagomorph')) recommended.push('Rabbit');
  if (categories.has('bird')) recommended.push('Quail', 'Other Bird');
  if (categories.has('fish')) recommended.push('Fish');
  if (categories.has('amphibian')) recommended.push('Amphibian');
  if (categories.has('egg')) recommended.push('Egg');
  if (categories.has('reptile')) recommended.push('Reptile Prey');
  if (categories.has('invertebrate')) recommended.push('Invertebrate');

  const guild = feeding.dietaryGuild ?? 'species-specific carnivore';
  const note = feeding.notes ?? 'Use the species profile and body condition to determine prey type, prey size and feeding interval.';
  return {
    label: species.commonNames[0] ?? species.acceptedScientificName,
    guild,
    recommended: dedupe(recommended),
    additional: dedupe(ALL_FOOD_TYPES.filter((food) => !recommended.includes(food))),
    categories: [...categories],
    note,
  };
}

function manualSpecialistDiet(snake: Snake): SpeciesDiet | undefined {
  const species = findSnakeSpecies(snake.species);
  if (!species) return undefined;
  const haystack = [species.id, species.acceptedScientificName, ...species.commonNames, ...species.searchAliases].join(' ').toLowerCase();

  if (/dasypeltis|egg-eating|egg eating/.test(haystack)) {
    return {
      label: species.commonNames[0] ?? species.acceptedScientificName,
      guild: 'egg-specialist',
      recommended: ['Egg'],
      additional: ALL_FOOD_TYPES.filter((food) => food !== 'Egg'),
      categories: ['egg'],
      note: 'Egg-specialist snake: record whole eggs as the primary prey item. Do not substitute rodent prey merely because it is the default in a generic feeding tracker.',
    };
  }

  if (/fish snake|water snake|keelback|natric|nerodia|regina|thamnophis|rhabdophis/.test(haystack)) {
    return {
      label: species.commonNames[0] ?? species.acceptedScientificName,
      guild: 'fish/amphibian-capable generalist',
      recommended: ['Fish', 'Amphibian'],
      additional: ALL_FOOD_TYPES.filter((food) => !['Fish', 'Amphibian'].includes(food)),
      categories: ['fish', 'amphibian'],
      note: 'Aquatic or semi-aquatic snake: fish and/or amphibian prey should be available where supported by the species profile; use the species-specific record rather than a rodent-only assumption.',
    };
  }

  if (/large python|reticulated|burmese|african rock|green anaconda|anaconda|boa constrictor|dumeril|dumeril's boa|common boa/.test(haystack)) {
    return {
      label: species.commonNames[0] ?? species.acceptedScientificName,
      guild: 'large-vertebrate carnivore',
      recommended: ['Adult Rat', 'Rabbit', 'Quail', 'Other Bird'],
      additional: ['Piglet', 'Adult Mouse', 'Rat Pup', 'Rat Fuzzy', 'Fish', 'Other'],
      categories: ['rodent', 'lagomorph', 'bird'],
      note: 'Large constrictor: log the actual whole-prey item and, where practical, its individual or total mass. Larger prey classes are available without forcing them onto smaller species.',
    };
  }

  return undefined;
}

export function getSpeciesDiet(snake: Snake | undefined): SpeciesDiet {
  if (!snake) {
    return {
      label: 'Snake',
      guild: 'unknown',
      recommended: ['Other'],
      additional: ALL_FOOD_TYPES.filter((food) => food !== 'Other'),
      categories: ['other'],
      note: 'Species not resolved. Record the actual prey item under Other until the species profile has been mapped.',
    };
  }

  return manualSpecialistDiet(snake) ?? fromExistingProfile(snake) ?? {
    label: snake.species || 'Snake',
    guild: 'species-specific',
    recommended: ['Other'],
    additional: ALL_FOOD_TYPES.filter((food) => food !== 'Other'),
    categories: ['other'],
    note: 'No structured feeding profile is currently mapped for this snake. The tracker will still preserve the exact food item instead of inventing a diet.',
  };
}
