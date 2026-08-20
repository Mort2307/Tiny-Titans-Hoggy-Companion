import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalStats } from "./creatorService";

type NumericRecord = {
  weight?: unknown;
  unit?: unknown;
  date?: unknown;
  shedLength?: unknown;
  lengthCm?: unknown;
  deletedAt?: unknown;
};
type UserData = Record<string, unknown>;

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weightToKg(weight: number, unit: unknown): number {
  return unit === "kg" ? weight : weight / 1000;
}

function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Canonical Creator Centre aggregation.
 *
 * The Firebase subcollections are the source of truth for tracker totals.
 * Legacy embedded arrays are inspected only for reconciliation candidates and
 * are never silently mixed into the canonical totals.
 */
export async function getCanonicalGlobalStats(): Promise<GlobalStats> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const now = Date.now();
  const dayCutoff = now - 24 * 60 * 60 * 1000;
  const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const monthCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const onlineCutoff = now - 15 * 60 * 1000;

  let onlineUsers = 0;
  let activeTodayUsers = 0;
  let activeWeekUsers = 0;
  let activeMonthUsers = 0;
  let activatedUsers = 0;
  let engagedUsers = 0;
  let snakeProfiles = 0;
  let mealsFed = 0;
  let weightLogs = 0;
  let validWeightLogs = 0;
  let invalidWeightLogs = 0;
  let legacyWeightCandidates = 0;
  let totalWeightKg = 0;
  let shedsLogged = 0;
  let validShedLogs = 0;
  let invalidShedLogs = 0;
  let totalShedLengthCm = 0;
  let usersWithData = 0;
  let incompleteUserProfiles = 0;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const userData = userDoc.data() as UserData;
    const lastActive = timestampMillis(userData.lastActiveAt);

    if (lastActive !== null) {
      if (lastActive >= onlineCutoff) onlineUsers += 1;
      if (lastActive >= dayCutoff) activeTodayUsers += 1;
      if (lastActive >= weekCutoff) activeWeekUsers += 1;
      if (lastActive >= monthCutoff) activeMonthUsers += 1;
    }

    if (userData.setupComplete === true) activatedUsers += 1;
    else incompleteUserProfiles += 1;

    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    snakeProfiles += snakesSnapshot.size;

    if (snakesSnapshot.size > 0) {
      engagedUsers += 1;
      usersWithData += 1;
    }

    await Promise.all(snakesSnapshot.docs.map(async (snakeDoc) => {
      const snake = snakeDoc.data() as Record<string, unknown>;

      const weightsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "weights"));
      const weightIds = new Set(weightsSnapshot.docs.map((doc) => doc.id));

      for (const weightDoc of weightsSnapshot.docs) {
        const item = weightDoc.data() as NumericRecord;
        if (item.deletedAt) continue;

        weightLogs += 1;
        const weight = toNumber(item.weight);
        if (weight > 0 && (item.unit === "g" || item.unit === "kg")) {
          validWeightLogs += 1;
          totalWeightKg += weightToKg(weight, item.unit);
        } else {
          invalidWeightLogs += 1;
        }
      }

      // Legacy arrays are reconciliation candidates only. A valid legacy record
      // is NOT an invalid canonical record, so it must not inflate data-quality
      // failures or the global weight totals.
      if (Array.isArray(snake.weightHistory)) {
        for (const record of snake.weightHistory) {
          const item = record as NumericRecord & { id?: unknown };
          const weightId = typeof item.id === "string" ? item.id : "";
          if (weightId && weightIds.has(weightId)) continue;

          const weight = toNumber(item.weight);
          if (weight <= 0 || (item.unit !== "g" && item.unit !== "kg")) continue;

          const duplicate = weightsSnapshot.docs.some((doc) => {
            const existing = doc.data() as NumericRecord;
            return String(existing.date ?? "") === String(item.date ?? "")
              && existing.weight === item.weight
              && existing.unit === item.unit;
          });
          if (!duplicate) legacyWeightCandidates += 1;
        }
      }

      const feedingSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings"));
      mealsFed += feedingSnapshot.docs.filter((doc) => !(doc.data() as NumericRecord).deletedAt).length;

      const shedSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds"));
      for (const shedDoc of shedSnapshot.docs) {
        const shed = shedDoc.data() as NumericRecord;
        if (shed.deletedAt) continue;

        shedsLogged += 1;
        const length = toNumber(shed.shedLength ?? shed.lengthCm);
        if (length > 0) {
          validShedLogs += 1;
          totalShedLengthCm += length;
        } else {
          invalidShedLogs += 1;
        }
      }
    }));
  }));

  const geneticsSnapshot = await getDocs(collection(db, "geneticsCalculations"));
  const dataQualityIssues = invalidWeightLogs + invalidShedLogs;

  return {
    registeredUsers: usersSnapshot.size,
    activeUsers: onlineUsers,
    onlineUsers,
    activeTodayUsers,
    activeWeekUsers,
    activeMonthUsers,
    activatedUsers,
    engagedUsers: Math.min(engagedUsers, usersSnapshot.size),
    usersWithData,
    incompleteUserProfiles,
    snakeProfiles,
    mealsFed,
    weightLogs,
    validWeightLogs,
    invalidWeightLogs,
    legacyWeightCandidates,
    totalWeightKg,
    totalWeightLb: totalWeightKg * 2.2046226218,
    shedsLogged,
    validShedLogs,
    invalidShedLogs,
    totalShedLengthCm,
    totalShedLengthIn: totalShedLengthCm / 2.54,
    geneticsCalculations: geneticsSnapshot.size,
    dataQualityIssues,
  };
}
