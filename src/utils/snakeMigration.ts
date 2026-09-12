import type { Snake } from "../types/Snake";
import { generateId } from "./generateId";

function normaliseSnakeSex(value: unknown): Snake["sex"] {
  const normalised = String(value ?? "").trim().toLowerCase();
  if (normalised === "male" || normalised === "m") return "Male";
  if (normalised === "female" || normalised === "f") return "Female";
  return "Unknown";
}

export function migrateSnake(snake: Partial<Snake>): Snake {
  return {
    id: typeof snake.id === "string" && snake.id.trim() ? snake.id.trim() : generateId(),
    name: snake.name ?? "Unnamed Snake",
    species: snake.species ?? "Western Hognose",
    photo: snake.photo ?? "",
    sex: normaliseSnakeSex(snake.sex),
    nickname: snake.nickname ?? "",
    breeder: snake.breeder ?? "",
    origin: snake.origin ?? "",
    acquisitionDate: snake.acquisitionDate ?? "",
    morphs: snake.morphs ?? [],
    customMorph: snake.customMorph ?? "",
    hets: snake.hets ?? [],
    customHets: snake.customHets ?? "",
    ...(snake.geneticsProfile ? { geneticsProfile: snake.geneticsProfile } : {}),
    startingWeight: snake.startingWeight ?? null,
    startingWeightDate: snake.startingWeightDate ?? "",
    weight: snake.weight ?? null,
    lastWeighedDate: snake.lastWeighedDate ?? "",
    weightHistory: snake.weightHistory ?? [],
    weightTracking: snake.weightTracking ?? { enabled: false, frequency: "Monthly" },
    feedingHistory: snake.feedingHistory ?? [],
    ...(snake.feedingSchedule ? { feedingSchedule: snake.feedingSchedule } : {}),
    shedHistory: snake.shedHistory ?? [],
    healthHistory: snake.healthHistory ?? [],
    ...(snake.enclosure ? { enclosure: snake.enclosure } : {}),
    breedingHistory: snake.breedingHistory ?? [],
    timeline: snake.timeline ?? [],
    hatchDate: snake.hatchDate ?? "",
    arrivalDate: snake.arrivalDate ?? "",
    temperatureNotes: snake.temperatureNotes ?? "",
    humidityNotes: snake.humidityNotes ?? "",
    lastMealDate: snake.lastMealDate ?? "",
    feedingNotes: snake.feedingNotes ?? "",
    healthNotes: snake.healthNotes ?? "",
    medicationNotes: snake.medicationNotes ?? "",
    breedingEligible: snake.breedingEligible ?? false,
    breedingNotes: snake.breedingNotes ?? "",
    notes: snake.notes ?? "",
    status: snake.status ?? "Active",
  };
}
