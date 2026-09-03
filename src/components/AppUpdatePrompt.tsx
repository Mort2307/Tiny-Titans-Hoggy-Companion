import { useEffect, useState } from "react";

const UPDATE_EVENT = "tiny-titans-update-available";
const UPDATE_TIMEOUT_MS = 15000;
const UPDATE_CHECK_INTERVAL_MS = 60000;

export function notifyTinyTitansUpdateAvailable() {
  window.__tinyTitansUpdatePending = true;
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

let applyPendingTinyTitansUpdate: (() => Promise<void>) | null = null;

export function setTinyTitansUpdateHandler(handler: () => Promise<void>) {
  applyPendingTinyTitansUpdate = handler;
}

declare global {
  interface Window {
    __tinyTitansUpdatePending?: boolean;
  }
}

export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const mandatory = import.meta.env.VITE_TINY_TITANS_FORCE_UPDATE === "true";

  useEffect(() => {
    const show = () => {
      setUpdateError(false);
      setOpen(true);
    };

    window.addEventListener(UPDATE_EVENT, show);
    if (window.__tinyTitansUpdatePending) show();
    return () => window.removeEventListener(UPDATE_EVENT, show);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    let intervalId: number | undefined;
    let cleanupRegistration: (() => void) | null = null;
    let cleanupInstalling: (() => void) | null = null;

    const showWaitingWorker = () => {
      if (cancelled || !registration) return;

      // A waiting worker during the very first PWA install is not an update.
      // Only surface the prompt when this page is already controlled by a SW.
      if (navigator.serviceWorker.controller && registration.waiting) {
        notifyTinyTitansUpdateAvailable();
      }
    };

    const watchInstallingWorker = (worker: ServiceWorker) => {
      const onStateChange = () => {
        if (worker.state === "installed") showWaitingWorker();
      };
      worker.addEventListener("statechange", onStateChange);
      return () => worker.removeEventListener("statechange", onStateChange);
    };

    const setup = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        registration = (await navigator.serviceWorker.getRegistration()) ?? null;
        if (!registration || cancelled) return;

        const onUpdateFound = () => {
          cleanupInstalling?.();
          cleanupInstalling = registration?.installing
            ? watchInstallingWorker(registration.installing)
            : null;
        };

        registration.addEventListener("updatefound", onUpdateFound);
        showWaitingWorker();

        const checkForUpdate = async () => {
          if (cancelled || !registration) return;
          if (document.visibilityState !== "visible" || !navigator.onLine) return;

          showWaitingWorker();
          try {
            await registration.update();
          } catch (error) {
            console.debug("[Tiny Titans] Service-worker update check failed", error);
          }
          showWaitingWorker();
        };

        void checkForUpdate();
        intervalId = window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS);

        const onFocusOrOnline = () => void checkForUpdate();
        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") void checkForUpdate();
        };

        window.addEventListener("focus", onFocusOrOnline);
        window.addEventListener("online", onFocusOrOnline);
        document.addEventListener("visibilitychange", onVisibilityChange);

        cleanupRegistration = () => {
          registration?.removeEventListener("updatefound", onUpdateFound);
          cleanupInstalling?.();
          cleanupInstalling = null;
          window.removeEventListener("focus", onFocusOrOnline);
          window.removeEventListener("online", onFocusOrOnline);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };
      } catch (error) {
        console.debug("[Tiny Titans] Service-worker update monitor unavailable", error);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      cleanupRegistration?.();
    };
  }, []);

  if (!open) return null;

  const updateNow = async () => {
    if (updating) return;
    setUpdating(true);
    setUpdateError(false);
    window.__tinyTitansUpdatePending = false;

    try {
      if (!applyPendingTinyTitansUpdate) {
        throw new Error("Tiny Titans update handler is not ready.");
      }

      let reloaded = false;
      const markReload = () => {
        reloaded = true;
      };
      window.addEventListener("beforeunload", markReload, { once: true });

      const watchdog = window.setTimeout(() => {
        if (!reloaded) {
          console.warn("[Tiny Titans] Update watchdog forcing a clean reload");
          window.location.reload();
        }
      }, UPDATE_TIMEOUT_MS);

      try {
        await applyPendingTinyTitansUpdate();
        await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
        if (!reloaded) window.location.reload();
      } finally {
        window.clearTimeout(watchdog);
        window.removeEventListener("beforeunload", markReload);
      }
    } catch (error) {
      console.error("[Tiny Titans] Failed to apply app update", error);
      setUpdating(false);
      setUpdateError(true);
      window.__tinyTitansUpdatePending = true;
    }
  };

  return (
    <div className="tt-update-backdrop" role="presentation">
      <section
        className="tt-update-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tt-update-title"
        aria-describedby="tt-update-description"
      >
        <div className="tt-update-logo" aria-hidden="true">🦎</div>
        <p className="tt-update-kicker">TINY TITANS UPDATE</p>
        <h2 id="tt-update-title">A newer Tiny Titans is ready</h2>
        <p id="tt-update-description">
          Tiny Titans has been updated with improvements and fixes. Update now to load the latest app version while keeping your Firebase records, account and family data safe.
        </p>
        <div className="tt-update-actions">
          <button type="button" className="tt-update-primary" onClick={() => void updateNow()} disabled={updating}>
            {updating ? "Updating Tiny Titans…" : "Update Now"}
          </button>
          {!mandatory && (
            <button type="button" className="tt-update-secondary" onClick={() => setOpen(false)} disabled={updating}>
              Later
            </button>
          )}
        </div>
        {updateError && (
          <small className="tt-update-required">The update could not be applied automatically. Tap Update Now to retry.</small>
        )}
        {mandatory && !updateError && (
          <small className="tt-update-required">This update is required before Tiny Titans can continue.</small>
        )}
      </section>
    </div>
  );
}
