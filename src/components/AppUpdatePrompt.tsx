import { useEffect, useState } from "react";

const UPDATE_EVENT = "tiny-titans-update-available";
const UPDATE_TIMEOUT_MS = 10000;
const UPDATE_ATTEMPT_KEY = "tiny-titans-update-attempt";
const UPDATE_ATTEMPT_COOLDOWN_MS = 30000;

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

function hasRecentUpdateAttempt() {
  try {
    const value = Number(window.sessionStorage.getItem(UPDATE_ATTEMPT_KEY));
    return Number.isFinite(value) && Date.now() - value < UPDATE_ATTEMPT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markUpdateAttempt() {
  try {
    window.sessionStorage.setItem(UPDATE_ATTEMPT_KEY, String(Date.now()));
  } catch {
    // Session storage can be unavailable in restricted/private browser modes.
  }
}

function clearUpdateAttempt() {
  try {
    window.sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);
  } catch {
    // Ignore storage failures; the update flow still works without it.
  }
}

export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const mandatory = import.meta.env.VITE_TINY_TITANS_FORCE_UPDATE === "true";

  useEffect(() => {
    const show = () => {
      // A service worker can emit the refresh event more than once while a
      // client is transitioning between versions. Consume the pending flag so
      // it cannot keep reopening the modal after the user dismisses it.
      window.__tinyTitansUpdatePending = false;
      setUpdateError(false);
      setOpen(true);
    };

    window.addEventListener(UPDATE_EVENT, show);

    if (window.__tinyTitansUpdatePending && !hasRecentUpdateAttempt()) show();
    else window.__tinyTitansUpdatePending = false;

    return () => window.removeEventListener(UPDATE_EVENT, show);
  }, []);

  if (!open) return null;

  const close = () => {
    if (updating) return;
    window.__tinyTitansUpdatePending = false;
    setOpen(false);
    setUpdateError(false);
  };

  const updateNow = async () => {
    if (updating) return;
    setUpdating(true);
    setUpdateError(false);
    window.__tinyTitansUpdatePending = false;
    markUpdateAttempt();

    try {
      if (!applyPendingTinyTitansUpdate) {
        throw new Error("Tiny Titans update handler is not ready.");
      }

      let reloaded = false;
      const reload = () => {
        if (reloaded) return;
        reloaded = true;
        clearUpdateAttempt();
        window.location.reload();
      };

      const watchdog = window.setTimeout(reload, UPDATE_TIMEOUT_MS);
      try {
        await applyPendingTinyTitansUpdate();
      } finally {
        window.clearTimeout(watchdog);
      }

      // updateSW(true) normally reloads through controllerchange. If the
      // service worker implementation resolves without doing so, give the
      // browser a short settling window and then reload exactly once.
      window.setTimeout(reload, 500);
    } catch (error) {
      console.error("[Tiny Titans] Failed to apply app update", error);
      clearUpdateAttempt();
      setUpdating(false);
      setUpdateError(true);
    }
  };

  return (
    <div className="tt-update-backdrop" role="presentation">
      <section className="tt-update-panel" role="alertdialog" aria-modal="true" aria-labelledby="tt-update-title" aria-describedby="tt-update-description">
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
            <button type="button" className="tt-update-secondary" onClick={close} disabled={updating}>
              Later
            </button>
          )}
        </div>
        {updateError && (
          <small className="tt-update-required">The update could not be applied automatically. Tap Update Now to retry.</small>
        )}
        {mandatory && !updateError && <small className="tt-update-required">This update is required before Tiny Titans can continue.</small>}
      </section>
    </div>
  );
}
