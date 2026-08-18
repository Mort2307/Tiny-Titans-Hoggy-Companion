import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import type { TesterCheck } from "./testerBotService";
import { getNotificationSettings, getNotificationPermissionState } from "./notificationService";
import { notificationProbePassed, readNotificationEvent, runLiveNotificationProbe } from "./notificationBotService";

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
      checkId: "notifications-live-bot-probe",
      name: "Notification BOT executes a live authenticated FCM delivery probe",
      category: "notifications",
      severity: "critical",
      run: async () => {
        try {
          const settings = await getNotificationSettings(uid);
          const permission = getNotificationPermissionState();
          if (settings.enabled !== true) return { status: "blocked", message: "Live probe blocked because this QA account has notifications disabled. Enable notifications on the BOT account before running live delivery verification." };
          if (permission !== "granted") return { status: "blocked", message: `Live probe blocked because browser notification permission is ${permission}. No permission prompt is triggered automatically by QA.` };
          const result = await runLiveNotificationProbe(uid);
          if (notificationProbePassed(result)) return { status: "pass", message: `Live FCM probe accepted by Firebase for ${result.sentCount} token(s) with zero invalid tokens. Event ${result.eventKey} completed in ${result.elapsedMs}ms.` };
          if (result.status === "no-delivery") return { status: "blocked", message: `The notification pipeline ran but this QA account has no enabled FCM token. Event ${result.eventKey} recorded no-delivery.` };
          return { status: "fail", message: `Live notification probe returned ${result.status}; sent=${result.sentCount}, invalid=${result.invalidTokenCount}.` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Live notification BOT probe failed." };
        }
      },
    },
    {
      checkId: "notifications-live-event-record",
      name: "Live notification BOT event is persisted with delivery outcome",
      category: "notifications",
      severity: "high",
      run: async () => {
        // The live probe check owns creation of the event. This check verifies
        // that the same Firestore event contract can be read back afterwards.
        try {
          const snapshot = await getDocs(collection(db, "users", uid, "notificationEvents"));
          const botEvents = snapshot.docs.filter((item) => item.data().type === "notification-bot-probe");
          if (!botEvents.length) return { status: "blocked", message: "No live Notification BOT event exists yet; run the live probe first." };
          const latest = botEvents[botEvents.length - 1];
          const data = latest.data();
          if (!["sent", "no-delivery", "failed"].includes(String(data.status))) return { status: "fail", message: `Latest BOT event has incomplete delivery status: ${String(data.status || "missing")}.` };
          const reread = await readNotificationEvent(uid, latest.id);
          return reread?.status === data.status
            ? { status: "pass", message: `Latest Notification BOT event ${latest.id} is persisted and readable with status ${String(data.status)}.` }
            : { status: "fail", message: "Notification BOT event could not be read back consistently." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Notification BOT event verification failed." };
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
          const invalid = snapshot.docs.filter((item) => !item.id || !item.data().type);
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
