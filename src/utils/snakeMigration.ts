import type { Snake } from "../types/Snake";

import { generateId } from "./generateId";

export function migrateSnake(
  snake: Partial<Snake>
): Snake {
  return {
    id:
      typeof snake.id === "string" &&
      snake.id.trim()
        ? snake.id.trim()
        : generateId(),

    // ==============================
    // IDENTITY
    // ==============================

    name:
      snake.name ??
      "Unnamed Snake",

    species:
      snake.species ??
      "Western Hognose",

    photo:
      snake.photo ??
      "",

    sex:
      snake.sex ??
      "Unknown",

    nickname:
      snake.nickname ??
      "",

    breeder:
      snake.breeder ??
      "",

    origin:
      snake.origin ??
      "",

    acquisitionDate:
      snake.acquisitionDate ??
      "",

    // ==============================
    // GENETICS
    // ==============================

    morphs:
      snake.morphs ??
      [],

    customMorph:
      snake.customMorph ??
      "",

    hets:
      snake.hets ??
      [],

    customHets:
      snake.customHets ??
      "",

    // ==============================
    // WEIGHT
    // ==============================

    startingWeight:
      snake.startingWeight ??
      null,

    startingWeightDate:
      snake.startingWeightDate ??
      "",

    weight:
      snake.weight ??
      null,

    lastWeighedDate:
      snake.lastWeighedDate ??
      "",

    weightHistory:
      snake.weightHistory ??
      [],

    weightTracking:
      snake.weightTracking ?? {
        enabled: false,
        frequency: "Monthly",
      },

    // ==============================
    // FEEDING
    // ==============================

    feedingHistory:
      snake.feedingHistory ??
      [],

    // ==============================
    // SHEDDING
    // ==============================

    shedHistory:
      snake.shedHistory ??
      [],

    // ==============================
    // HEALTH
    // ==============================

    healthHistory:
      snake.healthHistory ??
      [],

    // ==============================
    // ENCLOSURE
    // ==============================

    ...(snake.enclosure
      ? {
          enclosure:
            snake.enclosure,
        }
      : {}),

    // ==============================
    // BREEDING
    // ==============================

    breedingHistory:
      snake.breedingHistory ??
      [],

    // ==============================
    // TIMELINE
    // ==============================

    timeline:
      snake.timeline ??
      [],

    // ==============================
    // DATES
    // ==============================

    hatchDate:
      snake.hatchDate ??
      "",

    arrivalDate:
      snake.arrivalDate ??
      "",

    // ==============================
    // HUSBANDRY
    // ==============================

    temperatureNotes:
      snake.temperatureNotes ??
      "",

    humidityNotes:
      snake.humidityNotes ??
      "",

    // ==============================
    // FEEDING NOTES
    // ==============================

    lastMealDate:
      snake.lastMealDate ??
      "",

    feedingNotes:
      snake.feedingNotes ??
      "",

    // ==============================
    // HEALTH NOTES
    // ==============================

    healthNotes:
      snake.healthNotes ??
      "",

    medicationNotes:
      snake.medicationNotes ??
      "",

    // ==============================
    // BREEDING NOTES
    // ==============================

    breedingEligible:
      snake.breedingEligible ??
      false,

    breedingNotes:
      snake.breedingNotes ??
      "",

    // ==============================
    // GENERAL NOTES
    // ==============================

    notes:
      snake.notes ??
      "",

    // ==============================
    // STATUS
    // ==============================

    status:
      snake.status ??
      "Active",
  };
}