import { useEffect, useState } from "react";

const UPDATE_EVENT = "tiny-titans-update-available";
const UPDATE_TIMEOUT_MS = 15000;

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

      // updateSW(true) owns the service-worker activation/reload lifecycle.
      // Do not immediately reload after it resolves: doing so can race
      // controllerchange and leave the browser between old/new bundles.
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
