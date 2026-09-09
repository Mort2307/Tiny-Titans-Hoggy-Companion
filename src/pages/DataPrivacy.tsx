import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { FULL_INTELLIGENCE_COPY } from "../services/intelligencePermissionGateService";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { PrivacyPreferences } from "../types/privacy";
import PageBackButton from "../components/PageBackButton";

const EMPTY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  personalIntelligence: false,
  communityContribution: false,
  communityIntelligence: false,
  communityMessaging: false,
  communityMessagingDeclineReason: null,
  communityMessagingDeclineReasonDetail: null,
  productUpdates: false,
};

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

  const personalIntelligence = preferences.personalIntelligence === true || preferences.communityHusbandryData === true;

  return <main className="page-container"><section className="personalisation-shell">
    <PageBackButton fallbackPath="/account" label="Back to My Account" />
    <p className="personalisation-eyebrow">My Account</p><h1>🔐 Data &amp; Privacy</h1>
    <p>Your snake records remain yours and the app remains fully usable either way. Privacy choices control which optional systems may use eligible records. Evidence quantity changes confidence; it never changes whether a keeper with one snake can use Intelligence.</p>

    <section className="personalisation-card">
      <h2>🐍 Basic Keeper Mode</h2>
      <p><strong>Always available.</strong> You can add and manage snakes, record weights, feeding, shedding, behaviour, health and husbandry, use reminders, learning, morphs and breeding tools, and review your own records without optional intelligence sharing.</p>
    </section>

    <section className="personalisation-card">
      <h2>🧠 Personal Titan Intelligence</h2>
      <p>{FULL_INTELLIGENCE_COPY.body}</p>
      <label className="setup-check">
        <input type="checkbox" checked={personalIntelligence} onChange={(event) => void save({ ...preferences, personalIntelligence: event.target.checked, communityHusbandryData: preferences.communityHusbandryData })} disabled={saving} />
        <span><strong>{personalIntelligence ? "Personal Intelligence: Active." : "Personal Intelligence: Inactive."}</strong><small>Growth, behaviour, husbandry, genetics, timeline, anomaly and cross-domain intelligence can use your eligible records. A one-snake keeper is not down-ranked for having a smaller dataset.</small></span>
      </label>
    </section>

    <section className="personalisation-card">
      <h2>🌱 Community Intelligence contribution</h2>
      <p>Your eligible records can strengthen anonymous community knowledge. A keeper with one snake contributes when they opt in. The five-contributor rule only controls when an aggregate benchmark is safe to publish; it never blocks your contribution from entering the learning pool.</p>
      <label className="setup-check"><input type="checkbox" checked={preferences.communityContribution} onChange={(event) => void save({ ...preferences, communityContribution: event.target.checked, communityHusbandryData: event.target.checked })} disabled={saving} /><span><strong>{preferences.communityContribution ? "Community contribution: Active." : "Community contribution: Off."}</strong><small>Only aggregate learning signals leave the private record boundary. Individual snake records, names, notes, photos and exact locations are not community output.</small></span></label>
    </section>

    <section className="personalisation-card">
      <h2>🌐 Community Intelligence access</h2>
      <p>Allow Tiny Titans to show you responsible aggregate community intelligence when the independent-cohort safeguards are met.</p>
      <label className="setup-check"><input type="checkbox" checked={preferences.communityIntelligence} onChange={(event) => void save({ ...preferences, communityIntelligence: event.target.checked })} disabled={saving} /><span><strong>{preferences.communityIntelligence ? "Community Intelligence: Active." : "Community Intelligence: Off."}</strong><small>This control does not change your personal records or community contribution permission.</small></span></label>
      <button className="account-button account-button--highlight" type="button" onClick={() => navigate("/account/intelligence")}>🧠 Open Intelligence Dashboard →</button>
    </section>

    <section className="personalisation-card">
      <h2>💬 Community Messaging &amp; Comments</h2>
      <p>Community reading remains available without this permission. Enabling it lets you comment on official Community Hub posts and participate in the existing conversation workspace.</p>
      <label className="setup-check"><input type="checkbox" checked={preferences.communityMessaging} onChange={(event) => void save({ ...preferences, communityMessaging: event.target.checked, communityMessagingDeclineReason: event.target.checked ? null : (preferences.communityMessagingDeclineReason ?? "dont-want-messages") })} disabled={saving} /><span><strong>{preferences.communityMessaging ? "Community Messaging: Active." : "Community Messaging: Off."}</strong><small>Only your chosen community display name is shown beside a comment. No contact list, microphone or phone content is required.</small></span></label>
    </section>

    <section className="personalisation-card"><h2>📊 Anonymous product analytics</h2><p>Optional aggregated usage and feature-performance information used to improve Tiny Titans. This is separate from Titan Intelligence.</p><label className="setup-check"><input type="checkbox" checked={preferences.anonymousAnalytics} onChange={(event) => void save({ ...preferences, anonymousAnalytics: event.target.checked })} disabled={saving} /><span><strong>Allow anonymous product analytics</strong><small>You can switch this off later.</small></span></label></section>
    <section className="personalisation-card"><h2>🌍 Community location</h2><p>Optional approximate community location. Tiny Titans uses a coarse area rather than exposing an exact home position.</p><label className="setup-check"><input type="checkbox" checked={preferences.communityLocation} onChange={(event) => void save({ ...preferences, communityLocation: event.target.checked })} disabled={saving} /><span><strong>Show my approximate area on the community map</strong><small>Community location is separate from Intelligence and messaging.</small></span></label></section>
    <section className="personalisation-card"><h2>📣 Product updates</h2><p>Optional Tiny Titans feature and release updates.</p><label className="setup-check"><input type="checkbox" checked={preferences.productUpdates} onChange={(event) => void save({ ...preferences, productUpdates: event.target.checked })} disabled={saving} /><span><strong>Receive product updates</strong><small>This does not control your core snake records.</small></span></label></section>
    {error && <div className="setup-error" role="alert">{error}</div>}{saved && <p className="personalisation-saved" role="status">✓ Your data choices have been saved.</p>}
    <p className="setup-help">Consent version: {preferences.consentVersion || "Not recorded"}. Optional choices can be changed or withdrawn at any time.</p>
  </section></main>;
}
