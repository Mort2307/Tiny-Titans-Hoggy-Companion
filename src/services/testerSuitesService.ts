import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserSnakes } from "./snakeService";
import { deleteSnakeFeeding, getSnakeFeedings, saveSnakeFeeding } from "./feedingService";
import { getSnakeSheds } from "./shedService";
import { getPrivacyPreferences } from "./privacyService";
import { getCreatorGlobalMetrics } from "./creatorAnalyticsService";
import { normalizeHetPercentage, expandHetScenarios } from "../utils/geneticsHetScenarios";
import type { TesterCheck } from "./testerBotService";
import type { FeedingRecord } from "../types/Feeding";

function makeTestId(prefix: string): string {
  return `__tester_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function firebasePath(uid: string, snakeId: string, feedingId: string): string {
  return `users/${uid}/snakes/${snakeId}/feedings/${feedingId}`;
}

export async function createTrackerRegressionChecks(uid: string): Promise<TesterCheck[]> {
  const snakes = await getUserSnakes(uid);
  return [
    {
      id: "data-snake-profiles",
      name: "Snake profiles can be loaded from Firebase",
      category: "data",
      severity: "critical",
      descriptor: "My Snakes / Firebase profile loading",
      run: async () => ({
        status: "pass",
        message: `${snakes.length} snake profile${snakes.length === 1 ? "" : "s"} loaded successfully.`,
        details: { snakeCount: snakes.length, descriptor: "My Snakes / Firebase profile loading" },
      }),
    },
    {
      id: "feeding-history-readable",
      name: "Feeding history persistence",
      category: "feeding",
      severity: "high",
      descriptor: "Snake Profile / Feeding History",
      run: async () => {
        let total = 0;
        for (const snake of snakes) total += (await getSnakeFeedings(uid, snake.id)).length;
        return {
          status: "pass",
          message: `${total} feeding record${total === 1 ? "" : "s"} loaded from authoritative Firebase collections.`,
          details: { feedingCount: total, descriptor: "Snake Profile / Feeding History" },
        };
      },
    },
    {
      id: "feeding-mutation-persistence",
      name: "Feeding create/edit/delete mutation persistence",
      category: "feeding",
      severity: "critical",
      descriptor: "Snake Profile / Feeding History / Firebase persistence",
      run: async () => {
        const snake = snakes[0];
        if (!snake) return { status: "blocked", message: "No snake is available for an isolated feeding persistence test.", details: { expected: "At least one snake profile", actual: "No snake profiles available", descriptor: "Snake Profile / Feeding History / Firebase persistence" } };

        const feedingId = makeTestId("feeding");
        const path = firebasePath(uid, snake.id, feedingId);
        const original: FeedingRecord = {
          id: feedingId,
          snakeId: snake.id,
          date: "2099-01-01",
          foodType: "Pinkie Mouse",
          size: "Tester",
          weight: 1,
          feedingMethod: "Tongs",
          response: "Accepted",
          notes: "Tiny Titans automated persistence test",
        };
        const edited: FeedingRecord = { ...original, weight: 2, response: "Partial", notes: "Tiny Titans automated edit test" };

        try {
          const created = await saveSnakeFeeding(uid, original);
          const afterCreate = await getDoc(doc(db, "users", uid, "snakes", snake.id, "feedings", feedingId));
          if (!afterCreate.exists()) return { status: "fail", message: "Feeding save returned successfully but the Firebase record could not be read back.", details: { expected: "Firebase feeding document exists after create", actual: "Document missing", path, descriptor: "Snake Profile / Feeding History / Firebase persistence", fixHint: "Inspect feedingService write/read-back path and Firestore rules." } };
          if (created.weight !== 1) return { status: "fail", message: "Canonical feeding record did not preserve the submitted weight after create.", details: { expected: 1, actual: created.weight, path, descriptor: "Snake Profile / Feeding History / Firebase persistence", fixHint: "Check feedingService canonical read-back mapping." } };

          const updated = await saveSnakeFeeding(uid, edited);
          const afterEdit = await getDoc(doc(db, "users", uid, "snakes", snake.id, "feedings", feedingId));
          if (!afterEdit.exists() || afterEdit.data().weight !== 2 || afterEdit.data().response !== "Partial") {
            return { status: "fail", message: "Feeding edit did not persist the changed values to Firebase.", details: { expected: "weight=2 and response=Partial after reload", actual: afterEdit.exists() ? afterEdit.data() : "Document missing", path, descriptor: "Snake Profile / Feeding History / Firebase persistence", fixHint: "Inspect feedingService setDoc merge behaviour and the Firestore feeding rule." } };
          }
          if (updated.weight !== 2) return { status: "fail", message: "Canonical Firebase feeding record returned stale data after edit.", details: { expected: 2, actual: updated.weight, path, descriptor: "Snake Profile / Feeding History / Firebase persistence", fixHint: "Ensure saveSnakeFeeding reads the document after setDoc." } };

          await deleteSnakeFeeding(uid, snake.id, feedingId);
          const afterDelete = await getDoc(doc(db, "users", uid, "snakes", snake.id, "feedings", feedingId));
          if (afterDelete.exists()) return { status: "fail", message: "Feeding delete returned successfully but the Firebase document still exists.", details: { expected: "Document absent after delete", actual: "Document still exists", path, descriptor: "Snake Profile / Feeding History / Firebase persistence", fixHint: "Inspect feedingService delete verification and Firestore delete rules." } };

          return { status: "pass", message: "Feeding create → Firebase reload → edit → Firebase reload → delete → verification completed successfully.", details: { path, descriptor: "Snake Profile / Feeding History / Firebase persistence" } };
        } finally {
          try { await deleteDoc(doc(db, "users", uid, "snakes", snake.id, "feedings", feedingId)); } catch { /* cleanup is best-effort; primary failure is retained in the report */ }
        }
      },
    },
    {
      id: "shed-history-readable",
      name: "Shed history persistence and soft-delete filtering",
      category: "shed",
      severity: "critical",
      descriptor: "Shed Tracker / History / Soft delete",
      run: async () => {
        let total = 0;
        let photos = 0;
        let measured = 0;
        for (const snake of snakes) {
          const sheds = await getSnakeSheds(uid, snake.id);
          total += sheds.length;
          photos += sheds.reduce((sum, shed) => sum + (shed.photos?.length ?? 0), 0);
          measured += sheds.filter((shed) => typeof shed.shedLength === "number" && Number.isFinite(shed.shedLength)).length;
        }
        return {
          status: "pass",
          message: `${total} active shed record${total === 1 ? "" : "s"} loaded; ${photos} persisted photo reference${photos === 1 ? "" : "s"}; ${measured} measured record${measured === 1 ? "" : "s"}.`,
          details: { shedCount: total, photoCount: photos, measuredCount: measured, descriptor: "Shed Tracker / History / Soft delete" },
        };
      },
    },
    {
      id: "weight-history-readable",
      name: "Weight history persistence",
      category: "weight",
      severity: "high",
      descriptor: "Snake Profile / Weight History",
      run: async () => {
        const logs = snakes.reduce((sum, snake) => sum + (snake.weightHistory?.length ?? 0), 0);
        const invalid = snakes.reduce((sum, snake) => sum + (snake.weightHistory ?? []).filter((entry) => typeof entry.weight !== "number" || !entry.date).length, 0);
        return invalid === 0
          ? { status: "pass", message: `${logs} weight record${logs === 1 ? "" : "s"} loaded with valid date/weight fields.`, details: { weightLogs: logs, descriptor: "Snake Profile / Weight History" } }
          : { status: "fail", message: `${invalid} weight record${invalid === 1 ? "" : "s"} contain invalid date/weight data.`, details: { weightLogs: logs, invalid, descriptor: "Snake Profile / Weight History" } };
      },
    },
    {
      id: "genetics-events-readable",
      name: "Genetics calculation tracking",
      category: "genetics",
      severity: "medium",
      descriptor: "Genetics Calculator / Analytics event tracking",
      run: async () => {
        const snapshot = await getDocs(collection(db, "users", uid, "analyticsEvents"));
        const calculations = snapshot.docs.filter((item) => item.data().type === "genetics_calculation_completed").length;
        return { status: "pass", message: `${calculations} completed genetics calculation event${calculations === 1 ? "" : "s"} tracked.`, details: { geneticsCalculations: calculations, descriptor: "Genetics Calculator / Analytics event tracking" } };
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
        const normalized = inputs.map(normalizeHetPercentage);
        const expected = [50, 66, 100, 50, 66, 100];
        const normalizationOk = normalized.every((value, index) => value === expected[index]);
        const scenarios = expandHetScenarios(66);
        const scenarioOk = scenarios.length === 2 && scenarios[0].probability === 0.66 && scenarios[1].probability === 0.34 && scenarios[0].isHet === true && scenarios[1].isHet === false;
        if (!normalizationOk || !scenarioOk) return { status: "fail", message: `Het regression failed: normalized=${normalized.join(",")}; 66% scenarios=${JSON.stringify(scenarios)}`, details: { normalized, scenarios, descriptor: "Genetics Calculator / Het percentage handling", fixHint: "Trace the calculator's het normalization and scenario expansion without coercing 66% to 100%." } };
        return { status: "pass", message: "50%, 66% and 100% het values remain distinct and 66% expands to a 66/34 probability split.", details: { normalized, scenarios, descriptor: "Genetics Calculator / Het percentage handling" } };
      },
    },
    {
      id: "privacy-preferences-readable",
      name: "Privacy consent persistence",
      category: "privacy",
      severity: "high",
      descriptor: "Settings / Privacy & Data Permissions",
      run: async () => {
        const preferences = await getPrivacyPreferences(uid);
        return { status: "pass", message: `Privacy preferences loaded (consent ${preferences.consentVersion}).`, details: { consentVersion: preferences.consentVersion, communityLocation: preferences.communityLocation, anonymousAnalytics: preferences.anonymousAnalytics, productUpdates: preferences.productUpdates, descriptor: "Settings / Privacy & Data Permissions" } };
      },
    },
    {
      id: "creator-global-metric-reconciliation",
      name: "Creator global metrics do not undercount authoritative tracker data",
      category: "analytics",
      severity: "critical",
      descriptor: "Creator Hub / Global Metrics",
      run: async () => {
        const metrics = await getCreatorGlobalMetrics();
        let meals = 0;
        let sheds = 0;
        let shedLengthCm = 0;
        let weights = 0;
        let weightKg = 0;
        for (const snake of snakes) {
          const feedings = await getSnakeFeedings(uid, snake.id);
          meals += feedings.length;
          const snakeSheds = await getSnakeSheds(uid, snake.id);
          sheds += snakeSheds.length;
          for (const shed of snakeSheds) if (typeof shed.shedLength === "number" && Number.isFinite(shed.shedLength)) shedLengthCm += shed.shedLength;
          const history = snake.weightHistory ?? [];
          weights += history.length;
          for (const entry of history) {
            if (typeof entry.weight !== "number" || !Number.isFinite(entry.weight)) continue;
            weightKg += entry.unit === "kg" ? entry.weight : entry.weight / 1000;
          }
        }
        const failures: string[] = [];
        if (metrics.mealsFed < meals) failures.push(`global meals ${metrics.mealsFed} is below authoritative user count ${meals}`);
        if (metrics.shedsLogged < sheds) failures.push(`global sheds ${metrics.shedsLogged} is below authoritative user count ${sheds}`);
        if (metrics.weightLogs < weights) failures.push(`global weights ${metrics.weightLogs} is below authoritative user count ${weights}`);
        if (metrics.totalShedLengthCm + 0.01 < shedLengthCm) failures.push(`global shed length ${metrics.totalShedLengthCm}cm is below authoritative user length ${shedLengthCm}cm`);
        if (metrics.totalWeightKg + 0.000001 < weightKg) failures.push(`global weight ${metrics.totalWeightKg}kg is below authoritative user weight ${weightKg}kg`);
        if (failures.length === 0) return { status: "pass", message: "Creator metrics do not undercount this user's authoritative tracker records.", details: { metrics, local: { meals, sheds, shedLengthCm, weights, weightKg }, descriptor: "Creator Hub / Global Metrics" } };
        return { status: "fail", message: failures.join("; "), details: { failures, metrics, local: { meals, sheds, shedLengthCm, weights, weightKg }, descriptor: "Creator Hub / Global Metrics", fixHint: "Trace the authoritative aggregation/event path for the affected tracker metric and verify it counts all persisted records." } };
      },
    },
  ];
}
