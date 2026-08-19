import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalStats } from "./creatorService";

type NumericRecord = { weight?: unknown; unit?: unknown; shedLength?: unknown; lengthCm?: unknown };
type UserData = Record<string, unknown>;

function toNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function weightToKg(weight: number, unit: unknown): number { return unit === "kg" ? weight : weight / 1000; }
function timestampMillis(value: unknown): number | null { if (!value) return null; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") { const millis = value.toMillis(); return Number.isFinite(millis) ? millis : null; } if (typeof value === "number" && Number.isFinite(value)) return value; const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }

/**
 * Canonical Creator Centre aggregation.
 *
 * Tracker records are read from their current Firebase subcollections. Embedded
 * legacy arrays are intentionally used only as a reconciliation fallback so
 * migrated records are not silently double-counted.
 */
export async function getCanonicalGlobalStats(): Promise<GlobalStats> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const now = Date.now();
  const dayCutoff = now - 24 * 60 * 60 * 1000;
  const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const monthCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const onlineCutoff = now - 15 * 60 * 1000;

  let onlineUsers = 0, activeTodayUsers = 0, activeWeekUsers = 0, activeMonthUsers = 0;
  let activatedUsers = 0, engagedUsers = 0, snakeProfiles = 0, mealsFed = 0;
  let weightLogs = 0, validWeightLogs = 0, invalidWeightLogs = 0, totalWeightKg = 0;
  let shedsLogged = 0, validShedLogs = 0, invalidShedLogs = 0, totalShedLengthCm = 0;
  let usersWithData = 0, incompleteUserProfiles = 0;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const userData = userDoc.data() as UserData;
    const lastActive = timestampMillis(userData.lastActiveAt);
    if (lastActive !== null) {
      if (lastActive >= onlineCutoff) onlineUsers += 1;
      if (lastActive >= dayCutoff) activeTodayUsers += 1;
      if (lastActive >= weekCutoff) activeWeekUsers += 1;
      if (lastActive >= monthCutoff) activeMonthUsers += 1;
    }
    if (userData.setupComplete === true) activatedUsers += 1; else incompleteUserProfiles += 1;

    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    snakeProfiles += snakesSnapshot.size;
    if (snakesSnapshot.size > 0) { engagedUsers += 1; usersWithData += 1; }

    await Promise.all(snakesSnapshot.docs.map(async (snakeDoc) => {
      const snake = snakeDoc.data() as Record<string, unknown>;
      const weightsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "weights"));
      const weightIds = new Set<string>();
      for (const weightDoc of weightsSnapshot.docs) {
        const item = weightDoc.data() as NumericRecord;
        weightIds.add(weightDoc.id);
        weightLogs += 1;
        const weight = toNumber(item.weight);
        if (weight > 0 && (item.unit === "g" || item.unit === "kg")) { validWeightLogs += 1; totalWeightKg += weightToKg(weight, item.unit); } else invalidWeightLogs += 1;
      }
      // Reconcile legacy embedded records only when they do not already exist in the canonical collection.
      if (Array.isArray(snake.weightHistory)) {
        for (const record of snake.weightHistory) {
          const item = record as NumericRecord & { id?: unknown };
          const weightId = typeof item.id === "string" ? item.id : "";
          if (weightId && weightIds.has(weightId)) continue;
          const weight = toNumber(item.weight);
          const duplicate = weightsSnapshot.docs.some((doc) => { const existing = doc.data() as NumericRecord; return String(existing.date ?? "") === String((item as Record<string, unknown>).date ?? "") && existing.weight === item.weight && existing.unit === item.unit; });
          if (duplicate) continue;
          // Legacy records are counted as data-quality candidates, not silently included in totals.
          if (weight > 0 && (item.unit === "g" || item.unit === "kg")) invalidWeightLogs += 1;
        }
      }

      const feedingSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings"));
      mealsFed += feedingSnapshot.size;

      const shedSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds"));
      shedsLogged += shedSnapshot.size;
      for (const shedDoc of shedSnapshot.docs) {
        const shed = shedDoc.data() as NumericRecord;
        const length = toNumber(shed.shedLength ?? shed.lengthCm);
        if (length > 0) { validShedLogs += 1; totalShedLengthCm += length; } else invalidShedLogs += 1;
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
