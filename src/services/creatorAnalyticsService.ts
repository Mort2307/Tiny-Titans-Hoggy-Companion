import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { Snake } from "../types/Snake";

export type CreatorGlobalMetrics = {
  registeredUsers: number;
  activeUsers: number;
  snakeProfiles: number;
  mealsFed: number;
  weightLogs: number;
  totalWeightKg: number;
  totalWeightLb: number;
  shedsLogged: number;
  totalShedLengthCm: number;
  totalShedLengthIn: number;
  geneticsCalculations: number;
};

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const GENETICS_EVENT_TYPE = "genetics_calculation_completed";

function millis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weightKg(value: unknown, unit: unknown): number {
  const weight = number(value);
  if (unit === "kg") return weight;
  if (unit === "g") return weight / 1000;
  return weight / 1000;
}

function shedLengthCm(record: Record<string, unknown>): number {
  const value = number(record.shedLength ?? record.length ?? record.lengthCm ?? record.measurement);
  const unit = record.shedLengthUnit ?? record.lengthUnit ?? record.unit;
  if (unit === "in" || unit === "inch" || unit === "inches") return value * 2.54;
  if (unit === "m") return value * 100;
  return value;
}

export async function getCreatorGlobalMetrics(): Promise<CreatorGlobalMetrics> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const metrics: CreatorGlobalMetrics = {
    registeredUsers: usersSnapshot.size,
    activeUsers: 0,
    snakeProfiles: 0,
    mealsFed: 0,
    weightLogs: 0,
    totalWeightKg: 0,
    totalWeightLb: 0,
    shedsLogged: 0,
    totalShedLengthCm: 0,
    totalShedLengthIn: 0,
    geneticsCalculations: 0,
  };

  const cutoff = Date.now() - ACTIVE_WINDOW_MS;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const userData = userDoc.data() as Record<string, unknown>;
    const lastActive = millis(userData.lastActiveAt);
    if (lastActive !== null && lastActive >= cutoff) metrics.activeUsers += 1;

    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    metrics.snakeProfiles += snakesSnapshot.size;

    await Promise.all(snakesSnapshot.docs.map(async (snakeDoc) => {
      const snake = snakeDoc.data() as Partial<Snake>;

      const feedingsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings"));
      metrics.mealsFed += feedingsSnapshot.size;

      const weights = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
      metrics.weightLogs += weights.length;
      for (const item of weights) {
        const record = item as { weight?: unknown; unit?: unknown };
        metrics.totalWeightKg += weightKg(record.weight, record.unit);
      }

      const shedsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds"));
      for (const shedDoc of shedsSnapshot.docs) {
        const shed = shedDoc.data() as Record<string, unknown>;
        if (shed.deletedAt) continue;
        metrics.shedsLogged += 1;
        metrics.totalShedLengthCm += shedLengthCm(shed);
      }
    }));

    const analyticsSnapshot = await getDocs(query(
      collection(db, "users", userDoc.id, "analyticsEvents"),
      where("type", "==", GENETICS_EVENT_TYPE),
    ));
    metrics.geneticsCalculations += analyticsSnapshot.size;
  }));

  metrics.totalWeightLb = metrics.totalWeightKg * 2.2046226218;
  metrics.totalShedLengthIn = metrics.totalShedLengthCm / 2.54;
  return metrics;
}
