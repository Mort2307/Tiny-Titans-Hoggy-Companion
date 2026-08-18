import type { Snake } from "../types/Snake";

export type HoggieStatus = "good" | "info" | "attention";

export type HoggieInsight = {
  status: HoggieStatus;
  label: string;
  detail: string;
};

const MS_PER_DAY = 86_400_000;

function daysSince(date?: string): number | null {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / MS_PER_DAY));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function feedingIntervals(snake: Snake): number[] {
  const dates = (snake.feedingHistory ?? [])
    .map((record) => new Date(record.date).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return dates.slice(1).map((date, index) => (date - dates[index]) / MS_PER_DAY);
}

export function getHoggieInsight(snake: Snake): HoggieInsight {
  const weightRecords = snake.weightHistory ?? [];
  const feedingRecords = snake.feedingHistory ?? [];
  const shedRecords = snake.shedHistory ?? [];

  if (!weightRecords.length && !feedingRecords.length && !shedRecords.length) {
    return { status: "info", label: "Building baseline", detail: "Record a few routine events and Tiny Titans will learn this Titan's individual patterns." };
  }

  const lastWeightDays = daysSince(snake.lastWeighedDate || weightRecords.at(-1)?.date);
  const lastFeedDays = daysSince(snake.lastMealDate || feedingRecords.at(-1)?.date);
  const lastShedDays = daysSince(shedRecords.at(-1)?.date);

  if (weightRecords.length < 3) {
    return { status: "info", label: "Building baseline", detail: "A few more weight records will make the personal growth trend more meaningful." };
  }

  const intervals = feedingIntervals(snake);
  if (intervals.length >= 3 && lastFeedDays !== null) {
    const typical = median(intervals);
    if (typical !== null && lastFeedDays > Math.max(typical * 2.5, typical + 14)) {
      return { status: "attention", label: "Worth checking", detail: `No feeding record for ${lastFeedDays} days. This is outside this Titan's recent recorded feeding pattern.` };
    }
  }

  if (lastWeightDays !== null && lastWeightDays > 30) {
    return { status: "info", label: "Record due", detail: `No weight has been recorded for ${lastWeightDays} days. A routine weigh-in would strengthen the personal trend.` };
  }

  return { status: "good", label: "Pattern looks consistent", detail: "Recent records are broadly consistent with this Titan's recorded history." };
}
