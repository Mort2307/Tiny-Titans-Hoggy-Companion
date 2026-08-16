import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { GlobalStats } from "./creatorService";

type NumericRecord = { weight?: unknown; unit?: unknown; shedLength?: unknown };

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weightToKg(weight: number, unit: unknown): number {
  if (unit === "kg") return weight;
  return weight / 1000;
}

export async function getCanonicalGlobalStats(): Promise<GlobalStats> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const activeCutoff = Date.now() - 15 * 60 * 1000;

  let activeUsers = 0;
  let snakeProfiles = 0;
  let mealsFed = 0;
  let weightLogs = 0;
  let totalWeightKg = 0;
  let shedsLogged = 0;
  let totalShedLengthCm = 0;

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data() as Record<string, unknown>;
      const lastActiveAt = userData.lastActiveAt;
      if (
        lastActiveAt &&
        typeof lastActiveAt === "object" &&
        "toMillis" in lastActiveAt &&
        typeof lastActiveAt.toMillis === "function" &&
        lastActiveAt.toMillis() >= activeCutoff
      ) {
        activeUsers += 1;
      }

      const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
      snakeProfiles += snakesSnapshot.size;

      await Promise.all(
        snakesSnapshot.docs.map(async (snakeDoc) => {
          const snake = snakeDoc.data() as Record<string, unknown>;

          const weightHistory = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
          weightLogs += weightHistory.length;
          for (const record of weightHistory) {
            const item = record as NumericRecord;
            totalWeightKg += weightToKg(toNumber(item.weight), item.unit);
          }

          const feedingSnapshot = await getDocs(
            collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings")
          );
          mealsFed += feedingSnapshot.size;

          const shedSnapshot = await getDocs(
            collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds")
          );
          shedsLogged += shedSnapshot.size;
          for (const shedDoc of shedSnapshot.docs) {
            const shed = shedDoc.data() as NumericRecord;
            totalShedLengthCm += toNumber(shed.shedLength);
          }
        })
      );
    })
  );

  const geneticsSnapshot = await getDocs(collection(db, "geneticsCalculations"));

  return {
    registeredUsers: usersSnapshot.size,
    activeUsers,
    snakeProfiles,
    mealsFed,
    weightLogs,
    totalWeightKg,
    totalWeightLb: totalWeightKg * 2.2046226218,
    shedsLogged,
    totalShedLengthCm,
    totalShedLengthIn: totalShedLengthCm / 2.54,
    geneticsCalculations: geneticsSnapshot.size,
  };
}
