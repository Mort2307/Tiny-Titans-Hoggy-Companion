/* Tiny Titans FCM background notification worker.
 * This worker is intentionally separate from the Vite PWA service worker.
 * It is registered explicitly by notificationService.ts and therefore does not
 * take over the application shell or interfere with the Workbox PWA worker.
 */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => "focus" in client);
      if (existing) return existing.navigate(targetUrl).then(() => existing.focus());
      return clients.openWindow(targetUrl);
    })
  );
});

importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0",
  authDomain: "tinytitans-hoggy-companion.firebaseapp.com",
  projectId: "tinytitans-hoggy-companion",
  storageBucket: "tinytitans-hoggy-companion.firebasestorage.app",
  messagingSenderId: "309730999071",
  appId: "1:309730999071:web:c2b9364b584f7879900e2a",
  measurementId: "G-Z49MZXV4BR",
});

const messaging = firebase.messaging();
const TINY_TITANS_LOGO = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg?v=3";

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};

  // FCM automatically displays notification-payload messages in the background.
  // Let that native/browser behaviour own the visible notification so we do not
  // generate a duplicate notification ourselves. The backend supplies the
  // notification click link through webpush.fcmOptions.link.
  if (notification.title || notification.body) return;

  const title = data.title || "Tiny Titans";
  const body = data.body || "You have a Tiny Titans reminder.";
  const url = data.url || "/";
  self.registration.showNotification(title, {
    body,
    icon: TINY_TITANS_LOGO,
    badge: TINY_TITANS_LOGO,
    tag: data.eventKey || "tiny-titans-notification",
    data: { url },
  });
});
