import { useEffect, useRef, useState } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import { applyTinyTitansSafeUpdate, checkTinyTitansRelease } from "../services/tinyTitansReleaseUpdate";
import "../styles/AppUpdatePrompt.css";

const UPDATE_EVENT = "tiny-titans-update-available";
const OFFLINE_EVENT = "tiny-titans-offline-ready";
export const MANUAL_UPDATE_CHECK_EVENT = "tiny-titans-manual-update-check";
const RELEASE_POLL_MS = 20 * 1000;
const UPDATE_TIMEOUT_MS = 15000;
const UPDATE_CHECK_INTERVAL_MS = 60000;

export function notifyTinyTitansUpdateAvailable() {
  window.__tinyTitansUpdatePending = true;
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function notifyTinyTitansOfflineReady() {
  window.__tinyTitansOfflineReady = true;
  window.dispatchEvent(new Event(OFFLINE_EVENT));
}

let applyPendingTinyTitansUpdate: (() => Promise<void>) | null = null;

export function setTinyTitansUpdateHandler(handler: () => Promise<void>) {
  applyPendingTinyTitansUpdate = handler;
}

declare global {
  interface Window {
    __tinyTitansUpdatePending?: boolean;
    __tinyTitansOfflineReady?: boolean;
  }
}

export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(() => Boolean(window.__tinyTitansUpdatePending));
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const releaseDetectedRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const updatingRef = useRef(updating);
  const mandatory = import.meta.env.VITE_TINY_TITANS_FORCE_UPDATE === "true";

  useEffect(() => {
    const show = () => {
      setPending(true);
      setUpdateError(false);
      setOpen(true);
    };
    let offlineTimer: number | undefined;
    const showOffline = () => {
      setOfflineReady(true);
      if (offlineTimer !== undefined) window.clearTimeout(offlineTimer);
      offlineTimer = window.setTimeout(() => setOfflineReady(false), 4500);
    };

    window.addEventListener(UPDATE_EVENT, show);
    window.addEventListener(OFFLINE_EVENT, showOffline);
    if (window.__tinyTitansUpdatePending) show();
    if (window.__tinyTitansOfflineReady) {
      window.__tinyTitansOfflineReady = false;
      showOffline();
    }
    return () => {
      window.removeEventListener(UPDATE_EVENT, show);
      window.removeEventListener(OFFLINE_EVENT, showOffline);
      if (offlineTimer !== undefined) window.clearTimeout(offlineTimer);
    };
  }, []);

  // An app update must be discovered on the first load, not five minutes later.
  // Compare the running commit against the no-cache Hosting release stamp,
  // regardless of whether the Workbox registration has finished installing.
  useEffect(() => {
    let cancelled = false;
    let checking = false;
    let promptedCommit = "";
    let feedbackTimer: number | undefined;
    const check = async (manual = false) => {
      if (checking || cancelled || !navigator.onLine) {
        if (manual && !navigator.onLine) setCheckMessage("You're offline. Connect to check for updates.");
        return;
      }
      checking = true;
      if (manual) setCheckMessage("Checking for TinyTitans updates…");
      try {
        const status = await checkTinyTitansRelease();
        if (cancelled) return;
        if (!status.checked) {
          if (manual) setCheckMessage("Couldn't confirm the current release. Try again with a connection.");
        } else if (status.updateAvailable && status.latestCommit) {
          releaseDetectedRef.current = true;
          if (manual || promptedCommit !== status.latestCommit) {
            promptedCommit = status.latestCommit;
            notifyTinyTitansUpdateAvailable();
          }
          setCheckMessage("");
        } else if (manual) {
          setCheckMessage(status.currentCommit
            ? "You're on the latest TinyTitans release."
            : "Release found, but this installed build cannot be compared. Use Settings → Updates → Force refresh.");
        }
        if (manual && !status.updateAvailable) {
          window.clearTimeout(feedbackTimer);
          feedbackTimer = window.setTimeout(() => { if (!cancelled) setCheckMessage(""); }, 6500);
        }
      } catch {
        if (manual && !cancelled) setCheckMessage("Update check failed. Please retry.");
      } finally { checking = false; }
    };
    const onManual = () => { void check(true); };
    const onForeground = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener(MANUAL_UPDATE_CHECK_EVENT, onManual);
    window.addEventListener("focus", onForeground);
    window.addEventListener("online", onForeground);
    document.addEventListener("visibilitychange", onForeground);
    void check();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, RELEASE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(feedbackTimer);
      window.removeEventListener(MANUAL_UPDATE_CHECK_EVENT, onManual);
      window.removeEventListener("focus", onForeground);
      window.removeEventListener("online", onForeground);
      document.removeEventListener("visibilitychange", onForeground);
    };
  }, []);

  useEffect(() => {
    updatingRef.current = updating;
  }, [updating]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => primaryRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mandatory && !updatingRef.current) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const previous = previousFocusRef.current;
      if (previous?.isConnected) window.requestAnimationFrame(() => previous.focus());
    };
  }, [mandatory, open]);

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

  const updateNow = async () => {
    if (updating) return;
    setUpdating(true);
    setUpdateError(false);
    setPending(false);
    window.__tinyTitansUpdatePending = false;

    try {
      if (!releaseDetectedRef.current && !applyPendingTinyTitansUpdate) {
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
        if (releaseDetectedRef.current) await applyTinyTitansSafeUpdate();
        else await applyPendingTinyTitansUpdate?.();
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
      setPending(true);
      window.__tinyTitansUpdatePending = true;
    }
  };

  if (!open) {
    if (!pending && !offlineReady) return null;

    return (
      <>
        {checkMessage && <div className="tt-update-check-feedback" role="status" aria-live="polite">{checkMessage}</div>}
        {offlineReady && !pending && (
          <div className="tt-offline-ready" role="status">
            <TinyTitansIcon name="check" size={16} />
            <span><strong>Ready offline</strong><small>Core Tiny Titans files are cached on this device.</small></span>
          </div>
        )}
        {pending && <button
        type="button"
        className="tt-update-manual"
        onClick={() => void updateNow()}
        disabled={updating}
        aria-label="Apply the available Tiny Titans update"
        title="A newer Tiny Titans version is ready"
      >
        {updating ? "Updating…" : "Update available"}
      </button>}
      </>
    );
  }

  return (
    <div className="tt-update-backdrop" role="presentation">
      <section
        ref={panelRef}
        className="tt-update-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tt-update-title"
        aria-describedby="tt-update-description"
      >
        <div className="tt-update-logo" aria-hidden="true"><TinyTitansIcon name="reptiles" size={54} /></div>
        <p className="tt-update-kicker">TINY TITANS UPDATE</p>
        <h2 id="tt-update-title">A newer Tiny Titans is ready</h2>
        <p id="tt-update-description">
          Tiny Titans has been updated with improvements and fixes. Update now to load the latest app version while keeping your Firebase records, account and family data safe.
        </p>
        <div className="tt-update-actions">
          <button ref={primaryRef} type="button" className="tt-update-primary" onClick={() => void updateNow()} disabled={updating}>
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
