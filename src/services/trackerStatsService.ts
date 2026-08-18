import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalStats } from "./creatorService";

type NumericRecord = { weight?: unknown; unit?: unknown; shedLength?: unknown };
type UserData = Record<string, unknown>;

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weightToKg(weight: number, unit: unknown): number {
  if (unit === "kg") return weight;
  return weight / 1000;
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
  let totalWeightKg = 0;
  let shedsLogged = 0;
  let validShedLogs = 0;
  let invalidShedLogs = 0;
  let totalShedLengthCm = 0;
  let usersWithData = 0;
  let incompleteUserProfiles = 0;

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data() as UserData;
      const lastActive = timestampMillis(userData.lastActiveAt);
      if (lastActive !== null) {
        if (lastActive >= onlineCutoff) onlineUsers += 1;
        if (lastActive >= dayCutoff) activeTodayUsers += 1;
        if (lastActive >= weekCutoff) activeWeekUsers += 1;
        if (lastActive >= monthCutoff) activeMonthUsers += 1;
      }

      const setupComplete = userData.setupComplete === true;
      if (setupComplete) activatedUsers += 1;
      else incompleteUserProfiles += 1;

      const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
      snakeProfiles += snakesSnapshot.size;
      if (snakesSnapshot.size > 0) {
        engagedUsers += 1;
        usersWithData += 1;
      }

      await Promise.all(
        snakesSnapshot.docs.map(async (snakeDoc) => {
          const snake = snakeDoc.data() as Record<string, unknown>;
          let snakeHasData = false;

          const weightHistory = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
          weightLogs += weightHistory.length;
          for (const record of weightHistory) {
            const item = record as NumericRecord;
            const weight = toNumber(item.weight);
            const unit = item.unit;
            const valid = weight > 0 && (unit === "g" || unit === "kg");
            if (valid) {
              validWeightLogs += 1;
              totalWeightKg += weightToKg(weight, unit);
              snakeHasData = true;
            } else {
              invalidWeightLogs += 1;
            }
          }

          const feedingSnapshot = await getDocs(
            collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings")
          );
          mealsFed += feedingSnapshot.size;
          if (feedingSnapshot.size > 0) snakeHasData = true;

          const shedSnapshot = await getDocs(
            collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds")
          );
          shedsLogged += shedSnapshot.size;
          for (const shedDoc of shedSnapshot.docs) {
            const shed = shedDoc.data() as NumericRecord;
            const length = toNumber(shed.shedLength);
            if (length > 0) {
              validShedLogs += 1;
              totalShedLengthCm += length;
              snakeHasData = true;
            } else {
              invalidShedLogs += 1;
            }
          }

          if (snakeHasData && snakesSnapshot.size > 0 && !engagedUsers) engagedUsers += 1;
        })
      );
    })
  );

  const geneticsSnapshot = await getDocs(collection(db, "geneticsCalculations"));

  // Engagement is deliberately derived from canonical user-owned records rather than
  // document counts. The snake count is already enough to classify a user as engaged;
  // this fallback keeps the invariant explicit without introducing a second user source.
  const reconciledEngagedUsers = Math.min(engagedUsers, usersSnapshot.size);
  const dataQualityIssues = invalidWeightLogs + invalidShedLogs + incompleteUserProfiles;

  return {
    registeredUsers: usersSnapshot.size,
    activeUsers: onlineUsers,
    onlineUsers,
    activeTodayUsers,
    activeWeekUsers,
    activeMonthUsers,
    activatedUsers,
    engagedUsers: reconciledEngagedUsers,
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
