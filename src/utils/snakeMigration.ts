import type { Snake } from "../types/Snake";

export function migrateSnake(
  snake: Partial<Snake>
): Snake {

  return {

    id:
      snake.id ??
      crypto.randomUUID(),


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
      snake.weightTracking ??
      {
        enabled: false,
        frequency: "Monthly"
      },



    feedingHistory:
      snake.feedingHistory ??
      [],


    shedHistory:
      snake.shedHistory ??
      [],


    healthHistory:
      snake.healthHistory ??
      [],


    enclosure:
      snake.enclosure,



    breedingHistory:
      snake.breedingHistory ??
      [],


    timeline:
      snake.timeline ??
      [],



    hatchDate:
      snake.hatchDate ??
      "",


    arrivalDate:
      snake.arrivalDate ??
      "",



    notes:
      snake.notes ??
      "",



    status:
      snake.status ??
      "Active"

  };

}