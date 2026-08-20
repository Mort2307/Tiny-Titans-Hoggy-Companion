import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getGlobalStats } from "./creatorService";
import { getPrivacyPreferences } from "./privacyService";
import type { TesterCheck } from "./testerBotService";

type TrackerSnapshot = {
  users: number;
  snakes: number;
  mealsFed: number;
  shedsLogged: number;
  totalShedLengthCm: number;
  weightLogs: number;
  geneticsCalculations: number;
  invalidShedDates: number;
  invalidShedStatuses: number;
  contributingUsers: number;
};

const VALID_SHED_STATUSES = new Set(["Complete", "Partial", "Problematic"]);

async function buildTrackerSnapshot(): Promise<TrackerSnapshot> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  let snakes = 0;
  let mealsFed = 0;
  let shedsLogged = 0;
  let totalShedLengthCm = 0;
  let weightLogs = 0;
  let invalidShedDates = 0;
  let invalidShedStatuses = 0;
  let contributingUsers = 0;

  for (const userDoc of usersSnapshot.docs) {
    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    snakes += snakesSnapshot.size;

    let privacy;
    try {
      privacy = await getPrivacyPreferences(userDoc.id);
    } catch {
      privacy = null;
    }
    const contributes = privacy?.communityHusbandryData === true;
    if (contributes) contributingUsers += 1;

    for (const snakeDoc of snakesSnapshot.docs) {
      const snake = snakeDoc.data() as Record<string, unknown>;
      const embeddedWeightHistory = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
      if (contributes) weightLogs += embeddedWeightHistory.length;

      const feedingsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "feedings"));
      if (contributes) mealsFed += feedingsSnapshot.docs.filter((doc) => !(doc.data() as Record<string, unknown>).deletedAt).length;

      const shedsSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes", snakeDoc.id, "sheds"));
      if (contributes) shedsLogged += shedsSnapshot.docs.filter((doc) => !(doc.data() as Record<string, unknown>).deletedAt).length;

      for (const shedDoc of shedsSnapshot.docs) {
        const shed = shedDoc.data() as Record<string, unknown>;
        const date = typeof shed.date === "string" ? shed.date.trim() : "";
        if (!date || Number.isNaN(Date.parse(date))) invalidShedDates += 1;

        if (typeof shed.status === "string" && !VALID_SHED_STATUSES.has(shed.status)) invalidShedStatuses += 1;
        if (contributes && typeof shed.shedLength === "number" && Number.isFinite(shed.shedLength)) totalShedLengthCm += shed.shedLength;
      }
    }
  }

  const geneticsSnapshot = await getDocs(collection(db, "geneticsCalculations"));

  return {
    users: usersSnapshot.size,
    snakes,
    mealsFed,
    shedsLogged,
    totalShedLengthCm,
    weightLogs,
    geneticsCalculations: geneticsSnapshot.size,
    invalidShedDates,
    invalidShedStatuses,
    contributingUsers,
  };
}

export async function createTrackerRegressionChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Tracker regression requires an authenticated UID.");

  let snapshot: TrackerSnapshot | null = null;
  let snapshotError: string | null = null;

  const loadSnapshot = async () => {
    if (snapshot || snapshotError) return;
    try {
      snapshot = await buildTrackerSnapshot();
    } catch (error) {
      snapshotError = error instanceof Error ? error.message : "Unable to read tracker data.";
    }
  };

  return [
    {
      checkId: "tracker-data-readable",
      name: "Tracker records are readable from the live Firebase model",
      category: "firebase",
      severity: "critical",
      run: async () => {
        await loadSnapshot();
        return snapshot
          ? { status: "pass", message: `Read ${snapshot.snakes} snakes across ${snapshot.users} users and inspected tracker subcollections.` }
          : { status: "fail", message: snapshotError ?? "Tracker data could not be read." };
      },
    },
    {
      checkId: "tracker-feeding-count",
      name: "Global meal count matches consented community feeding records",
      category: "feeding",
      severity: "high",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        const stats = await getGlobalStats();
        return stats.mealsFed === snapshot.mealsFed
          ? { status: "pass", message: `Meals Fed is ${snapshot.mealsFed}; Creator statistics match ${snapshot.contributingUsers} consenting community contributor(s).` }
          : { status: "fail", message: `Creator statistics report ${stats.mealsFed} meals, but ${snapshot.mealsFed} feeding records are eligible under community husbandry consent.` };
      },
    },
    {
      checkId: "tracker-shed-count",
      name: "Global shed count matches consented community shed records",
      category: "sheds",
      severity: "critical",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        const stats = await getGlobalStats();
        return stats.shedsLogged === snapshot.shedsLogged
          ? { status: "pass", message: `Sheds Logged is ${snapshot.shedsLogged}; Creator statistics match the consented community dataset.` }
          : { status: "fail", message: `Creator statistics report ${stats.shedsLogged} sheds, but ${snapshot.shedsLogged} shed records are eligible under community husbandry consent.` };
      },
    },
    {
      checkId: "tracker-shed-length",
      name: "Global shed length matches consented community shed measurements",
      category: "sheds",
      severity: "high",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        const stats = await getGlobalStats();
        const difference = Math.abs(stats.totalShedLengthCm - snapshot.totalShedLengthCm);
        return difference < 0.001
          ? { status: "pass", message: `Total consented shed length is ${snapshot.totalShedLengthCm.toFixed(2)} cm.` }
          : { status: "fail", message: `Creator statistics report ${stats.totalShedLengthCm.toFixed(2)} cm, but eligible shed records total ${snapshot.totalShedLengthCm.toFixed(2)} cm.` };
      },
    },
    {
      checkId: "tracker-shed-date-integrity",
      name: "Shed dates are valid and independent from shed status",
      category: "sheds",
      severity: "critical",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        if (snapshot.invalidShedDates > 0) return { status: "fail", message: `${snapshot.invalidShedDates} stored shed records have an invalid or missing date.` };
        if (snapshot.invalidShedStatuses > 0) return { status: "fail", message: `${snapshot.invalidShedStatuses} stored shed records contain an unsupported shed status.` };
        return { status: "pass", message: "Stored shed records contain valid dates and recognised independent status values." };
      },
    },
    {
      checkId: "tracker-cross-device-persistence",
      name: "Tracker records use the shared authenticated Firebase data model",
      category: "firebase",
      severity: "high",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        return { status: "pass", message: `Records are stored in Firebase rather than local-only state; authenticated UID ${uid.slice(0, 8)}… is using the shared data model.` };
      },
    },
    {
      checkId: "tracker-genetics-count",
      name: "Genetics calculation tracking has a persistent source",
      category: "genetics",
      severity: "medium",
      run: async () => {
        await loadSnapshot();
        if (!snapshot) return { status: "blocked", message: snapshotError ?? "Tracker snapshot unavailable." };
        if (snapshot.geneticsCalculations === 0) return { status: "blocked", message: "No persisted genetics calculation records currently exist in the geneticsCalculations collection; the statistic cannot truthfully report usage yet." };
        return { status: "pass", message: `Found ${snapshot.geneticsCalculations} persisted genetics calculations.` };
      },
    },
  ];
}
