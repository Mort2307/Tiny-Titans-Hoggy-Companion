import { useEffect, useState } from "react";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase/config";
import { getNotificationSettings, NOTIFICATION_ENABLED_EVENT, refreshNotificationRegistration } from "../services/notificationService";
import { useAuth } from "../context/useAuth";
import "../styles/notificationBridge.css";

type InAppNotification = { title: string; body: string; url: string; id: number };
const IN_APP_NOTIFICATION_EVENT = "tiny-titans-in-app-notification";

type InAppNotificationDetail = { title?: unknown; body?: unknown; url?: unknown };

export default function NotificationBridge() {
  const { user } = useAuth();
  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);

  useEffect(() => {
    const onInAppNotification = (event: Event) => {
      const custom = event as CustomEvent<InAppNotificationDetail>;
      const detail = custom.detail || {};
      const next: InAppNotification = {
        title: String(detail.title || "Tiny Titans"),
        body: String(detail.body || "You have a Tiny Titans update."),
        url: String(detail.url || "/"),
        id: Date.now(),
      };
      setInAppNotification(next);
    };

    window.addEventListener(IN_APP_NOTIFICATION_EVENT, onInAppNotification);
    return () => window.removeEventListener(IN_APP_NOTIFICATION_EVENT, onInAppNotification);
  }, []);

  useEffect(() => {
    if (!inAppNotification) return;
    const timeout = window.setTimeout(() => setInAppNotification(null), 9000);
    return () => window.clearTimeout(timeout);
  }, [inAppNotification]);

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

  return inAppNotification ? (
    <aside className="tt-in-app-notification" role="status" aria-live="polite">
      <div className="tt-in-app-notification__copy"><strong>{inAppNotification.title}</strong><span>{inAppNotification.body}</span></div>
      <div className="tt-in-app-notification__actions"><button type="button" onClick={() => { window.location.assign(inAppNotification.url); setInAppNotification(null); }}>Open</button><button type="button" onClick={() => setInAppNotification(null)} aria-label="Dismiss notification">×</button></div>
    </aside>
  ) : null;
}
