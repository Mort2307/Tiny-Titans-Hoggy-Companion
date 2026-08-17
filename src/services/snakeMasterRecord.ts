import type { FeedingRecord } from "../types/Feeding";
import type { ShedRecord } from "../types/Shed";
import type { Snake } from "../types/Snake";
import type { TimelineEvent } from "../types/Timeline";
import type { WeightRecord } from "../types/Weight";
import { getSnakeFeedings } from "./feedingService";
import { getSnakeSheds } from "./shedService";
import { getSnakeWeights, migrateEmbeddedWeights } from "./weightService";
import { getUserSnake } from "./snakeService";

export type DataConfidence = "High" | "Moderate" | "Low" | "Insufficient";
export type ConfidenceArea = "weight" | "feeding" | "shedding";

export type SnakeMasterRecord = {
  snake: Snake;
  weights: WeightRecord[];
  feedings: FeedingRecord[];
  sheds: ShedRecord[];
  timeline: TimelineEvent[];
  overview: {
    currentWeightG: number | null;
    weightChangeG: number | null;
    weightChangePercent: number | null;
    totalWeightLogs: number;
    totalMeals: number;
    acceptedMeals: number;
    acceptanceRate: number | null;
    lastMealDate: string | null;
    daysSinceMeal: number | null;
    totalSheds: number;
    totalShedLengthCm: number | null;
    averageShedLengthCm: number | null;
    lastShedDate: string | null;
    daysSinceShed: number | null;
    confidence: { weight: DataConfidence; feeding: DataConfidence; shedding: DataConfidence; overall: DataConfidence };
    confidenceReasons: Record<ConfidenceArea, { records: number; target: number; level: DataConfidence; reason: string; missing: string }>;
  };
};

