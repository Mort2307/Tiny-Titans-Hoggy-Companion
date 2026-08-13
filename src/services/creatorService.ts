import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { ReportIssue } from "../types/reportIssue";
import type { Snake } from "../types/Snake";

export type FounderApplication = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  reason: string;
  experience: string;
  contribution: string;
  status: "Pending" | "Approved" | "Declined";
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GlobalStats = {
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

export async function submitFounderApplication(input: Omit<FounderApplication, "id" | "status" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "founderApplications"), {
    ...input,
    status: "Pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitIssueReport(input: Omit<ReportIssue, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "issueReports"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCreatorReports(): Promise<ReportIssue[]> {
  const snapshot = await getDocs(query(collection(db, "issueReports"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReportIssue, "id">) }));
}

export async function updateCreatorReport(reportId: string, status: ReportIssue["status"]) {
  await updateDoc(doc(db, "issueReports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getFounderApplications(): Promise<FounderApplication[]> {
  const snapshot = await getDocs(query(collection(db, "founderApplications"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderApplication, "id">) }));
}

export async function updateFounderApplication(id: string, status: FounderApplication["status"]) {
  await updateDoc(doc(db, "founderApplications", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserCount(): Promise<number> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.size;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weightToKg(weight: number, unit: unknown): number {
  if (unit === "kg") return weight;
  return weight / 1000;
}

function shedLengthToCm(length: number): number {
  // Shed records are stored as a plain measurement and the current
  // app treats shed length as centimetres. Keep the canonical total in cm.
  return length;
}

/**
 * Aggregates the anonymous, fun global counters shown in the Creator Centre.
 * Individual user/snake records are never returned to the UI by this function.
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const usersSnapshot = await getDocs(collection(db, "users"));

  let activeUsers = 0;
  let snakeProfiles = 0;
  let mealsFed = 0;
  let weightLogs = 0;
  let totalWeightKg = 0;
  let shedsLogged = 0;
  let totalShedLengthCm = 0;

  const activeCutoff = Date.now() - 15 * 60 * 1000;

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data() as Record<string, unknown>;
      const lastActive = userData.lastActiveAt;

      if (lastActive && typeof lastActive === "object" && "toMillis" in lastActive && typeof lastActive.toMillis === "function") {
        const millis = lastActive.toMillis();
        if (millis >= activeCutoff) activeUsers += 1;
      }

      const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
      snakeProfiles += snakesSnapshot.size;

      for (const snakeDoc of snakesSnapshot.docs) {
        const snake = snakeDoc.data() as Partial<Snake>;

        const feedingHistory = Array.isArray(snake.feedingHistory) ? snake.feedingHistory : [];
        mealsFed += feedingHistory.length;

        const weightHistory = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
        weightLogs += weightHistory.length;
        for (const record of weightHistory) {
          const item = record as { weight?: unknown; unit?: unknown };
          totalWeightKg += weightToKg(toNumber(item.weight), item.unit);
        }

        const shedHistory = Array.isArray(snake.shedHistory) ? snake.shedHistory : [];
        shedsLogged += shedHistory.length;
        for (const record of shedHistory) {
          const item = record as { shedLength?: unknown };
          totalShedLengthCm += shedLengthToCm(toNumber(item.shedLength));
        }
      }
    })
  );

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
    geneticsCalculations: 0,
  };
}
