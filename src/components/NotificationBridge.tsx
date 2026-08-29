import { useEffect } from "react";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase/config";

export default function NotificationBridge() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void (async () => {
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      if (!(await isSupported()) || !active) return;
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
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return null;
}
