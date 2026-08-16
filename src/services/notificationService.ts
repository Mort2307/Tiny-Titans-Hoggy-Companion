import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, db } from "../firebase/config";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationPermissionState, type NotificationSettings } from "../types/Notifications";

const SETTINGS_FIELD = "notificationSettings";

function settingsFor(value: unknown): NotificationSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const raw = value as Partial<NotificationSettings>;
  const days = Number(raw.feedingPreparationDaysBefore);
  const time = raw.feedingPreparationTime;
  return {
    enabled: raw.enabled === true,
    feedingPreparationEnabled: raw.feedingPreparationEnabled !== false,
    feedingPreparationDaysBefore: Number.isFinite(days) && days >= 0 && days <= 30 ? Math.round(days) : DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationDaysBefore,
    feedingPreparationTime: typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationTime,
  };
}

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function getNotificationSettings(uid: string): Promise<NotificationSettings> {
  if (!uid) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const snapshot = await getDoc(doc(db, "users", uid));
  return settingsFor(snapshot.data()?.[SETTINGS_FIELD]);
}

export async function saveNotificationSettings(uid: string, settings: NotificationSettings): Promise<NotificationSettings> {
  const next = settingsFor(settings);
  await setDoc(doc(db, "users", uid), { [SETTINGS_FIELD]: next, updatedAt: serverTimestamp() }, { merge: true });
  return next;
}

async function tokenDocumentId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function registerMessagingWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers.");
  return navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/firebase-messaging/" });
}

export async function enableNotifications(uid: string): Promise<NotificationPermissionState> {
  if (!uid) throw new Error("You must be signed in to enable notifications.");
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  if (!(await isSupported())) return "unsupported";
  const serviceWorkerRegistration = await registerMessagingWorker();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { serviceWorkerRegistration });
  if (!token) throw new Error("Tiny Titans could not register this device for notifications.");
  const tokenId = await tokenDocumentId(token);
  await setDoc(doc(db, "users", uid, "notificationTokens", tokenId), { token, enabled: true, platform: navigator.platform || "unknown", userAgent: navigator.userAgent, updatedAt: serverTimestamp() }, { merge: true });
  await saveNotificationSettings(uid, { ...(await getNotificationSettings(uid)), enabled: true });
  return "granted";
}

export async function disableNotifications(uid: string): Promise<void> {
  if (!uid) return;
  try { if (await isSupported()) await deleteToken(getMessaging(app)); }
  catch (error) { console.warn("Tiny Titans: local notification token could not be removed", error); }
  const settings = await getNotificationSettings(uid);
  await saveNotificationSettings(uid, { ...settings, enabled: false });
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => registration.active?.scriptURL.includes("firebase-messaging-sw.js")).map((registration) => registration.unregister()));
  }
}

export async function removeNotificationToken(uid: string, token: string): Promise<void> {
  const tokenId = await tokenDocumentId(token);
  await deleteDoc(doc(db, "users", uid, "notificationTokens", tokenId));
}
