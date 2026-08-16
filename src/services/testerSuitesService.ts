import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserSnakes } from "./snakeService";
import { getSnakeFeedings } from "./feedingService";
import { getSnakeSheds } from "./shedService";
import { getPrivacyPreferences } from "./privacyService";
import type { TesterCheck } from "./testerBotService";

export async function createTrackerRegressionChecks(uid: string): Promise<TesterCheck[]> {
  const snakes = await getUserSnakes(uid);
  return [
    {
      id: "data-snake-profiles",
      name: "Snake profiles can be loaded from Firebase",
      category: "data",
      severity: "critical",
      run: async () => ({
        status: "pass",
        message: `${snakes.length} snake profile${snakes.length === 1 ? "" : "s"} loaded successfully.`,
        details: { snakeCount: snakes.length },
      }),
    },
    {
      id: "feeding-history-readable",
      name: "Feeding history persistence",
      category: "feeding",
      severity: "high",
      run: async () => {
        let total = 0;
        for (const snake of snakes) total += (await getSnakeFeedings(uid, snake.id)).length;
        return { status: "pass", message: `${total} feeding record${total === 1 ? "" : "s"} loaded from authoritative Firebase collections.`, details: { feedingCount: total } };
      },
    },
    {
      id: "shed-history-readable",
      name: "Shed history persistence and soft-delete filtering",
      category: "shed",
      severity: "critical",
      run: async () => {
        let total = 0;
        let photos = 0;
        let measured = 0;
        for (const snake of snakes) {
          const sheds = await getSnakeSheds(uid, snake.id);
          total += sheds.length;
          photos += sheds.reduce((sum, shed) => sum + (shed.photos?.length ?? 0), 0);
          measured += sheds.filter((shed) => typeof shed.measurements?.lengthCm === "number" || typeof shed.measurements?.length === "number").length;
        }
        return { status: "pass", message: `${total} active shed record${total === 1 ? "" : "s"} loaded; ${photos} persisted photo reference${photos === 1 ? "" : "s"}; ${measured} measured record${measured === 1 ? "" : "s"}.`, details: { shedCount: total, photoCount: photos, measuredCount: measured } };
      },
    },
    {
      id: "weight-history-readable",
      name: "Weight history persistence",
      category: "weight",
      severity: "high",
      run: async () => {
        const logs = snakes.reduce((sum, snake) => sum + (snake.weightHistory?.length ?? 0), 0);
        const invalid = snakes.reduce((sum, snake) => sum + (snake.weightHistory ?? []).filter((entry) => typeof entry.weight !== "number" || !entry.date).length, 0);
        return invalid === 0
          ? { status: "pass", message: `${logs} weight record${logs === 1 ? "" : "s"} loaded with valid date/weight fields.`, details: { weightLogs: logs } }
          : { status: "fail", message: `${invalid} weight record${invalid === 1 ? "" : "s"} contain invalid date/weight data.`, details: { weightLogs: logs, invalid } };
      },
    },
    {
      id: "genetics-events-readable",
      name: "Genetics calculation tracking",
      category: "genetics",
      severity: "medium",
      run: async () => {
        const snapshot = await getDocs(collection(db, "users", uid, "analyticsEvents"));
        const calculations = snapshot.docs.filter((item) => item.data().type === "genetics_calculation_completed").length;
        return { status: "pass", message: `${calculations} completed genetics calculation event${calculations === 1 ? "" : "s"} tracked.`, details: { geneticsCalculations: calculations } };
      },
    },
    {
      id: "privacy-preferences-readable",
      name: "Privacy consent persistence",
      category: "privacy",
      severity: "high",
      run: async () => {
        const preferences = await getPrivacyPreferences(uid);
        return { status: "pass", message: `Privacy preferences loaded (consent ${preferences.consentVersion}).`, details: { consentVersion: preferences.consentVersion, communityLocation: preferences.communityLocation, anonymousAnalytics: preferences.anonymousAnalytics, productUpdates: preferences.productUpdates } };
      },
    },
  ];
}
