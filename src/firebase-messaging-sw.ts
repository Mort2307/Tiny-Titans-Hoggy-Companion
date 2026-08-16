/// <reference lib="webworker" />
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0",
  authDomain: "tinytitans-hoggy-companion.firebaseapp.com",
  projectId: "tinytitans-hoggy-companion",
  storageBucket: "tinytitans-hoggy-companion.firebasestorage.app",
  messagingSenderId: "309730999071",
  appId: "1:309730999071:web:c2b9364b584f787990e2a",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const sw = self as unknown as ServiceWorkerGlobalScope;

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title || payload.data?.title || "🐍 Tiny Titans Reminder";
  const body = payload.notification?.body || payload.data?.body || "You have a Tiny Titans reminder.";
  const url = payload.data?.url || "/";
  void sw.registration.showNotification(title, {
    body,
    icon: "/TinyTitans-Logo.jpg",
    badge: "/TinyTitans-Logo.jpg",
    data: { url, notificationId: payload.data?.notificationId || "" },
    tag: payload.data?.notificationId || "tiny-titans-reminder",
  });
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(String((event.notification.data as { url?: string } | undefined)?.url || "/"), sw.location.origin).href;
  event.waitUntil(sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing && "navigate" in existing) {
      return (existing as WindowClient).navigate(target).then((client) => client?.focus());
    }
    return sw.clients.openWindow(target);
  }));
});
