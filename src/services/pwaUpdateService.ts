import { registerSW } from "virtual:pwa-register";
import {
  notifyTinyTitansUpdateAvailable,
  setTinyTitansUpdateHandler,
} from "../components/AppUpdatePrompt";

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initializePwaUpdateService() {
  if (updateServiceWorker) return updateServiceWorker;

  updateServiceWorker = import.meta.env.DEV
    ? async (_reloadPage = false) => undefined
    : registerSW({
        immediate: true,
        onNeedRefresh() {
          notifyTinyTitansUpdateAvailable();
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;

          const checkForUpdate = () => {
            if (document.visibilityState !== "visible" || !navigator.onLine) return;
            void registration.update().catch(() => undefined);
          };

          window.setTimeout(checkForUpdate, 10 * 1000);
          window.setInterval(checkForUpdate, 5 * 60 * 1000);
          window.addEventListener("focus", checkForUpdate);
          window.addEventListener("online", checkForUpdate);
          document.addEventListener("visibilitychange", checkForUpdate);
        },
        onOfflineReady() {},
      });

  setTinyTitansUpdateHandler(async () => {
    await updateServiceWorker?.(true);
  });

  return updateServiceWorker;
}

export async function clearStaleDevPwaState() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => {
            const workers = [
              registration.active,
              registration.waiting,
              registration.installing,
            ];
            return !workers.some((worker) =>
              worker?.scriptURL.includes("/firebase-messaging-sw.js"),
            );
          })
          .map((registration) => registration.unregister()),
      );
    }

    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn(
      "Tiny Titans could not fully clear stale dev PWA state",
      error,
    );
  }
}
