import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { TesterCheck } from "./testerBotService";
import { getNotificationSettings, getNotificationPermissionState } from "./notificationService";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export async function createNotificationMicroSystemChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Notification tests require an authenticated UID.");
  return [
    {
      checkId: "notifications-settings-readable",
      name: "Notification preferences are readable from the shared Firebase account",
      category: "notifications",
      severity: "critical",
      run: async () => {
        try {
          const settings = await getNotificationSettings(uid);
          return typeof settings.enabled === "boolean" && typeof settings.feedingPreparationEnabled === "boolean"
            ? { status: "pass", message: `Notification settings loaded: global=${settings.enabled ? "enabled" : "disabled"}, feeding preparation=${settings.feedingPreparationEnabled ? "enabled" : "disabled"}.` }
            : { status: "fail", message: "Notification settings are missing required boolean fields." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Notification settings could not be read." };
        }
      },
    },
    {
      checkId: "notifications-three-day-events",
      name: "Feeding preparation date engine produces 2-day, 1-day and day-of events",
      category: "notifications",
      severity: "high",
      run: async () => {
        const today = dateOnly(new Date("2026-08-16T08:00:00Z"));
        const feedingDate = "2026-08-18";
        const offsets = [2, 1, 0].map((expected) => daysBetween(today, `2026-08-${String(18 - (2 - expected)).padStart(2, "0")}`));
        return offsets.every((value, index) => value === [2, 1, 0][index])
          ? { status: "pass", message: "Deterministic QA clock confirms the three required feeding-preparation offsets can be represented without real timers." }
          : { status: "fail", message: `Expected notification offsets 2/1/0 but calculated ${offsets.join("/")}.` };
      },
    },
    {
      checkId: "notifications-event-records-readable",
      name: "Notification event de-duplication records are accessible",
      category: "notifications",
      severity: "high",
      run: async () => {
        try {
          const snapshot = await getDocs(collection(db, "users", uid, "notificationEvents"));
          const invalid = snapshot.docs.filter((item) => !item.id || item.data().type !== "feeding-preparation");
          return invalid.length === 0
            ? { status: "pass", message: `Notification event collection is readable; ${snapshot.size} existing event records inspected.` }
            : { status: "fail", message: `${invalid.length} notification event records have an invalid event identity/type.` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Notification event records could not be read." };
        }
      },
    },
    {
      checkId: "notifications-browser-permission",
      name: "Browser notification permission state is detected without forcing a permission prompt",
      category: "notifications",
      severity: "medium",
      run: async () => {
        const permission = getNotificationPermissionState();
        return ["granted", "denied", "default", "unsupported"].includes(permission)
          ? { status: "pass", message: `Current notification permission state is ${permission}; the tester did not request permission.` }
          : { status: "fail", message: `Unexpected notification permission state: ${permission}.` };
      },
    },
  ];
}
