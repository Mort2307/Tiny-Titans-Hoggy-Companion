import { deleteDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { getMessaging, isSupported, onMessage, onRegistered, register, type MessagePayload } from "firebase/messaging";
import { db, app } from "../firebase/config";
import type { NotificationDevice } from "../types/Notifications";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
function devicePlatform(): NotificationDevice["platform"] { const ua = navigator.userAgent.toLowerCase(); if (/android/.test(ua)) return "android"; if (/iphone|ipad|ipod/.test(ua)) return "ios"; if (/windows|macintosh|linux|cros/.test(ua)) return "desktop"; return "unknown"; }

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
  let registeredInstallationId = "";
  const unsubscribe = onRegistered(messaging, (installationId) => { registeredInstallationId = installationId; });
  try {
    await register(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    await new Promise<void>((resolve) => { const started = Date.now(); const poll = () => { if (registeredInstallationId || Date.now() - started > 5000) return resolve(); window.setTimeout(poll, 50); }; poll(); });
  } finally { unsubscribe(); }
  if (!registeredInstallationId) return { enabled: false, reason: "no-installation-id" };
  const deviceId = registeredInstallationId;
  await setDoc(doc(db, "users", uid, "notificationDevices", deviceId), { deviceId, installationId: registeredInstallationId, platform: devicePlatform(), userAgent: navigator.userAgent.slice(0, 500), permission, enabled: true, lastSeenAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  return { enabled: true, deviceId };
}

export async function unregisterNotificationDevice(uid: string, deviceId: string): Promise<void> { if (!uid || !deviceId) return; await deleteDoc(doc(db, "users", uid, "notificationDevices", deviceId)); }
export function listenForForegroundNotifications(callback: (payload: MessagePayload) => void): () => void { try { if (!VAPID_KEY || typeof window === "undefined") return () => undefined; return onMessage(getMessaging(app), callback); } catch { return () => undefined; } }
