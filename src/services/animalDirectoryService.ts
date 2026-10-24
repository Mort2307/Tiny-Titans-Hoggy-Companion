import type { UniversalAnimalRecord, UniversalAnimalStatus } from "../types/UniversalAnimal";
import type { Snake } from "../types/Snake";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import { getUserAnimals } from "./universalAnimalService";
import { getUserSnakeDirectory, getUserSnakes } from "./snakeService";

export type AnimalRecordSource = "universal" | "legacy-snake";

export type UnifiedAnimalDirectoryRecord = {
  id: string;
  source: AnimalRecordSource;
  name: string;
  speciesId?: string;
  speciesCommonName?: string;
  scientificName?: string;
  animalGroup?: string;
  sex: UniversalAnimalRecord["sex"];
  status: UniversalAnimalStatus;
  morphOrColour?: string;
  notes?: string;
  photoUrl?: string;
  /** Null means no supported tracker has been linked, not zero logged events. */
  weightRecords: number | null;
  feedingRecords: number | null;
  shedRecords: number | null;
  healthRecords: number | null;
  universalAnimal?: UniversalAnimalRecord;
  legacySnake?: Snake;
};

function legacySex(snake: Snake): UniversalAnimalRecord["sex"] {
  const value = String(snake.sex || "").toLowerCase();
  if (value === "male" || value === "female") return value;
  return "unknown";
}

function legacyStatus(snake: Snake): UniversalAnimalStatus {
  if (snake.status === "Sold") return "sold";
  if (snake.status === "Deceased") return "deceased";
  if (snake.status === "Archived") return "archived";
  return "active";
}

export function universalAnimalToDirectory(animal: UniversalAnimalRecord): UnifiedAnimalDirectoryRecord {
  return {
    id: animal.id,
    source: "universal",
    name: animal.name,
    speciesId: animal.speciesId,
    speciesCommonName: animal.speciesCommonName,
    scientificName: animal.scientificName,
    animalGroup: animal.animalGroup,
    sex: animal.sex,
    status: animal.status,
    morphOrColour: animal.morphOrColour,
    notes: animal.notes,
    weightRecords: null,
    feedingRecords: null,
    shedRecords: null,
    healthRecords: null,
    universalAnimal: animal,
  };
}

export function legacySnakeToDirectory(snake: Snake): UnifiedAnimalDirectoryRecord {
  const species = snake.universalSpeciesId
    ? findUniversalSpecies(snake.universalSpeciesId)
    : findUniversalSpecies(snake.species);
  return {
    id: snake.id,
    source: "legacy-snake",
    name: snake.name,
    speciesId: snake.universalSpeciesId || species?.id,
    speciesCommonName: snake.species || species?.commonNames[0],
    scientificName: species?.acceptedScientificName,
    animalGroup: "reptile",
    sex: legacySex(snake),
    status: legacyStatus(snake),
    morphOrColour: snake.morphs?.join(", ") || snake.customMorph || undefined,
    notes: snake.notes,
    photoUrl: snake.photo || snake.imageUrl || snake.photoUrl || undefined,
    weightRecords: snake.weightHistory?.length ?? 0,
    feedingRecords: snake.feedingHistory?.length ?? 0,
    shedRecords: snake.shedHistory?.length ?? 0,
    healthRecords: snake.healthHistory?.length ?? 0,
    legacySnake: snake,
  };
}

export async function getUnifiedAnimalDirectory(
  uid: string,
  options: { includeTrackerHistory?: boolean } = {},
): Promise<UnifiedAnimalDirectoryRecord[]> {
  if (!uid) return [];
  const [universalAnimals, legacySnakes] = await Promise.all([
    getUserAnimals(uid),
    options.includeTrackerHistory ? getUserSnakes(uid) : getUserSnakeDirectory(uid),
  ]);

  return [
    ...universalAnimals.map(universalAnimalToDirectory),
    ...legacySnakes.map(legacySnakeToDirectory),
  ].sort((a, b) => a.name.localeCompare(b.name));
}
