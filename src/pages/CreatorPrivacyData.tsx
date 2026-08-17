import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { clearCommunityLocation, getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { PrivacyPreferences } from "../types/privacy";
import "../styles/CreatorTools.css";

const EMPTY: PrivacyPreferences = { consentVersion: "", communityLocation: false, anonymousAnalytics: false, productUpdates: false };

export default function CreatorPrivacyData() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void getPrivacyPreferences(user.uid).then((value) => { if (active) setPreferences(value); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Privacy settings could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function save(next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">) {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try { await savePrivacyPreferences(user.uid, next); setPreferences(await getPrivacyPreferences(user.uid)); setMessage("Privacy preferences saved."); }
    catch (e) { setError(e instanceof Error ? e.message : "Privacy preferences could not be saved."); }
    finally { setSaving(false); }
  }

  async function disableLocation() {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try { await clearCommunityLocation(user.uid); setPreferences(await getPrivacyPreferences(user.uid)); setMessage("Community location sharing disabled and location fields cleared."); }
    catch (e) { setError(e instanceof Error ? e.message : "Community location could not be cleared."); }
    finally { setSaving(false); }
  }

  return <main className="creator-admin-page">
    <header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🔐 Privacy & Data</h1><p>Account privacy controls and community-data policy. This screen contains privacy information only.</p></div><Link className="creator-global-card" to="/creator">← Creator Hub</Link></header>
    {message && <div className="creator-success" role="status">{message}</div>}{error && <div className="creator-error" role="alert">{error}</div>}
    {loading ? <div className="creator-loading">Loading privacy controls…</div> : <>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">CONSENT STATUS</span><h2>Current account permissions</h2><p>Consent version: {preferences.consentVersion || "Not recorded"}</p></div></div><div className="creator-global-grid">
        <article className="creator-global-card"><span>📊</span><label>Anonymous analytics</label><small>{preferences.anonymousAnalytics ? "Enabled" : "Disabled"}</small><button type="button" disabled={saving} onClick={() => void save({ ...preferences, anonymousAnalytics: !preferences.anonymousAnalytics })}>{preferences.anonymousAnalytics ? "Disable" : "Enable"}</button></article>
        <article className="creator-global-card"><span>📰</span><label>Product updates</label><small>{preferences.productUpdates ? "Enabled" : "Disabled"}</small><button type="button" disabled={saving} onClick={() => void save({ ...preferences, productUpdates: !preferences.productUpdates })}>{preferences.productUpdates ? "Disable" : "Enable"}</button></article>
        <article className="creator-global-card"><span>🌍</span><label>Community location</label><small>{preferences.communityLocation ? "Enabled" : "Disabled"}</small><p>{preferences.communityLocation && preferences.city && preferences.country ? `${preferences.city}, ${preferences.country}` : "No community location recorded."}</p>{preferences.communityLocation && <button type="button" disabled={saving} onClick={() => void disableLocation()}>Disable & clear location</button>}</article>
      </div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">LOCATION SAFETY</span><h2>Community Globe policy</h2><p>Community locations are intended to identify an approximate town/city and country only. Exact GPS coordinates and home addresses must never be displayed on the Creator Globe.</p></div></div></section>
    </>}
  </main>;
}