function dateValue(value?: string): string { return typeof value === "string" ? value : ""; }
function daysSince(date?: string | null, today = new Date()): number | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((today.getTime() - parsed) / 86_400_000));
}
function confidence(count: number, strongAt: number): DataConfidence {
  if (count <= 0) return "Insufficient";
  if (count >= strongAt) return "High";
  if (count >= 2) return "Moderate";
  return "Low";
}
function confidenceReason(area: string, count: number, target: number, level: DataConfidence) {
  if (level === "Insufficient") return { reason: `No ${area.toLowerCase()} history is recorded yet.`, missing: `Record your first ${area.toLowerCase()} event to start an individual baseline.` };
  if (level === "High") return { reason: `Based on ${count} ${area.toLowerCase()} records, giving Tiny Titans enough individual history for a stronger baseline.`, missing: "Nothing essential is missing for this confidence level." };
  const remaining = Math.max(0, target - count);
  return { reason: `Based on ${count} ${area.toLowerCase()} record${count === 1 ? "" : "s"}.`, missing: `${remaining} more record${remaining === 1 ? "" : "s"} will strengthen this baseline.` };
}
function buildTimeline(snake: Snake, weights: WeightRecord[], feedings: FeedingRecord[], sheds: ShedRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (snake.hatchDate) events.push({ id: `hatch-${snake.id}`, snakeId: snake.id, date: snake.hatchDate, type: "Hatch", title: "Hatched" });
  if (snake.arrivalDate) events.push({ id: `arrival-${snake.id}`, snakeId: snake.id, date: snake.arrivalDate, type: "Arrival", title: "Arrived" });
  weights.forEach((record) => events.push({ id: `weight-${record.id}`, snakeId: snake.id, date: record.date, type: "Weight", title: `Weight: ${record.weight}${record.unit}`, relatedRecordId: record.id }));
  feedings.forEach((record) => events.push({ id: `feeding-${record.id}`, snakeId: snake.id, date: record.date, type: "Feeding", title: `${record.foodType} — ${record.response}`, description: record.weight ? `${record.weight}g prey` : undefined, relatedRecordId: record.id }));
  sheds.forEach((record) => { const date = dateValue(record.date); if (!date) return; events.push({ id: `shed-${record.id}`, snakeId: snake.id, date, type: "Shed", title: record.shedLength ? `Shed — ${record.shedLength}cm` : "Shed recorded", description: record.quality, relatedRecordId: record.id }); });
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSnakeMasterRecord(uid: string, snakeId: string): Promise<SnakeMasterRecord | null> {
  const snake = await getUserSnake(uid, snakeId);
  if (!snake) return null;
  const [feedings, sheds, canonicalWeights] = await Promise.all([
    getSnakeFeedings(uid, snakeId),
    getSnakeSheds(uid, snakeId).catch(() => [] as ShedRecord[]),
    getSnakeWeights(uid, snakeId),
  ]);
  // Legacy compatibility: migrate embedded history only when the canonical event collection is empty.
  const weights = canonicalWeights.length > 0
    ? canonicalWeights
    : await migrateEmbeddedWeights(uid, snakeId, snake.weightHistory ?? []);
  const sortedWeights = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const currentWeightG = typeof snake.weight === "number" ? snake.weight : sortedWeights[0]?.weight ?? null;
  const firstWeight = sortedWeights.length ? sortedWeights[sortedWeights.length - 1].weight : snake.startingWeight;
  const weightChangeG = currentWeightG !== null && firstWeight !== null && firstWeight !== undefined ? currentWeightG - firstWeight : null;
  const weightChangePercent = weightChangeG !== null && firstWeight ? (weightChangeG / firstWeight) * 100 : null;
  const sortedFeedings = [...feedings].sort((a, b) => b.date.localeCompare(a.date));
  const acceptedMeals = sortedFeedings.filter((record) => record.response === "Accepted").length;
  const lastMealDate = sortedFeedings[0]?.date ?? null;
  const sortedSheds = [...sheds].sort((a, b) => dateValue(b.date).localeCompare(dateValue(a.date)));
  const measuredSheds = sortedSheds.filter((record) => typeof record.shedLength === "number" && record.shedLength > 0);
  const totalShedLengthCm = measuredSheds.length ? measuredSheds.reduce((sum, record) => sum + (record.shedLength ?? 0), 0) : null;
  const averageShedLengthCm = measuredSheds.length ? (totalShedLengthCm ?? 0) / measuredSheds.length : null;
  const lastShedDate = dateValue(sortedSheds[0]?.date) || null;
  const timeline = buildTimeline(snake, sortedWeights, sortedFeedings, sortedSheds);
  const weightConfidence = confidence(sortedWeights.length, 5);
  const feedingConfidence = confidence(sortedFeedings.length, 8);
  const sheddingConfidence = confidence(sortedSheds.length, 5);
  const available = [weightConfidence, feedingConfidence, sheddingConfidence].filter((value) => value !== "Insufficient").length;
  const overall: DataConfidence = available === 0 ? "Insufficient" : available === 3 ? "High" : available === 2 ? "Moderate" : "Low";
  const confidenceReasons = {
    weight: { records: sortedWeights.length, target: 5, level: weightConfidence, ...confidenceReason("Weight", sortedWeights.length, 5, weightConfidence) },
    feeding: { records: sortedFeedings.length, target: 8, level: feedingConfidence, ...confidenceReason("Feeding", sortedFeedings.length, 8, feedingConfidence) },
    shedding: { records: sortedSheds.length, target: 5, level: sheddingConfidence, ...confidenceReason("Shedding", sortedSheds.length, 5, sheddingConfidence) },
  };
  return { snake, weights: sortedWeights, feedings: sortedFeedings, sheds: sortedSheds, timeline, overview: {
    currentWeightG, weightChangeG, weightChangePercent, totalWeightLogs: sortedWeights.length, totalMeals: sortedFeedings.length,
    acceptedMeals, acceptanceRate: sortedFeedings.length ? Math.round((acceptedMeals / sortedFeedings.length) * 100) : null,
    lastMealDate, daysSinceMeal: daysSince(lastMealDate), totalSheds: sortedSheds.length, totalShedLengthCm,
    averageShedLengthCm, lastShedDate, daysSinceShed: daysSince(lastShedDate),
    confidence: { weight: weightConfidence, feeding: feedingConfidence, shedding: sheddingConfidence, overall }, confidenceReasons,
  }};
}
