import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPrivacyPreferences, savePrivacyPreferences, type PrivacyPreferences } from "../services/privacyService";
import "../styles/CreatorTools.css";

const EMPTY: PrivacyPreferences = { analyticsConsent: false, locationConsent: false, requiredConsentAccepted: false };

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
    void getPrivacyPreferences(user.uid).then((value) => {
      if (active && value) setPreferences(value);
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : "Privacy settings could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function save(next: PrivacyPreferences) {
    if (!user) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await savePrivacyPreferences(user.uid, next);
      setPreferences(next);
      setMessage("Privacy preferences saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Privacy preferences could not be saved.");
    } finally { setSaving(false); }
  }

  return <main className="creator-admin-page">
    <header className="creator-admin-header">
      <div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🔐 Privacy & Data</h1><p>Review the privacy controls that affect Tiny Titans data collection and community features.</p></div>
      <Link className="creator-global-card" to="/creator">← Creator Hub</Link>
    </header>
    {message && <div className="creator-success" role="status">{message}</div>}
    {error && <div className="creator-error" role="alert">{error}</div>}
    {loading ? <div className="creator-loading">Loading privacy controls…</div> : <>
      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">CURRENT CONSENT</span><h2>Data collection controls</h2><p>These controls are account-specific. Changing them affects future collection; existing records are handled according to the app's privacy/data-retention rules.</p></div></div>
        <div className="creator-global-grid">
          <article className="creator-global-card"><span>📊</span><label>Analytics</label><small>{preferences.analyticsConsent ? "Enabled" : "Disabled"}</small><button type="button" disabled={saving} onClick={() => void save({ ...preferences, analyticsConsent: !preferences.analyticsConsent })}>{preferences.analyticsConsent ? "Disable analytics" : "Enable analytics"}</button></article>
          <article className="creator-global-card"><span>🌍</span><label>Community location</label><small>{preferences.locationConsent ? "Enabled" : "Disabled"}</small><p>Community location is intended to be approximate and never exposes an address or exact GPS position.</p><button type="button" disabled={saving} onClick={() => void save({ ...preferences, locationConsent: !preferences.locationConsent })}>{preferences.locationConsent ? "Disable location sharing" : "Enable location sharing"}</button></article>
          <article className="creator-global-card"><span>🔐</span><label>Required consent</label><small>{preferences.requiredConsentAccepted ? "Accepted" : "Not accepted"}</small><p>Required privacy consent controls access to the protected app.</p></article>
        </div>
      </section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">LOCATION POLICY</span><h2>Community Globe safety</h2><p>Tiny Titans should only retain the minimum community-location representation required for the Globe. Exact home addresses and raw GPS coordinates must not be displayed publicly.</p></div></div></section>
    </>}
  </main>;
}
