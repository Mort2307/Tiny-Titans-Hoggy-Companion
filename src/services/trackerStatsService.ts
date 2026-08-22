import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalStats } from "./creatorService";
import { getPrivacyPreferences } from "./privacyService";

type NumericRecord = { weight?: unknown; unit?: unknown; date?: unknown; shedLength?: unknown; lengthCm?: unknown; deletedAt?: unknown };
type UserData = Record<string, unknown>;
type GlobalStatsOptions = { excludedUserIds?: string[] };

function toNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function weightToKg(weight: number, unit: unknown): number { return unit === "kg" ? weight : weight / 1000; }
function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") { const millis = value.toMillis(); return Number.isFinite(millis) ? millis : null; }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Canonical Creator Centre aggregation.
 * Platform activity counts describe the whole app. Tracker/community metrics
 * describe only users who currently have explicit communityHusbandryData consent.
 * This prevents private records from being mixed into the global intelligence dataset.
 */
export async function getCanonicalGlobalStats(options: GlobalStatsOptions = {}): Promise<GlobalStats> {
  const excludedUserIds = new Set(options.excludedUserIds ?? []);
  const usersSnapshot = await getDocs(collection(db, "users"));
  const now = Date.now(); const dayCutoff = now - 86400000; const weekCutoff = now - 7 * 86400000; const monthCutoff = now - 30 * 86400000; const onlineCutoff = now - 15 * 60000;
  let onlineUsers = 0, activeTodayUsers = 0, activeWeekUsers = 0, activeMonthUsers = 0, activatedUsers = 0, engagedUsers = 0, snakeProfiles = 0, communityContributors = 0, mealsFed = 0, weightLogs = 0, validWeightLogs = 0, invalidWeightLogs = 0, legacyWeightCandidates = 0, totalWeightKg = 0, shedsLogged = 0, validShedLogs = 0, invalidShedLogs = 0, totalShedLengthCm = 0, usersWithData = 0, incompleteUserProfiles = 0;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const userData = userDoc.data() as UserData; const lastActive = timestampMillis(userData.lastActiveAt);
    if (lastActive !== null) { if (lastActive >= onlineCutoff) onlineUsers += 1; if (lastActive >= dayCutoff) activeTodayUsers += 1; if (lastActive >= weekCutoff) activeWeekUsers += 1; if (lastActive >= monthCutoff) activeMonthUsers += 1; }
    if (userData.setupComplete === true) activatedUsers += 1; else incompleteUserProfiles += 1;
    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    if (snakesSnapshot.size > 0) engagedUsers += 1;
    if (excludedUserIds.has(userDoc.id)) return;
    let privacy;
    try { privacy = await getPrivacyPreferences(userDoc.id); } catch { return; }
    if (privacy.communityHusbandryData !== true) return;
    communityContributors += 1;
    snakeProfiles += snakesSnapshot.size;
    if (snakesSnapshot.size > 0) usersWithData += 1;

    await Promise.all(snakesSnapshot.docs.map(async (snakeDoc) => {
      const snake = snakeDoc.data() as Record<string, unknown>;
      const weightsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "weights"));
      const weightIds = new Set(weightsSnapshot.docs.map((doc) => doc.id));
      for (const weightDoc of weightsSnapshot.docs) {
        const item = weightDoc.data() as NumericRecord; if (item.deletedAt) continue; weightLogs += 1; const weight = toNumber(item.weight);
        if (weight > 0 && (item.unit === "g" || item.unit === "kg")) { validWeightLogs += 1; totalWeightKg += weightToKg(weight, item.unit); } else invalidWeightLogs += 1;
      }
      if (Array.isArray(snake.weightHistory)) for (const record of snake.weightHistory) {
        const item = record as NumericRecord & { id?: unknown }; const weightId = typeof item.id === "string" ? item.id : ""; if (weightId && weightIds.has(weightId)) continue;
        const weight = toNumber(item.weight); if (weight <= 0 || (item.unit !== "g" && item.unit !== "kg")) continue;
        const duplicate = weightsSnapshot.docs.some((doc) => { const existing = doc.data() as NumericRecord; return String(existing.date ?? "") === String(item.date ?? "") && existing.weight === item.weight && existing.unit === item.unit; });
        if (!duplicate) legacyWeightCandidates += 1;
      }
      const feedingSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings")); mealsFed += feedingSnapshot.docs.filter((doc) => !(doc.data() as NumericRecord).deletedAt).length;
      const shedSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds"));
      for (const shedDoc of shedSnapshot.docs) { const shed = shedDoc.data() as NumericRecord; if (shed.deletedAt) continue; shedsLogged += 1; const length = toNumber(shed.shedLength ?? shed.lengthCm); if (length > 0) { validShedLogs += 1; totalShedLengthCm += length; } else invalidShedLogs += 1; }
    }));
  }));

  const geneticsSnapshot = await getDocs(collection(db, "geneticsCalculations"));
  const dataQualityIssues = invalidWeightLogs + invalidShedLogs;
  return { registeredUsers: usersSnapshot.size, activeUsers: onlineUsers, onlineUsers, activeTodayUsers, activeWeekUsers, activeMonthUsers, activatedUsers, engagedUsers: Math.min(engagedUsers, usersSnapshot.size), usersWithData, incompleteUserProfiles, communityContributors, snakeProfiles, mealsFed, weightLogs, validWeightLogs, invalidWeightLogs, legacyWeightCandidates, totalWeightKg, totalWeightLb: totalWeightKg * 2.2046226218, shedsLogged, validShedLogs, invalidShedLogs, totalShedLengthCm, totalShedLengthIn: totalShedLengthCm / 2.54, geneticsCalculations: geneticsSnapshot.size, dataQualityIssues };
}
