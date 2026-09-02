import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase/config";
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationPermissionState, type NotificationSettings } from "../types/Notifications";

const SETTINGS_FIELD = "notificationSettings";
const NOTIFICATION_ENABLED_EVENT = "tiny-titans-notifications-enabled";
// Public Web Push/VAPID key for the Tiny Titans Firebase project.
const VAPID_KEY = "BEpw4KCfLyPQq_HGcc2xG6tbaPoYpTaKLW2iMNqUXswa-beCul3CdgrIV5a5jx7ajA4jHywtDy6srnMiW_2lyuI";

export type NotificationDeviceStatus = {
  supported: boolean;
  permission: NotificationPermissionState;
  settingsEnabled: boolean;
  registered: boolean;
  serviceWorkerReady: boolean;
  tokenCount: number;
};

function validTime(value: unknown, fallback: string): string { return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback; }
function settingsFor(value: unknown): NotificationSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const raw = value as Partial<NotificationSettings>;
  const days = Number(raw.feedingPreparationDaysBefore);
  const shedDays = Number(raw.shedReminderDays);
  const missedMinutes = Number(raw.medicationMissedFollowUpMinutes);
  const healthFollowUpLeadDays = Number(raw.healthFollowUpLeadDays);
  return {
    enabled: raw.enabled === true,
    feedingPreparationEnabled: raw.feedingPreparationEnabled !== false,
    feedingPreparationDaysBefore: Number.isFinite(days) && days >= 0 && days <= 30 ? Math.round(days) : DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationDaysBefore,
    feedingPreparationTime: validTime(raw.feedingPreparationTime, DEFAULT_NOTIFICATION_SETTINGS.feedingPreparationTime),
    feedingRemindersEnabled: raw.feedingRemindersEnabled !== false,
    weightRemindersEnabled: raw.weightRemindersEnabled !== false,
    weightReminderTime: validTime(raw.weightReminderTime, DEFAULT_NOTIFICATION_SETTINGS.weightReminderTime),
    shedRemindersEnabled: raw.shedRemindersEnabled !== false,
    shedReminderDays: Number.isFinite(shedDays) && shedDays >= 1 && shedDays <= 30 ? Math.round(shedDays) : DEFAULT_NOTIFICATION_SETTINGS.shedReminderDays,
    shedReminderTime: validTime(raw.shedReminderTime, DEFAULT_NOTIFICATION_SETTINGS.shedReminderTime),
    healthRemindersEnabled: raw.healthRemindersEnabled !== false,
    healthReminderFollowUpEnabled: raw.healthReminderFollowUpEnabled !== false,
    medicationMissedFollowUpMinutes: Number.isFinite(missedMinutes) && missedMinutes >= 5 && missedMinutes <= 1440 ? Math.round(missedMinutes) : DEFAULT_NOTIFICATION_SETTINGS.medicationMissedFollowUpMinutes,
    healthFollowUpLeadDays: Number.isFinite(healthFollowUpLeadDays) && healthFollowUpLeadDays >= 0 && healthFollowUpLeadDays <= 30 ? Math.round(healthFollowUpLeadDays) : DEFAULT_NOTIFICATION_SETTINGS.healthFollowUpLeadDays,
  };
}
export function getNotificationPermissionState(): NotificationPermissionState { if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"; return Notification.permission; }
export async function getNotificationSettings(uid: string): Promise<NotificationSettings> { if (!uid) return { ...DEFAULT_NOTIFICATION_SETTINGS }; const snapshot = await getDoc(doc(db, "users", uid)); return settingsFor(snapshot.data()?.[SETTINGS_FIELD]); }
export async function saveNotificationSettings(uid: string, settings: NotificationSettings): Promise<NotificationSettings> { const next = settingsFor(settings); await setDoc(doc(db, "users", uid), { [SETTINGS_FIELD]: next, updatedAt: serverTimestamp() }, { merge: true }); return next; }
async function tokenDocumentId(token: string): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function registerMessagingWorker(): Promise<ServiceWorkerRegistration> { if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers."); const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/firebase-messaging/" }); await navigator.serviceWorker.ready; return registration; }
async function registerCurrentDeviceToken(uid: string): Promise<boolean> {
  if (!uid || typeof window === "undefined" || !("serviceWorker" in navigator) || !(await isSupported())) return false;
  const serviceWorkerRegistration = await registerMessagingWorker();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { serviceWorkerRegistration, vapidKey: VAPID_KEY });
  if (!token) return false;
  const tokenId = await tokenDocumentId(token);
  await setDoc(doc(db, "users", uid, "notificationTokens", tokenId), { token, enabled: true, platform: navigator.platform || "unknown", userAgent: navigator.userAgent, registrationScope: serviceWorkerRegistration.scope, updatedAt: serverTimestamp() }, { merge: true });
  return true;
}
export async function hasRegisteredNotificationDevice(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const snapshot = await getDocs(collection(db, "users", uid, "notificationTokens"));
    return snapshot.docs.some((item) => item.data().enabled === true && typeof item.data().token === "string" && item.data().token.length > 0);
  } catch (error) {
    console.warn("Tiny Titans: notification device check failed", error);
    return false;
  }
}
export async function getNotificationDeviceStatus(uid: string): Promise<NotificationDeviceStatus> {
  const permission = getNotificationPermissionState();
  const settings = await getNotificationSettings(uid);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && (await isSupported().catch(() => false));
  let serviceWorkerReady = false;
  if (supported) {
    try { const registration = await registerMessagingWorker(); serviceWorkerReady = Boolean(registration.active || registration.waiting || registration.installing); } catch (error) { console.warn("Tiny Titans: notification service worker check failed", error); }
  }
  let tokenCount = 0;
  try { const snapshot = await getDocs(collection(db, "users", uid, "notificationTokens")); tokenCount = snapshot.docs.filter((item) => item.data().enabled === true && typeof item.data().token === "string" && item.data().token.length > 0).length; } catch (error) { console.warn("Tiny Titans: notification token count failed", error); }
  return { supported, permission, settingsEnabled: settings.enabled, registered: tokenCount > 0, serviceWorkerReady, tokenCount };
}
export async function refreshNotificationRegistration(uid: string): Promise<boolean> {
  if (!uid || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  try { return await registerCurrentDeviceToken(uid); } catch (error) { console.warn("Tiny Titans: notification registration refresh failed", error); return false; }
}
export async function enableNotifications(uid: string): Promise<NotificationPermissionState> {
  if (!uid) throw new Error("You must be signed in to enable notifications.");
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  let permission = Notification.permission; if (permission === "default") permission = await Notification.requestPermission(); if (permission !== "granted") return permission;
  if (!(await isSupported())) return "unsupported";
  const registered = await registerCurrentDeviceToken(uid); if (!registered) throw new Error("Tiny Titans could not register this device for notifications.");
  await saveNotificationSettings(uid, { ...(await getNotificationSettings(uid)), enabled: true });
  window.dispatchEvent(new Event(NOTIFICATION_ENABLED_EVENT));
  return "granted";
}
export async function disableNotifications(uid: string): Promise<void> {
  if (!uid) return;
  try { if (await isSupported()) await deleteToken(getMessaging(app)); } catch (error) { console.warn("Tiny Titans: local notification token could not be removed", error); }
  try { const tokenSnapshot = await getDocs(collection(db, "users", uid, "notificationTokens")); await Promise.all(tokenSnapshot.docs.map((tokenDoc) => deleteDoc(tokenDoc.ref))); } catch (error) { console.warn("Tiny Titans: notification token records could not be cleaned up", error); }
  const settings = await getNotificationSettings(uid); await saveNotificationSettings(uid, { ...settings, enabled: false });
  if ("serviceWorker" in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.filter((registration) => registration.active?.scriptURL.includes("firebase-messaging-sw.js")).map((registration) => registration.unregister())); }
}
export async function removeNotificationToken(uid: string, token: string): Promise<void> { const tokenId = await tokenDocumentId(token); await deleteDoc(doc(db, "users", uid, "notificationTokens", tokenId)); }
export type NotificationTestKind = "feed" | "weight" | "shed" | "health" | "general";
export type NotificationTestResult = { eventKey: string; targetUid: string; kind: NotificationTestKind; title: string; body: string; url: string; status: "sent" | "no-delivery"; sentCount: number; invalidTokenCount: number; };
export async function sendNotificationTest(options: { kind: NotificationTestKind; targetUserId?: string; targetEmail?: string }): Promise<NotificationTestResult> { const functions = getFunctions(app, "europe-west2"); const callable = httpsCallable<typeof options, NotificationTestResult>(functions, "sendNotificationTest"); const response = await callable(options); return response.data; }
export { NOTIFICATION_ENABLED_EVENT };
