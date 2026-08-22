import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { PrivacyPreferences } from "../types/privacy";

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

  return <main className="page-container"><section className="personalisation-shell">
    <PageBackButton fallbackPath="/account" label="Back to My Account" />
    <p className="personalisation-eyebrow">My Account</p><h1>🔐 Data &amp; Privacy</h1>
    <p>Core snake tracking remains available without optional sharing. These choices control optional community participation and product improvement.</p>
    <section className="personalisation-card"><h2>🐍 Community husbandry intelligence</h2><p>When enabled, eligible feeding, weight and shed records can contribute to anonymised aggregate intelligence. Your snake names and individual history are not published as community statistics.</p><label className="setup-check"><input type="checkbox" checked={preferences.communityHusbandryData} onChange={(event) => void save({ ...preferences, communityHusbandryData: event.target.checked })} disabled={saving} /><span><strong>{preferences.communityHusbandryData ? "Intelligence contribution is active" : "Contribute eligible husbandry data"}</strong><small>{preferences.communityHusbandryData ? "You have access to the full Tiny Titans Intelligence layer." : "You still have core tracking; advanced intelligence contribution is disabled."}</small></span></label><button className="account-button account-button--highlight" type="button" onClick={() => navigate("/account/intelligence")}>🧠 Open Contribution Dashboard →</button></section>
    <section className="personalisation-card"><h2>📊 Anonymous product analytics</h2><p>Optional aggregated usage and feature-performance information used to improve Tiny Titans.</p><label className="setup-check"><input type="checkbox" checked={preferences.anonymousAnalytics} onChange={(event) => void save({ ...preferences, anonymousAnalytics: event.target.checked })} disabled={saving} /><span><strong>Allow anonymous product analytics</strong><small>You can switch this off later.</small></span></label></section>
    <section className="personalisation-card"><h2>🌍 Community location</h2><p>Optional approximate community location. Tiny Titans should use a coarse area rather than expose an exact home position.</p><label className="setup-check"><input type="checkbox" checked={preferences.communityLocation} onChange={(event) => void save({ ...preferences, communityLocation: event.target.checked })} disabled={saving} /><span><strong>Show my approximate area on the community map</strong><small>Community location is separate from husbandry intelligence.</small></span></label></section>
    <section className="personalisation-card"><h2>📣 Product updates</h2><p>Optional Tiny Titans feature and release updates.</p><label className="setup-check"><input type="checkbox" checked={preferences.productUpdates} onChange={(event) => void save({ ...preferences, productUpdates: event.target.checked })} disabled={saving} /><span><strong>Receive product updates</strong><small>This does not control app tracking or intelligence.</small></span></label></section>
    {error && <div className="setup-error" role="alert">{error}</div>}{saved && <p className="personalisation-saved" role="status">✓ Your data choices have been saved.</p>}
    <p className="setup-help">Consent version: {preferences.consentVersion || "Not recorded"}. Optional choices can be changed or withdrawn at any time.</p>
  </section></main>;
}
