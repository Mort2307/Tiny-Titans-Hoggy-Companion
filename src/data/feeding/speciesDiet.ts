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

const MOUSE_FOOD_TYPES: FoodType[] = ['Pinkie Mouse', 'Fuzzy Mouse', 'Hopper Mouse', 'Adult Mouse'];

function dedupe(values: FoodType[]): FoodType[] {
  return [...new Set(values)];
}

function categoriesFromStructuredPrey(preyCategories: string[] = []): Set<PreyCategory> {
  const categories = new Set<PreyCategory>();
  for (const raw of preyCategories) {
    const value = raw.trim().toLowerCase();
    if (/^rodent$|^rodents$|mouse$|mice$|rat$|rats$/.test(value)) categories.add('rodent');
    if (/^lagomorph$|^lagomorphs$|rabbit$|rabbits$|hare$|hares$/.test(value)) categories.add('lagomorph');
    if (/^bird$|^birds$|avian$|avians$|quail$|chick$|chicks$/.test(value)) categories.add('bird');
    if (/^fish$|^fishes$|piscivore$|piscivorous$/.test(value)) categories.add('fish');
    if (/^amphibian$|^amphibians$|amphibian-specialist$/.test(value)) categories.add('amphibian');
    if (/^egg$|^eggs$|egg-specialist$/.test(value)) categories.add('egg');
    if (/^reptile$|^reptiles$|lizard$|lizards$|snake$|snakes$/.test(value)) categories.add('reptile');
    if (/^invertebrate$|^invertebrates$|insect$|insects$|arthropod$|arthropods$/.test(value)) categories.add('invertebrate');
  }
  return categories;
}

function fromExistingProfile(snake: Snake): SpeciesDiet | undefined {
  const species = findSnakeSpecies(snake.species);
  const feeding = species?.knowledge.feeding;
  if (!species || !feeding) return undefined;

  const categories = categoriesFromStructuredPrey(feeding.preyCategories);
  const recommended: FoodType[] = [];
  if (categories.has('rodent')) recommended.push(...MOUSE_FOOD_TYPES, 'Rat Pup', 'Rat Fuzzy', 'Adult Rat');
  if (categories.has('lagomorph')) recommended.push('Rabbit');
  if (categories.has('bird')) recommended.push('Quail', 'Other Bird');
  if (categories.has('fish')) recommended.push('Fish');
  if (categories.has('amphibian')) recommended.push('Amphibian');
  if (categories.has('egg')) recommended.push('Egg');
  if (categories.has('reptile')) recommended.push('Reptile Prey');
  if (categories.has('invertebrate')) recommended.push('Invertebrate');

  const guild = feeding.dietaryGuild ?? 'species-specific';
  const note = feeding.notes ?? 'Use the species profile and body condition to determine prey type, prey size and feeding interval.';
  return {
    label: species.commonNames[0] ?? species.acceptedScientificName,
    guild,
    recommended: dedupe(recommended),
    additional: dedupe(ALL_FOOD_TYPES.filter((food) => !recommended.includes(food))),
    categories: categories.size ? [...categories] : ['other'],
    note,
  };
}

function explicitSpecialistDiet(snake: Snake): SpeciesDiet | undefined {
  const species = findSnakeSpecies(snake.species);
  if (!species) return undefined;
  const id = species.id.toLowerCase();

  if (id.startsWith('dasypeltis-')) {
    return {
      label: species.commonNames[0] ?? species.acceptedScientificName,
      guild: 'egg-specialist',
      recommended: ['Egg'],
      additional: ALL_FOOD_TYPES.filter((food) => food !== 'Egg'),
      categories: ['egg'],
      note: 'Egg-specialist snake: record whole eggs as the primary prey item. Tiny Titans will not substitute rodents simply because rodents are common in generic snake trackers.',
    };
  }

  const fishAmphibianIds = new Set([
    'thamnophis-sirtalis',
    'thamnophis-radix',
    'nerodia-sipedon',
    'nerodia-fasciata',
    'regina-septemvittata',
    'rhabdophis-subminiatus',
  ]);
  if (fishAmphibianIds.has(id)) {
    return {
      label: species.commonNames[0] ?? species.acceptedScientificName,
      guild: 'fish/amphibian-capable generalist',
      recommended: ['Fish', 'Amphibian'],
      additional: ALL_FOOD_TYPES.filter((food) => !['Fish', 'Amphibian'].includes(food)),
      categories: ['fish', 'amphibian'],
      note: 'Species-specific aquatic/semi-aquatic prey profile: fish and amphibians are surfaced first. Exact prey, size and response should remain attached to each feeding record.',
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

  return explicitSpecialistDiet(snake) ?? fromExistingProfile(snake) ?? {
    label: snake.species || 'Snake',
    guild: 'species-specific',
    recommended: ['Other'],
    additional: ALL_FOOD_TYPES.filter((food) => food !== 'Other'),
    categories: ['other'],
    note: 'No structured feeding profile is currently mapped for this snake. The tracker will preserve the exact food item rather than inventing a diet.',
  };
}
