import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { FULL_INTELLIGENCE_COPY } from "../services/intelligencePermissionGateService";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { PrivacyPreferences } from "../types/privacy";
import PageBackButton from "../components/PageBackButton";

const EMPTY: PrivacyPreferences = { consentVersion: "", communityLocation: false, anonymousAnalytics: false, communityHusbandryData: false, productUpdates: false };

export default function DataPrivacy() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) { setLoading(false); return () => { active = false; }; }
    void getPrivacyPreferences(user.uid).then((value) => { if (active) setPreferences(value); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Privacy choices could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function save(next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">) {
    if (!user || saving) return;
    setSaving(true); setSaved(false); setError("");
    try { await savePrivacyPreferences(user.uid, next); setPreferences(await getPrivacyPreferences(user.uid)); setSaved(true); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save your privacy choices."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="page-container"><section className="personalisation-shell"><p className="personalisation-eyebrow">My Account</p><h1>🔐 Data &amp; Privacy</h1><div className="personalisation-card"><p>Loading privacy controls…</p></div></section></main>;

  const intelligenceEnabled = preferences.communityHusbandryData === true;

  return <main className="page-container"><section className="personalisation-shell">
    <PageBackButton fallbackPath="/account" label="Back to My Account" />
    <p className="personalisation-eyebrow">My Account</p><h1>🔐 Data &amp; Privacy</h1>
    <p>Your snake records remain yours and the app remains fully usable either way. This choice controls whether Tiny Titans may use eligible husbandry records for its advanced Intelligence layer.</p>

    <section className="personalisation-card">
      <h2>🐍 Basic Keeper Mode</h2>
      <p><strong>Always available.</strong> When Intelligence is off, Tiny Titans still lets you add and manage snakes, record weights, feeding, shedding, behaviour, health and husbandry, use reminders, learning, morphs and breeding tools, and review your own records.</p>
      <p><strong>Basic means basic:</strong> your records can be displayed as history, latest values and simple totals/counts. Tiny Titans does not interpret them, correlate them, benchmark them, detect patterns or generate smart keeper insights while Intelligence is off.</p>
    </section>

    <section className="personalisation-card">
      <h2>🧠 Titan Intelligence</h2>
      <p>{FULL_INTELLIGENCE_COPY.body}</p>
      <label className="setup-check">
        <input type="checkbox" checked={intelligenceEnabled} onChange={(event) => void save({ ...preferences, communityHusbandryData: event.target.checked })} disabled={saving} />
        <span>
          <strong>{intelligenceEnabled ? "Titan Intelligence is active" : "Enable Titan Intelligence"}</strong>
          <small>{intelligenceEnabled ? "Advanced individual intelligence and eligible community contribution are enabled while your consent remains on." : "Unlock advanced individual intelligence and community knowledge by choosing to contribute eligible husbandry data."}</small>
        </span>
      </label>
      <div className="setup-help">
        <strong>{intelligenceEnabled ? "What you unlock" : "What stays locked"}</strong>
        <p>{intelligenceEnabled ? "Intelligent trends, correlations, anomaly detection, individual benchmarking, intelligence memory/timeline and community intelligence can operate while your consent is enabled." : "Smart trends, correlations, anomaly detection, benchmarking, intelligence memory/timeline and community intelligence remain paused. Your basic records are not deleted or restricted."}</p>
      </div>
      <button className="account-button account-button--highlight" type="button" onClick={() => navigate("/account/intelligence")}>🧠 {intelligenceEnabled ? "Open Intelligence Dashboard" : "View Intelligence &amp; Why Opt In"} →</button>
    </section>

    <section className="personalisation-card"><h2>📊 Anonymous product analytics</h2><p>Optional aggregated usage and feature-performance information used to improve Tiny Titans. This is separate from Titan Intelligence.</p><label className="setup-check"><input type="checkbox" checked={preferences.anonymousAnalytics} onChange={(event) => void save({ ...preferences, anonymousAnalytics: event.target.checked })} disabled={saving} /><span><strong>Allow anonymous product analytics</strong><small>You can switch this off later.</small></span></label></section>
    <section className="personalisation-card"><h2>🌍 Community location</h2><p>Optional approximate community location. Tiny Titans should use a coarse area rather than expose an exact home position.</p><label className="setup-check"><input type="checkbox" checked={preferences.communityLocation} onChange={(event) => void save({ ...preferences, communityLocation: event.target.checked })} disabled={saving} /><span><strong>Show my approximate area on the community map</strong><small>Community location is separate from husbandry intelligence.</small></span></label></section>
    <section className="personalisation-card"><h2>📣 Product updates</h2><p>Optional Tiny Titans feature and release updates.</p><label className="setup-check"><input type="checkbox" checked={preferences.productUpdates} onChange={(event) => void save({ ...preferences, productUpdates: event.target.checked })} disabled={saving} /><span><strong>Receive product updates</strong><small>This does not control app tracking or Intelligence.</small></span></label></section>
    {error && <div className="setup-error" role="alert">{error}</div>}{saved && <p className="personalisation-saved" role="status">✓ Your data choices have been saved.</p>}
    <p className="setup-help">Consent version: {preferences.consentVersion || "Not recorded"}. Optional choices can be changed or withdrawn at any time.</p>
  </section></main>;
}
