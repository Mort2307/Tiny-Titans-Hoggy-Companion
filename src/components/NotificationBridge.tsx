import { useEffect } from "react";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase/config";
import { getNotificationSettings, NOTIFICATION_ENABLED_EVENT, refreshNotificationRegistration } from "../services/notificationService";
import { useAuth } from "../context/useAuth";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function NotificationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    let refreshBusy = false;

    const refresh = async () => {
      if (!active || !user?.uid || refreshBusy || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      refreshBusy = true;
      try {
        const settings = await getNotificationSettings(user.uid);
        if (active && settings.enabled) await refreshNotificationRegistration(user.uid);
      } catch (error) {
        if (active) console.warn("Tiny Titans: notification refresh failed", error);
      } finally {
        refreshBusy = false;
      }
    };

    const subscribe = async () => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (!active || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      try {
        if (!(await isSupported()) || !active) return;
        await refresh();
        if (!active) return;
        unsubscribe = onMessage(getMessaging(app), (payload) => {
          if (!active || document.visibilityState !== "visible") return;
          const data = payload.data || {};
          const notification = payload.notification || {};
          const title = String(data.title || notification.title || "Tiny Titans");
          const body = String(data.body || notification.body || "You have a Tiny Titans reminder.");
          const url = String(data.url || "/");
          const popup = new Notification(title, { body, icon: "/favicon.svg", badge: "/favicon.svg", tag: String(data.eventKey || "tiny-titans") });
          popup.onclick = () => { window.focus(); window.location.assign(url); };
        });
      } catch (error) {
        if (active) console.warn("Tiny Titans: notification bridge unavailable", error);
      }
    };

    const onResume = () => { void refresh(); };
    void subscribe();
    window.addEventListener(NOTIFICATION_ENABLED_EVENT, subscribe);
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onResume);
    const interval = window.setInterval(onResume, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener(NOTIFICATION_ENABLED_EVENT, subscribe);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("online", onResume);
      document.removeEventListener("visibilitychange", onResume);
      window.clearInterval(interval);
    };
  }, [user?.uid]);

  return null;
}
