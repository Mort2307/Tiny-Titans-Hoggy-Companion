import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { configureRescuePilot, convertRescuePilotToPaid, getRescuePilotSnapshot, setRescuePlatformControls, type RescuePilotControls, type RescuePilotSnapshot } from "../services/rescuePilotService";
import "../styles/CreatorTools.css";

function dateLabel(value: number | null) {
  return value ? new Date(value).toLocaleString("en-GB") : "—";
}

export default function CreatorRescuePilots() {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<RescuePilotSnapshot | null>(null);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [controls, setControls] = useState<RescuePilotControls>({ pilotsEnabled: true, writesEnabled: true, maxActivePilots: 1 });
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    setError("");
    try { const next = await getRescuePilotSnapshot(); setSnapshot(next); setControls(next.controls); }
    catch (err) { setError(err instanceof Error ? err.message : "Rescue pilot controls could not be loaded."); }
  }

  useEffect(() => { if (profile?.role === "admin") void load(); }, [profile?.role]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);

  const active = useMemo(() => snapshot?.organisations.filter((item) => item.pilotStatus === "pilot_active" && (item.pilotEndsAt || 0) > now).length ?? 0, [snapshot, now]);
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  async function saveControls(patch: Partial<RescuePilotControls>) {
    setError(""); setMessage("");
    try { const result = await setRescuePlatformControls(patch); setControls(result.controls); setMessage("Rescue infrastructure controls saved."); }
    catch (err) { setError(err instanceof Error ? err.message : "Controls could not be saved."); }
  }

  async function configure(id: string, enabled: boolean) {
    setBusyId(id); setError(""); setMessage("");
    try { await configureRescuePilot({ organisationId: id, enabled, durationDays: 30, staffLimit: 5, animalLimit: 100, storageMbLimit: 512 }); await load(); setMessage(enabled ? "30-day Rescue pilot activated." : "Rescue pilot suspended."); }
    catch (err) { setError(err instanceof Error ? err.message : "Rescue pilot could not be updated."); }
    finally { setBusyId(""); }
  }

  async function convert(id: string) {
    setBusyId(id); setError(""); setMessage("");
    try { await convertRescuePilotToPaid(id); await load(); setMessage("Rescue workspace marked as paid-active; records remain in place."); }
    catch (err) { setError(err instanceof Error ? err.message : "Rescue workspace could not be converted."); }
    finally { setBusyId(""); }
  }

  return <main className="creator-admin-page">
    <div className="creator-admin-header"><div><Link to="/creator" className="creator-ops-secondary">← Creator Centre</Link><span className="creator-admin-kicker">RESCUE COMMERCIAL CONTROL</span><h1>🚑 Rescue Pilot Control</h1><p>Control Rescue as a dedicated paid workspace, not as a Business tab. Pilot access is temporary; organisation data is retained when a pilot ends.</p></div><button type="button" onClick={() => void load()} disabled={busyId !== ""}>↻ Refresh</button></div>
    {error && <div className="creator-error" role="alert">{error}</div>}
    {message && <div className="creator-success" role="status">{message}</div>}
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">GLOBAL SAFETY</span><h2>🛡️ Rescue infrastructure controls</h2><p>Start with one active pilot and a controlled five-seat/100-animal pilot envelope.</p></div></div>
      <div className="creator-global-grid creator-tools-grid">
        <article className="creator-global-card creator-feature-tile"><span>🚦</span><strong>New pilots</strong><small>{controls.pilotsEnabled ? "Enabled" : "Disabled"}</small><button type="button" onClick={() => void saveControls({ pilotsEnabled: !controls.pilotsEnabled })}>{controls.pilotsEnabled ? "Stop new pilots" : "Allow new pilots"}</button></article>
        <article className="creator-global-card creator-feature-tile"><span>📝</span><strong>Rescue writes</strong><small>{controls.writesEnabled ? "Enabled" : "Read-only mode"}</small><button type="button" onClick={() => void saveControls({ writesEnabled: !controls.writesEnabled })}>{controls.writesEnabled ? "Make Rescue read-only" : "Re-enable Rescue writes"}</button></article>
        <article className="creator-global-card creator-feature-tile"><span>👥</span><strong>Active pilot cap</strong><small>{active} / {controls.maxActivePilots}</small><select value={controls.maxActivePilots} onChange={(event) => void saveControls({ maxActivePilots: Number(event.target.value) })}><option value={1}>1 active pilot</option><option value={2}>2 active pilots</option><option value={3}>3 active pilots</option></select></article>
      </div>
    </section>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">ORGANISATIONS</span><h2>Rescue workspaces</h2></div></div>
      {!snapshot?.organisations.length ? <div className="creator-loading">No Rescue organisations exist yet.</div> : <div className="creator-global-grid creator-tools-grid">{snapshot.organisations.map((org) => { const activePilot = org.pilotStatus === "pilot_active" && (org.pilotEndsAt || 0) > now; const expired = org.pilotStatus === "pilot_active" && !activePilot; return <article className="creator-global-card creator-feature-tile" key={org.id}><span>🚑</span><strong>{org.name}</strong><label>{org.pilotStatus.replaceAll("_", " ")}</label><small>Staff {org.staffLimit} · Animals {org.animalLimit} · Storage {org.storageMbLimit} MB</small><small>Started {dateLabel(org.pilotStartsAt)}<br />Ends {dateLabel(org.pilotEndsAt)}</small>{(activePilot || expired) && <button type="button" disabled={busyId === org.id} onClick={() => void configure(org.id, !activePilot)}>{busyId === org.id ? "Saving…" : activePilot ? "Suspend pilot" : "Restart 30-day pilot"}</button>}<button type="button" disabled={busyId === org.id} onClick={() => void convert(org.id)}>{busyId === org.id ? "Saving…" : "Convert to paid"}</button></article>; })}</div>}
    </section>
  </main>;
}
