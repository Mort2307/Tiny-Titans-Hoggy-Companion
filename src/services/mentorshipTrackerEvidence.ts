import { getUserSnakes } from "./snakeService";
import type { Snake } from "../types/Snake";
import type { MentorshipInsightInput } from "./mentorshipInsights";

export type MentorshipTrackerEvidence = Pick<MentorshipInsightInput, "hasWeightRecords" | "hasFeedingRecords" | "hasShedRecords" | "hasGeneticsRecords" | "hasEnclosureData" | "experienceMonths"> & {
  snakeCount: number;
  weightRecordCount: number;
  feedingRecordCount: number;
  shedRecordCount: number;
  snakesWithGenetics: number;
  snakesWithEnclosures: number;
  source: "live-tracker-data";
};

function monthsBetween(start: string | undefined, now = new Date()) {
  if (!start) return 0;
  const date = new Date(start);
  if (Number.isNaN(date.getTime()) || date > now) return 0;
  return Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
}

function hasGenetics(snake: Snake) {
  return snake.morphs.length > 0 || snake.hets.length > 0 || Boolean(snake.customMorph.trim()) || Boolean(snake.customHets.trim());
}

export async function getMentorshipTrackerEvidence(uid: string): Promise<MentorshipTrackerEvidence> {
  const snakes = await getUserSnakes(uid);
  const weightRecordCount = snakes.reduce((total, snake) => total + snake.weightHistory.length, 0);
  const feedingRecordCount = snakes.reduce((total, snake) => total + (snake.feedingHistory?.length ?? 0), 0);
  const shedRecordCount = snakes.reduce((total, snake) => total + (snake.shedHistory?.length ?? 0), 0);
  const snakesWithGenetics = snakes.filter(hasGenetics).length;
  const snakesWithEnclosures = snakes.filter((snake) => Boolean(snake.enclosure)).length;
  const oldestExperience = snakes.reduce((oldest, snake) => {
    const candidate = snake.acquisitionDate || snake.hatchDate || snake.arrivalDate;
    if (!candidate) return oldest;
    if (!oldest) return candidate;
    return new Date(candidate) < new Date(oldest) ? candidate : oldest;
  }, "" as string);
  return {
    snakeCount: snakes.length,
    weightRecordCount,
    feedingRecordCount,
    shedRecordCount,
    snakesWithGenetics,
    snakesWithEnclosures,
    hasWeightRecords: weightRecordCount > 0,
    hasFeedingRecords: feedingRecordCount > 0,
    hasShedRecords: shedRecordCount > 0,
    hasGeneticsRecords: snakesWithGenetics > 0,
    hasEnclosureData: snakesWithEnclosures > 0,
    experienceMonths: monthsBetween(oldestExperience || undefined),
    source: "live-tracker-data",
  };
}
