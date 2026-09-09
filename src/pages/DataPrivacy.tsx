import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { FULL_INTELLIGENCE_COPY } from "../services/intelligencePermissionGateService";
import { getPrivacyPreferences, savePrivacyPreferences } from "../services/privacyService";
import type { CommunityMessagingDeclineReason, PrivacyPreferences } from "../types/privacy";
import PageBackButton from "../components/PageBackButton";

const EMPTY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  communityMessaging: false,
  communityMessagingDeclineReason: null,
  communityMessagingDeclineReasonDetail: null,
  productUpdates: false,
};

const DECLINE_OPTIONS: Array<{ value: CommunityMessagingDeclineReason; label: string }> = [
  { value: "dont-want-messages", label: "I don't want messages" },
  { value: "privacy-concern", label: "I'm concerned about privacy" },
  { value: "dont-understand", label: "I don't understand what is collected" },
  { value: "dont-trust-messaging", label: "I don't trust online messaging" },
  { value: "other", label: "Other" },
];

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
  const messagingEnabled = preferences.communityMessaging === true;

  return <main className="page-container"><section className="personalisation-shell">
    <PageBackButton fallbackPath="/account" label="Back to My Account" />
    <p className="personalisation-eyebrow">My Account</p><h1>🔐 Data &amp; Privacy</h1>
    <p>Tiny Titans is designed around data minimisation: use the information needed for a feature, explain why it is used, and keep your choices reversible. Your snake records remain yours and the app remains usable without optional sharing.</p>

    <section className="personalisation-card">
      <h2>💬 Community conversations</h2>
      <p>Community comments and direct messages need to associate a message with the account that sent it. The feature uses your Tiny Titans account identifier (Firebase UID) and your chosen community display name. It does not need access to your contacts, phone contents, microphone or exact GPS location.</p>
      <label className="setup-check">
        <input
          type="checkbox"
          checked={messagingEnabled}
          onChange={(event) => void save({ ...preferences, communityMessaging: event.target.checked, communityMessagingDeclineReason: event.target.checked ? null : (preferences.communityMessagingDeclineReason ?? "privacy-concern") })}
          disabled={saving}
        />
        <span>
          <strong>{messagingEnabled ? "Community conversations: Enabled." : "Community conversations: Disabled."}</strong>
          <small>{messagingEnabled ? "You can comment on Community Hub posts and message Tiny Titans from the app." : "You can still use Tiny Titans normally, but Community Hub comments and direct messaging stay unavailable until you enable them."}</small>
        </span>
      </label>
      {!messagingEnabled && <div className="privacy-decline-panel">
        <strong>Why are you declining?</strong>
        <small>You do not have to explain. This helps us understand what feels unclear or uncomfortable.</small>
        <select
          value={preferences.communityMessagingDeclineReason ?? "privacy-concern"}
          onChange={(event) => void save({ ...preferences, communityMessaging: false, communityMessagingDeclineReason: event.target.value as CommunityMessagingDeclineReason })}
          disabled={saving}
        >
          {DECLINE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <textarea
          value={preferences.communityMessagingDeclineReasonDetail ?? ""}
          onChange={(event) => setPreferences((current) => ({ ...current, communityMessagingDeclineReasonDetail: event.target.value.slice(0, 500) }))}
          onBlur={() => void save({ ...preferences, communityMessaging: false, communityMessagingDeclineReason: preferences.communityMessagingDeclineReason ?? "privacy-concern", communityMessagingDeclineReasonDetail: preferences.communityMessagingDeclineReasonDetail ?? "" })}
          placeholder="Anything else you want us to understand? (optional)"
          rows={3}
          maxLength={500}
          disabled={saving}
        />
      </div>}
      <div className="setup-help"><strong>What Tiny Titans uses</strong><p>Your UID is an internal account identifier used to associate activity with the right account. A chosen username/display name can identify you in a community conversation. We do not treat a UID as a substitute for the legal protections that apply to personal data; it is simply a minimal identifier that helps the system work reliably.</p></div>
    </section>

    <section className="personalisation-card">
      <h2>🐍 Basic Keeper Mode</h2>
      <p><strong>Always available.</strong> When Intelligence is off, Tiny Titans still lets you add and manage snakes, record weights, feeding, shedding, behaviour, health and husbandry, use reminders, learning, morphs and breeding tools, and review your own records.</p>
      <p><strong>Basic means basic:</strong> with Intelligence off, your records are limited to <strong>basic record history and simple totals</strong>. Tiny Titans does not interpret them, correlate them, benchmark them, detect patterns or generate smart keeper insights while Intelligence is off.</p>
    </section>

    <section className="personalisation-card">
      <h2>🧠 Titan Intelligence</h2>
      <p>{FULL_INTELLIGENCE_COPY.body}</p>
      <label className="setup-check">
        <input type="checkbox" checked={intelligenceEnabled} onChange={(event) => void save({ ...preferences, communityHusbandryData: event.target.checked })} disabled={saving} />
        <span>
          <strong>{intelligenceEnabled ? "Titan Intelligence: Active." : "Titan Intelligence: Inactive."}</strong>
          <small>{intelligenceEnabled ? "Advanced individual intelligence and eligible community contribution are enabled while your consent remains on." : "Enable Titan Intelligence to unlock advanced individual intelligence and community knowledge by choosing to contribute eligible husbandry data."}</small>
        </span>
      </label>
      <div className="setup-help">
        <strong>{intelligenceEnabled ? "What you unlock" : "What stays locked"}</strong>
        <p>{intelligenceEnabled ? "Intelligent trends, correlations, anomaly detection, individual benchmarking, intelligence memory/timeline and community intelligence can operate while your consent is enabled." : "Smart trends, correlations, anomaly detection, benchmarking, intelligence memory/timeline and community intelligence remain paused. Your basic records are not deleted or restricted."}</p>
      </div>
      <button className="account-button account-button--highlight" type="button" onClick={() => navigate("/account/intelligence")}>🧠 {intelligenceEnabled ? "Open Intelligence Dashboard" : "View Intelligence & Why Opt In"} →</button>
    </section>

    <section className="personalisation-card"><h2>📊 Anonymous product analytics</h2><p>Optional aggregated usage and feature-performance information used to improve Tiny Titans. This is separate from Titan Intelligence.</p><label className="setup-check"><input type="checkbox" checked={preferences.anonymousAnalytics} onChange={(event) => void save({ ...preferences, anonymousAnalytics: event.target.checked })} disabled={saving} /><span><strong>Allow anonymous product analytics</strong><small>You can switch this off later.</small></span></label></section>
    <section className="personalisation-card"><h2>🌍 Community location</h2><p>Optional approximate community location. Tiny Titans should use a coarse area rather than expose an exact home position.</p><label className="setup-check"><input type="checkbox" checked={preferences.communityLocation} onChange={(event) => void save({ ...preferences, communityLocation: event.target.checked })} disabled={saving} /><span><strong>Show my approximate area on the community map</strong><small>Community location is separate from husbandry intelligence.</small></span></label></section>
    <section className="personalisation-card"><h2>📣 Product updates</h2><p>Optional Tiny Titans feature and release updates.</p><label className="setup-check"><input type="checkbox" checked={preferences.productUpdates} onChange={(event) => void save({ ...preferences, productUpdates: event.target.checked })} disabled={saving} /><span><strong>Receive product updates</strong><small>This does not control app tracking or Intelligence.</small></span></label></section>
    {error && <div className="setup-error" role="alert">{error}</div>}{saved && <p className="personalisation-saved" role="status">✓ Your data choices have been saved.</p>}
    <p className="setup-help">Consent version: {preferences.consentVersion || "Not recorded"}. Optional choices can be changed or withdrawn at any time.</p>
  </section></main>;
}
