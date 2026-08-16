import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listenForForegroundNotifications } from "../services/notificationService";

export default function NotificationForegroundBridge() {
  const navigate = useNavigate();
  useEffect(() => listenForForegroundNotifications((payload) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const title = payload.notification?.title || payload.data?.title || "🐍 Tiny Titans Reminder";
    const body = payload.notification?.body || payload.data?.body || "You have a Tiny Titans reminder.";
    const url = payload.data?.url || "/";
    const notification = new Notification(title, { body, icon: "/TinyTitans-Logo.jpg", tag: payload.data?.notificationId || "tiny-titans-reminder" });
    notification.onclick = () => { window.focus(); navigate(url); notification.close(); };
  }), [navigate]);
  return null;
}
