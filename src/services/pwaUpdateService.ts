import { registerSW } from "virtual:pwa-register";
export const TINY_TITANS_SW_UPDATE_EVENT = "tiny-titans-sw-update";
export const TINY_TITANS_OFFLINE_READY_EVENT = "tiny-titans-offline-ready";

export function hasTinyTitansOfflineReadyNotification(): boolean {
  return typeof window !== "undefined" && window.__tinyTitansOfflineReady === true;
}

declare global {
  interface Window { __tinyTitansOfflineReady?: boolean }
}


let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initializePwaUpdateService() {
  if (updateServiceWorker) return updateServiceWorker;

  updateServiceWorker = import.meta.env.DEV
    ? async (_reloadPage = false) => undefined
    : registerSW({
        immediate: true,
        onNeedRefresh() {
          // The ReleaseCheckGuard is the sole update UI and checks the
          // uncached server release manifest before refreshing any work.
          window.dispatchEvent(new Event(TINY_TITANS_SW_UPDATE_EVENT));
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
        onOfflineReady() {
          // This says core files are available offline, not that the client
          // has the latest release. The guard checks on reconnect.
          window.__tinyTitansOfflineReady = true;
          window.dispatchEvent(new Event(TINY_TITANS_OFFLINE_READY_EVENT));
        },
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
