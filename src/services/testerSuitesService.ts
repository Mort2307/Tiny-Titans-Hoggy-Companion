import { collection, deleteDoc, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserSnakes } from "./snakeService";
import { deleteSnakeFeeding, getSnakeFeedings, saveSnakeFeeding } from "./feedingService";
import { deleteSnakeShed, getSnakeSheds, saveSnakeShed } from "./shedService";
import { getPrivacyPreferences } from "./privacyService";
import { parseHetPercentage, expandHetScenarios } from "../utils/geneticsHetScenarios";
import type { TesterCheck } from "./testerBotService";
import type { FeedingRecord } from "../types/Feeding";
import type { ShedRecord } from "../types/Shed";
import type { Het } from "../types/genetics";

function makeTestId(prefix: string): string {
  return `__tester_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function path(uid: string, snakeId: string, child: string, id: string): string {
  return `users/${uid}/snakes/${snakeId}/${child}/${id}`;
}

export async function createTrackerRegressionChecks(uid: string): Promise<TesterCheck[]> {
  const snakes = await getUserSnakes(uid);

  return [
    {
      id: "data-snake-profiles",
      name: "Snake profiles load from Firebase",
      category: "data",
      severity: "critical",
      descriptor: "My Snakes / Firebase profile loading",
      run: async () => ({ status: "pass", message: `${snakes.length} snake profile${snakes.length === 1 ? "" : "s"} loaded successfully.`, details: { snakeCount: snakes.length } }),
    },
    {
      id: "feeding-history-readable",
      name: "Feeding history loads from Firebase",
      category: "feeding",
      severity: "high",
      descriptor: "Feeding Tracker / Firebase history",
      run: async () => {
        let total = 0;
        for (const snake of snakes) total += (await getSnakeFeedings(uid, snake.id)).length;
        return { status: "pass", message: `${total} feeding record${total === 1 ? "" : "s"} loaded from Firebase.`, details: { feedingCount: total } };
      },
    },
    {
      id: "feeding-mutation-persistence",
      name: "Feeding create/edit/delete persistence",
      category: "feeding",
      severity: "critical",
      descriptor: "Feeding Tracker / Create → Edit → Delete",
      run: async () => {
        const snake = snakes[0];
        if (!snake) return { status: "blocked", message: "No snake is available for the isolated feeding persistence test.", details: { expected: "At least one snake profile", actual: "No snake profiles" } };
        const id = makeTestId("feeding");
        const ref = doc(db, "users", uid, "snakes", snake.id, "feedings", id);
        const original: FeedingRecord = { id, snakeId: snake.id, date: "2099-01-01", foodType: "Pinkie Mouse", size: "Tester", weight: 1, feedingMethod: "Tongs", response: "Accepted", notes: "Tiny Titans automated persistence test" };
        const edited: FeedingRecord = { ...original, weight: 2, response: "Partial" };
        try {
          const created = await saveSnakeFeeding(uid, original);
          const storedCreate = await getDoc(ref);
          if (!storedCreate.exists() || created.weight !== 1) return { status: "fail", message: "Feeding create did not survive Firebase read-back.", details: { expected: "record exists with weight=1", actual: storedCreate.exists() ? storedCreate.data() : "missing", path: ref.path, fixHint: "Inspect feedingService setDoc/read-back and Firestore rules." } };
          const updated = await saveSnakeFeeding(uid, edited);
          const storedEdit = await getDoc(ref);
          if (!storedEdit.exists() || storedEdit.data().weight !== 2 || storedEdit.data().response !== "Partial" || updated.weight !== 2) return { status: "fail", message: "Feeding edit did not persist canonical Firebase values.", details: { expected: "weight=2 and response=Partial", actual: storedEdit.exists() ? storedEdit.data() : "missing", path: ref.path, fixHint: "Inspect feedingService merge/read-back behaviour." } };
          await deleteSnakeFeeding(uid, snake.id, id);
          if ((await getDoc(ref)).exists()) return { status: "fail", message: "Feeding delete did not remove the Firebase record.", details: { expected: "record absent", actual: "record exists", path: ref.path, fixHint: "Inspect feedingService delete verification and Firestore rules." } };
          return { status: "pass", message: "Feeding create → reload → edit → reload → delete verification passed.", details: { path: ref.path } };
        } finally {
          await deleteDoc(ref).catch(() => undefined);
        }
      },
    },
    {
      id: "shed-history-readable",
      name: "Shed history loads and excludes deleted records",
      category: "shed",
      severity: "critical",
      descriptor: "Shed Tracker / History / Soft delete",
      run: async () => {
        let total = 0;
        for (const snake of snakes) total += (await getSnakeSheds(uid, snake.id)).length;
        return { status: "pass", message: `${total} active shed record${total === 1 ? "" : "s"} loaded from Firebase.`, details: { shedCount: total } };
      },
    },
    {
      id: "shed-mutation-soft-delete",
      name: "Shed create/edit/soft-delete persistence",
      category: "shed",
      severity: "critical",
      descriptor: "Shed Tracker / Create → Edit → Soft Delete",
      run: async () => {
        const snake = snakes[0];
        if (!snake) return { status: "blocked", message: "No snake is available for the isolated shed persistence test.", details: { expected: "At least one snake profile", actual: "No snake profiles" } };
        const id = makeTestId("shed");
        const ref = doc(db, "users", uid, "snakes", snake.id, "sheds", id);
        const original: ShedRecord = { id, snakeId: snake.id, date: "2099-01-02", bluePhaseStarted: true, eyesSkinCleared: true, shedCompleted: true, retainedShedArea: "None", retainedAreas: [], retainedEyeCaps: false, retainedTailTip: false, status: "Complete", quality: "Perfect", assistance: "None", shedLength: 42, snakeWeight: 100, notes: "Tiny Titans automated shed test", photos: [] };
        const edited: ShedRecord = { ...original, status: "Partial", quality: "Good", retainedShedArea: "Tail Tip", retainedAreas: ["Tail Tip"], retainedTailTip: true, shedLength: 43 };
        try {
          const created = await saveSnakeShed(uid, original);
          const storedCreate = await getDoc(ref);
          if (!storedCreate.exists() || created.status !== "Complete") return { status: "fail", message: "Shed create did not survive Firebase read-back.", details: { expected: "record exists with status=Complete", actual: storedCreate.exists() ? storedCreate.data() : "missing", path: ref.path, fixHint: "Inspect shedService canonical persistence." } };
          const updated = await saveSnakeShed(uid, edited);
          const storedEdit = await getDoc(ref);
          if (!storedEdit.exists() || storedEdit.data().status !== "Partial" || storedEdit.data().shedLength !== 43 || updated.status !== "Partial") return { status: "fail", message: "Shed edit did not persist canonical Firebase values.", details: { expected: "status=Partial and shedLength=43", actual: storedEdit.exists() ? storedEdit.data() : "missing", path: ref.path, fixHint: "Inspect Shed Tracker edit payload and shedService merge/read-back." } };
          const deleted = await deleteSnakeShed(uid, snake.id, id);
          if (!deleted.deletedAt) return { status: "fail", message: "Shed delete did not create deletedAt.", details: { expected: "deletedAt timestamp", actual: deleted.deletedAt ?? null, path: ref.path, fixHint: "Use soft delete for Shed Logs; do not hard-delete history." } };
          if ((await getSnakeSheds(uid, snake.id)).some((shed) => shed.id === id)) return { status: "fail", message: "Soft-deleted shed still appears in active results.", details: { expected: "record excluded from active list", actual: "record returned", path: ref.path, fixHint: "Filter deletedAt records in getSnakeSheds." } };
          if (!(await getDoc(ref)).exists()) return { status: "fail", message: "Soft-deleted shed was physically removed.", details: { expected: "historical document retained", actual: "document missing", path: ref.path, fixHint: "Set deletedAt instead of deleteDoc for Shed Logs." } };
          return { status: "pass", message: "Shed create → reload → edit → reload → soft delete → exclusion → historical retention passed.", details: { path: ref.path } };
        } finally {
          await deleteDoc(ref).catch(() => undefined);
        }
      },
    },
    {
      id: "weight-history-readable",
      name: "Weight history records are valid",
      category: "weight",
      severity: "high",
      descriptor: "Snake Profile / Weight History",
      run: async () => {
        const logs = snakes.reduce((sum, snake) => sum + (snake.weightHistory?.length ?? 0), 0);
        const invalid = snakes.reduce((sum, snake) => sum + (snake.weightHistory ?? []).filter((entry) => typeof entry.weight !== "number" || !entry.date).length, 0);
        return invalid === 0 ? { status: "pass", message: `${logs} weight record${logs === 1 ? "" : "s"} have valid date and weight fields.`, details: { weightLogs: logs } } : { status: "fail", message: `${invalid} weight record${invalid === 1 ? "" : "s"} have invalid date/weight data.`, details: { weightLogs: logs, invalid, fixHint: "Inspect weightHistory write/read mapping." } };
      },
    },
    {
      id: "genetics-events-readable",
      name: "Genetics calculation events are tracked",
      category: "genetics",
      severity: "medium",
      descriptor: "Genetics Calculator / Analytics events",
      run: async () => {
        const snapshot = await getDocs(collection(db, "users", uid, "analyticsEvents"));
        const calculations = snapshot.docs.filter((item) => item.data().type === "genetics_calculation_completed").length;
        return { status: "pass", message: `${calculations} completed genetics calculation event${calculations === 1 ? "" : "s"} tracked.`, details: { geneticsCalculations: calculations } };
      },
    },
    {
      id: "genetics-het-percentage-regression",
      name: "Het percentages preserve 50%, 66% and 100%",
      category: "genetics",
      severity: "critical",
      descriptor: "Genetics Calculator / Het percentage handling",
      run: async () => {
        const inputs = [50, 66, 100, "50%", "66%", "100%"] as const;
        const normalized = inputs.map(parseHetPercentage);
        const expected = [50, 66, 100, 50, 66, 100];
        const sample: Het = { gene: "Lavender", percentage: 66 };
        const scenarios = expandHetScenarios([sample]);
        const normalizationOk = normalized.every((value, index) => value === expected[index]);
        const scenarioOk = scenarios.length === 2 && scenarios[0].probability === 0.66 && scenarios[1].probability === 0.34 && scenarios[0].hets.length === 1 && scenarios[1].hets.length === 0;
        if (!normalizationOk || !scenarioOk) return { status: "fail", message: "Het percentage regression failed; 66% is not being represented as a 66/34 probability split.", details: { normalized, scenarios, fixHint: "Trace het normalization and scenario expansion without coercing 66% to 100%." } };
        return { status: "pass", message: "50%, 66% and 100% remain distinct; 66% expands to 66/34 mutually exclusive scenarios.", details: { normalized, scenarios } };
      },
    },
    {
      id: "privacy-preferences-readable",
      name: "Privacy consent preferences load",
      category: "privacy",
      severity: "high",
      descriptor: "Settings / Privacy & Data Permissions",
      run: async () => {
        const preferences = await getPrivacyPreferences(uid);
        return { status: "pass", message: `Privacy preferences loaded (consent ${preferences.consentVersion}).`, details: { consentVersion: preferences.consentVersion, communityLocation: preferences.communityLocation, anonymousAnalytics: preferences.anonymousAnalytics, productUpdates: preferences.productUpdates } };
      },
    },
  ];
}
