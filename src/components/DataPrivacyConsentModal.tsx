import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";

export const CONSENT_VERSION = "2026-08-16-location-analytics-v1";

type Props = { onAccepted: () => void };

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 99999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "rgba(0, 0, 0, 0.78)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const modalStyle: React.CSSProperties = {
  width: "min(680px, 100%)",
  maxHeight: "min(90vh, 820px)",
  overflowY: "auto",
  padding: "28px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(145deg, #21102d 0%, #120b19 100%)",
  boxShadow: "0 30px 100px rgba(0,0,0,0.65)",
  color: "inherit",
};

export default function DataPrivacyConsentModal({ onAccepted }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [location, setLocation] = useState(Boolean(profile?.dataCollectionPreferences?.approximateLocation));
  const [analytics, setAnalytics] = useState(Boolean(profile?.dataCollectionPreferences?.analytics));
  const [updates, setUpdates] = useState(Boolean(profile?.dataCollectionPreferences?.productUpdates));
  const [city, setCity] = useState(profile?.approximateLocation?.city ?? "");
  const [country, setCountry] = useState(profile?.approximateLocation?.country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function acceptChoices() {
    if (!user) return;
    setError("");

    if (location && (!city.trim() || !country.trim())) {
      setError("Enter your city and country to enable the community map, or leave community location turned off.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        dataCollectionPreferences: {
          approximateLocation: location,
          analytics,
          productUpdates: updates,
          consentVersion: CONSENT_VERSION,
          consentUpdatedAt: serverTimestamp(),
        },
        approximateLocation: location
          ? {
              city: city.trim(),
              country: country.trim(),
              source: "user-provided",
              visibleToCreator: true,
              updatedAt: serverTimestamp(),
            }
          : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await refreshProfile();
      onAccepted();
    } catch (saveError) {
      console.error("Tiny Titans: consent save failed", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save your data choices. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="privacy-consent-backdrop"
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <section className="privacy-consent-modal" style={modalStyle}>
        <p className="personalisation-eyebrow">TINY TITANS · YOUR CHOICE</p>
        <h1 id="privacy-consent-title">🔐 Data &amp; Privacy</h1>
        <p className="privacy-consent-intro">
          Before you continue, choose which optional data Tiny Titans may collect. Core reptile tracking works without these optional permissions.
        </p>

        <div className="privacy-consent-option">
          <label className="setup-check">
            <input type="checkbox" checked={location} onChange={(event) => setLocation(event.target.checked)} disabled={saving} />
            <span>
              <strong>🌍 Community location</strong>
              <small>Optional. If enabled, only the city and country you provide are used for aggregated community maps. No home address or exact GPS position is collected for this feature.</small>
            </span>
          </label>
          {location && (
            <div className="setup-location-fields">
              <label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Peterborough" disabled={saving} /></label>
              <label>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g. United Kingdom" disabled={saving} /></label>
            </div>
          )}
        </div>

        <div className="privacy-consent-option">
          <label className="setup-check">
            <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} disabled={saving} />
            <span><strong>📊 Anonymous product analytics</strong><small>Optional aggregated usage and feature-performance information used to improve Tiny Titans.</small></span>
          </label>
        </div>

        <div className="privacy-consent-option">
          <label className="setup-check">
            <input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} disabled={saving} />
            <span><strong>📣 Product updates</strong><small>Optional Tiny Titans feature, release and important product updates.</small></span>
          </label>
        </div>

        {error && <div className="setup-error" role="alert">{error}</div>}

        <button className="setup-submit" type="button" onClick={() => void acceptChoices()} disabled={saving}>
          {saving ? "Saving your choices…" : "Accept & Continue"}
        </button>

        <p className="setup-help">You can change or withdraw these choices later from My Account → Data &amp; Privacy.</p>
      </section>
    </div>
  );
}
