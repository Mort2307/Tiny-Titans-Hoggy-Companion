import { useEffect, useState } from "react";

const UPDATE_EVENT = "tiny-titans-update-available";

export function notifyTinyTitansUpdateAvailable() {
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

let applyPendingTinyTitansUpdate: (() => Promise<void>) | null = null;

export function setTinyTitansUpdateHandler(handler: () => Promise<void>) {
  applyPendingTinyTitansUpdate = handler;
}

export default function AppUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const mandatory = import.meta.env.VITE_TINY_TITANS_FORCE_UPDATE === "true";

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(UPDATE_EVENT, show);
    return () => window.removeEventListener(UPDATE_EVENT, show);
  }, []);

  if (!open) return null;

  const updateNow = async () => {
    if (!applyPendingTinyTitansUpdate || updating) return;
    setUpdating(true);
    try {
      await applyPendingTinyTitansUpdate();
    } finally {
      setUpdating(false);
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
            <button type="button" className="tt-update-secondary" onClick={() => setOpen(false)} disabled={updating}>
              Later
            </button>
          )}
        </div>
        {mandatory && <small className="tt-update-required">This update is required before Tiny Titans can continue.</small>}
      </section>
    </div>
  );
}
