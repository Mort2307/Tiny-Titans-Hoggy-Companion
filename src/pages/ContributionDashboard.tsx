import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { Snake } from "../types/Snake";
import type { PrivacyPreferences } from "../types/privacy";

const EMPTY: PrivacyPreferences = { consentVersion: "", communityLocation: false, anonymousAnalytics: false, communityHusbandryData: false, productUpdates: false };

export default function ContributionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(EMPTY);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) { setLoading(false); return () => { active = false; }; }
    void Promise.all([getPrivacyPreferences(user.uid), getUserSnakes(user.uid)])
      .then(([privacy, loadedSnakes]) => { if (!active) return; setPreferences(privacy); setSnakes(loadedSnakes); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Contribution data could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const counts = useMemo(() => ({
    snakes: snakes.length,
    weights: snakes.reduce((total, snake) => total + (snake.weightHistory?.length ?? 0), 0),
    feedings: snakes.reduce((total, snake) => total + (snake.feedingHistory?.length ?? 0), 0),
    sheds: snakes.reduce((total, snake) => total + (snake.shedHistory?.length ?? 0), 0),
  }), [snakes]);

  async function toggleContribution() {
    if (!user || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const next = !preferences.communityHusbandryData;
      await savePrivacyPreferences(user.uid, {
        communityLocation: preferences.communityLocation,
        anonymousAnalytics: preferences.anonymousAnalytics,
        communityHusbandryData: next,
        productUpdates: preferences.productUpdates,
        ...(preferences.city ? { city: preferences.city } : {}),
        ...(preferences.country ? { country: preferences.country } : {}),
      });
      setPreferences(await getPrivacyPreferences(user.uid));
      setMessage(next ? "Intelligence contribution is now active. Your eligible records can help power Tiny Titans intelligence." : "Intelligence contribution is now off. No new eligible records will be contributed while it is disabled.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your contribution choice could not be saved.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="page-container"><section className="personalisation-shell"><p className="personalisation-eyebrow">Tiny Titans Intelligence</p><h1>🧠 Contribution Dashboard</h1><div className="personalisation-card"><p>Loading your contribution data…</p></div></section></main>;

  return <main className="page-container"><section className="personalisation-shell">
    <button className="personalisation-back" type="button" onClick={() => navigate(-1)}>← Back</button>
    <p className="personalisation-eyebrow">Tiny Titans Intelligence</p>
    <h1>🧠 Your Contribution</h1>
    <p>Everyone keeps access to core tracking. This dashboard shows what your optional participation contributes to the Tiny Titans intelligence layer.</p>
    <section className="personalisation-card"><h2>{preferences.communityHusbandryData ? "🟢 Intelligence contribution: ACTIVE" : "⚪ Intelligence contribution: OFF"}</h2><p>{preferences.communityHusbandryData ? "Your eligible husbandry records may be used in anonymised aggregate intelligence. Individual snake records are not published as community statistics." : "Your personal tracking remains fully available. Advanced community intelligence contribution is disabled until you choose to participate."}</p><button className="personalisation-save" type="button" onClick={() => void toggleContribution()} disabled={saving}>{saving ? "Saving…" : preferences.communityHusbandryData ? "Stop contributing optional data" : "Enable Intelligence contribution"}</button>{message && <p className="personalisation-saved" role="status">✓ {message}</p>}{error && <div className="setup-error" role="alert">{error}</div>}</section>
    <section className="personalisation-card"><h2>📊 Your contribution at a glance</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>{[[counts.snakes,"Snakes tracked"],[counts.weights,"Weight records"],[counts.feedings,"Feeding records"],[counts.sheds,"Shed records"]].map(([value,label]) => <div key={String(label)} style={{ padding: "16px", borderRadius: "14px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}><strong style={{ display: "block", fontSize: "1.8rem" }}>{value}</strong><span>{label}</span></div>)}</div><p style={{ opacity: .7, marginBottom: 0 }}>These counts describe records stored in your personal trackers. They are not automatically displayed to other users as raw personal records.</p></section>
    <section className="personalisation-card"><h2>🧠 What your contribution helps improve</h2><div style={{ display: "grid", gap: "10px" }}><div>📈 <strong>Growth patterns</strong><br /><small>Helps identify useful weight trends across comparable records.</small></div><div>🍽️ <strong>Feeding patterns</strong><br /><small>Helps Tiny Titans understand feeding intervals and recorded husbandry patterns.</small></div><div>🐍 <strong>Shed patterns</strong><br /><small>Helps build better population-level understanding of shedding intervals.</small></div><div>🤖 <strong>Future intelligence</strong><br /><small>More quality records allow better aggregate benchmarks and pattern detection over time.</small></div></div></section>
    <section className="personalisation-card"><h2>🔒 Privacy by design</h2><ul><li>Your individual snake names are not community statistics.</li><li>Your personal tracker history remains in your account.</li><li>Participation can be withdrawn at any time.</li><li>Only eligible, consented data should enter community intelligence.</li></ul><button className="personalisation-link" type="button" onClick={() => navigate("/account/data-privacy")}>Manage all Data &amp; Privacy choices →</button></section>
  </section></main>;
}
