import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { functions, db } from "../firebase/config";

export type NotificationProbeStatus = "sent" | "no-delivery" | "failed" | "duplicate" | "timeout";

export type NotificationProbeResult = {
  eventKey: string;
  status: NotificationProbeStatus;
  sentCount: number;
  invalidTokenCount: number;
  title: string;
  body: string;
  url: string;
  elapsedMs: number;
};

type ProbeResponse = Omit<NotificationProbeResult, "elapsedMs">;

function probeId() {
  return `notification-bot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function runLiveNotificationProbe(uid: string): Promise<NotificationProbeResult> {
  if (!uid) throw new Error("Notification BOT requires an authenticated UID.");

  const eventKey = probeId();
  const started = Date.now();
  const call = httpsCallable<{ eventKey: string }, ProbeResponse>(functions, "runNotificationBotProbe");
  const response = await call({ eventKey });
  const result = response.data;

  return {
    ...result,
    elapsedMs: Date.now() - started,
  };
}

export async function readNotificationEvent(uid: string, eventKey: string) {
  if (!uid || !eventKey) throw new Error("Notification event verification requires a UID and event key.");
  const snapshot = await getDoc(doc(db, "users", uid, "notificationEvents", eventKey));
  return snapshot.exists() ? snapshot.data() : null;
}

export function notificationProbePassed(result: NotificationProbeResult): boolean {
  return result.status === "sent" && result.sentCount > 0 && result.invalidTokenCount === 0;
}
