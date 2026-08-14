import type { Snake } from "../types/Snake";

export type DataConfidence = "Insufficient" | "Low" | "Moderate" | "High";

function dateValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function confidence(count: number, target: number): DataConfidence {
  if (count <= 0) return "Insufficient";
  if (count < Math.ceil(target / 3)) return "Low";
  if (count < target) return "Moderate";
  return "High";
}

function buildTimeline(snake: Snake, weights: any[], feedings: any[], sheds: any[]) {
  return [
    ...weights.map((item) => ({ type: "weight", date: dateValue(item.date), item })),
    ...feedings.map((item) => ({ type: "feeding", date: dateValue(item.date), item })),
    ...sheds.map((item) => ({ type: "shed", date: dateValue(item.date), item })),
    { type: "snake", date: dateValue(snake.createdAt), item: snake },
  ].sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
}

export function buildSnakeMasterRecord(snake: Snake) {
  const weights = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
  const sortedFeedings = Array.isArray(snake.feedingHistory) ? snake.feedingHistory : [];
  const sortedSheds = Array.isArray(snake.shedHistory) ? snake.shedHistory : [];

  const sortedWeights = [...weights].sort((a: any, b: any) => (Date.parse(dateValue(b.date) ?? "") || 0) - (Date.parse(dateValue(a.date) ?? "") || 0));
  const currentWeightG = sortedWeights.length ? Number(sortedWeights[0]?.weight ?? snake.weight ?? 0) : Number(snake.weight ?? 0);
  const previousWeightG = sortedWeights.length > 1 ? Number(sortedWeights[1]?.weight ?? 0) : null;
  const weightChangeG = previousWeightG === null ? null : currentWeightG - previousWeightG;
  const weightChangePercent = previousWeightG && previousWeightG !== 0 ? (weightChangeG! / previousWeightG) * 100 : null;

  const acceptedMeals = sortedFeedings.filter((item: any) => item.accepted !== false).length;
  const lastMealDate = dateValue(sortedFeedings[0]?.date) || null;
  const measuredSheds = sortedSheds.filter((record: any) => Number.isFinite(Number(record.shedLength)));
  const totalShedLengthCm = measuredSheds.length
    ? measuredSheds.reduce((sum: number, record: any) => sum + (Number(record.shedLength) || 0), 0)
    : null;
  const averageShedLengthCm = measuredSheds.length ? (totalShedLengthCm ?? 0) / measuredSheds.length : null;
  const lastShedDate = dateValue(sortedSheds[0]?.date) || null;

  const timeline = buildTimeline(snake, weights, sortedFeedings, sortedSheds);
  const weightConfidence = confidence(weights.length, 5);
  const feedingConfidence = confidence(sortedFeedings.length, 8);
  const sheddingConfidence = confidence(sortedSheds.length, 5);
  const available = [weightConfidence, feedingConfidence, sheddingConfidence].filter((value) => value !== "Insufficient").length;
  const overall: DataConfidence = available === 0 ? "Insufficient" : available === 3 ? "High" : available === 2 ? "Moderate" : "Low";

  return {
    snake,
    weights,
    feedings: sortedFeedings,
    sheds: sortedSheds,
    timeline,
    overview: {
      currentWeightG,
      weightChangeG,
      weightChangePercent,
      totalWeightLogs: weights.length,
      totalMeals: sortedFeedings.length,
      acceptedMeals,
      acceptanceRate: sortedFeedings.length ? Math.round((acceptedMeals / sortedFeedings.length) * 100) : null,
      lastMealDate,
      daysSinceMeal: daysSince(lastMealDate),
      totalSheds: sortedSheds.length,
      totalShedLengthCm,
      averageShedLengthCm,
      lastShedDate,
      daysSinceShed: daysSince(lastShedDate),
      confidence: { weight: weightConfidence, feeding: feedingConfidence, shedding: sheddingConfidence, overall },
    },
  };
}
