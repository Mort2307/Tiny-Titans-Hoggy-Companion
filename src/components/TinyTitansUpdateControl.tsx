import { useState } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import { applyTinyTitansSafeUpdate, checkTinyTitansRelease, consumeTinyTitansRefreshedNotice, forceTinyTitansRefresh, runningTinyTitansCommit, type TinyTitansReleaseStatus } from "../services/tinyTitansReleaseUpdate";
import "../styles/tinyTitansUpdateControl.css";

function shortCommit(value: string | null): string {
  return value ? value.slice(0, 12) : "Not available";
}

export default function TinyTitansUpdateControl() {
  const [status, setStatus] = useState<TinyTitansReleaseStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState(() => consumeTinyTitansRefreshedNotice() ? "TinyTitans has refreshed. Check for updates to confirm the running version." : "");

  const check = async () => {
    if (checking || applying) return;
    setChecking(true);
    setMessage("");
    try {
      const result = await checkTinyTitansRelease();
      setStatus(result);
      if (!result.checked) setMessage("Couldn't confirm the latest release. Check your connection and try again.");
      else if (!result.currentCommit) setMessage("The installed build identifier isn't available; you can use Force refresh to fetch the latest version.");
      else if (result.updateAvailable) setMessage("A newer TinyTitans version is available.");
      else setMessage("TinyTitans is already up to date.");
    } catch {
      setMessage("Couldn't check for an update. Please try again.");
    } finally { setChecking(false); }
  };

  const apply = async () => {
    if (!status?.updateAvailable || applying) return;
    setApplying(true);
    setMessage("Updating TinyTitans without disturbing your notification registration…");
    try { await applyTinyTitansSafeUpdate(); }
    catch { setApplying(false); setMessage("The update couldn't finish. Try Force refresh."); }
  };

  const refresh = async () => {
    if (applying) return;
    setApplying(true);
    setMessage("Refreshing cached app files…");
    try { await forceTinyTitansRefresh(); }
    catch { setApplying(false); setMessage("The refresh couldn't finish. Try again."); }
  };

  return (
    <section className="tt-version-control" aria-labelledby="tt-version-control-title">
      <div className="tt-version-control__header">
        <div><p className="tt-settings-eyebrow">APP &amp; DEVICE</p><h3 id="tt-version-control-title">Keep TinyTitans current</h3></div>
        <TinyTitansIcon name="rotate" size={24} />
      </div>
      <p>Check the release installed on your device against the latest deployment. If an older app is stuck in cache, you can refresh it without deleting your animals or account.</p>
      <div className="tt-version-control__versions">
        <div><span>Running build</span><strong>{shortCommit(status?.currentCommit ?? runningTinyTitansCommit())}</strong><small>Source revision</small></div>
        <div><span>Latest deployed</span><strong>{status?.checked ? shortCommit(status.latestCommit) : "Check to compare"}</strong><small>{status?.latestDeployedAt && !Number.isNaN(Date.parse(status.latestDeployedAt)) ? new Date(status.latestDeployedAt).toLocaleString("en-GB") : "Release timestamp"}</small></div>
      </div>
      {message && <p className="tt-version-control__message" role="status" aria-live="polite">{message}</p>}
      <div className="tt-version-control__actions">
        <button type="button" disabled={checking || applying} onClick={() => void check()}><TinyTitansIcon name="rotate" size={16} /> {checking ? "Checking…" : "Check for update"}</button>
        {status?.updateAvailable && <button type="button" className="tt-version-control__primary" disabled={checking || applying} onClick={() => void apply()}><TinyTitansIcon name="upload" size={16} /> {applying ? "Updating…" : "Update now"}</button>}
        <button type="button" disabled={checking || applying} onClick={() => void refresh()}><TinyTitansIcon name="rotate" size={16} /> {applying ? "Refreshing…" : "Force refresh"}</button>
      </div>
      <p className="tt-version-control__safety">An ordinary update preserves TinyTitans notifications. Force refresh clears cached app files, not cloud records, and leaves the Firebase push worker registered. Unsaved form edits may be lost during a reload.</p>
    </section>
  );
}
