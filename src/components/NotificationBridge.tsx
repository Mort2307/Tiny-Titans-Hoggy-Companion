import { useEffect } from "react";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase/config";
import { getNotificationSettings, NOTIFICATION_ENABLED_EVENT, refreshNotificationRegistration } from "../services/notificationService";
import { useAuth } from "../context/useAuth";

export default function NotificationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    let refreshBusy = false;

    const refresh = async () => {
      if (!user?.uid || refreshBusy || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      refreshBusy = true;
      try {
        const settings = await getNotificationSettings(user.uid);
        if (settings.enabled) await refreshNotificationRegistration(user.uid);
      } finally {
        refreshBusy = false;
      }
    };

    const subscribe = async () => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      if (!(await isSupported()) || !active) return;
      await refresh();
      if (!active) return;
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        const data = payload.data || {};
        const notification = payload.notification || {};
        const title = String(data.title || notification.title || "Tiny Titans");
        const body = String(data.body || notification.body || "You have a Tiny Titans reminder.");
        const url = String(data.url || "/");
        if (document.visibilityState !== "visible") return;
        const popup = new Notification(title, { body, icon: "/favicon.svg", badge: "/favicon.svg", tag: String(data.eventKey || "tiny-titans") });
        popup.onclick = () => { window.focus(); window.location.assign(url); };
      });
    };

    void subscribe();
    const onResume = () => { void refresh(); };
    window.addEventListener(NOTIFICATION_ENABLED_EVENT, subscribe);
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onResume);
    const interval = window.setInterval(onResume, 15 * 60 * 1000);

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
