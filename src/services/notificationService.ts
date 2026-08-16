import { deleteDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging";
import { db, app } from "../firebase/config";
import type { NotificationDevice } from "../types/Notifications";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

function devicePlatform(): NotificationDevice["platform"] {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "unknown";
}

async function stableDeviceId(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function registerNotificationDevice(uid: string): Promise<{ enabled: boolean; reason?: string; deviceId?: string }> {
  if (!uid) return { enabled: false, reason: "not-authenticated" };
  if (!VAPID_KEY) return { enabled: false, reason: "missing-vapid-key" };
  if (!("Notification" in window)) return { enabled: false, reason: "notifications-not-supported" };
  if (!(await isSupported())) return { enabled: false, reason: "fcm-not-supported" };
  if (Notification.permission === "denied") return { enabled: false, reason: "permission-denied" };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { enabled: false, reason: "permission-not-granted" };

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return { enabled: false, reason: "no-registration-token" };

  const deviceId = await stableDeviceId(token);
  await setDoc(doc(db, "users", uid, "notificationDevices", deviceId), {
    deviceId,
    token,
    platform: devicePlatform(),
    userAgent: navigator.userAgent.slice(0, 500),
    permission,
    enabled: true,
    lastSeenAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
  return { enabled: true, deviceId };
}

export async function unregisterNotificationDevice(uid: string, deviceId: string): Promise<void> {
  if (!uid || !deviceId) return;
  await deleteDoc(doc(db, "users", uid, "notificationDevices", deviceId));
}

export function listenForForegroundNotifications(callback: (payload: MessagePayload) => void): () => void {
  try {
    if (!VAPID_KEY || typeof window === "undefined") return () => undefined;
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch {
    return () => undefined;
  }
}
