import { useEffect } from "react";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase/config";
import { NOTIFICATION_ENABLED_EVENT, refreshNotificationRegistration } from "../services/notificationService";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationBridge() {
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    const subscribe = async () => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      if (!(await isSupported()) || !active) return;
      const messaging = getMessaging(app);
      if (user?.uid) void refreshNotificationRegistration(user.uid);
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
    window.addEventListener(NOTIFICATION_ENABLED_EVENT, subscribe);
    return () => { active = false; unsubscribe?.(); window.removeEventListener(NOTIFICATION_ENABLED_EVENT, subscribe); };
  }, [user?.uid]);
  return null;
}
