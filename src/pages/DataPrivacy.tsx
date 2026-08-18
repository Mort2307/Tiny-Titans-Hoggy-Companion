import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import PageBackButton from "../components/PageBackButton";

const CONSENT_VERSION = "2026-08-18-privacy-location-v2";

type Preferences = {
  approximateLocation: boolean;
  analytics: boolean;
  productUpdates: boolean;
  consentVersion: string;
  consentUpdatedAt?: unknown;
};

export default function DataPrivacy() {
  const { user, profile, refreshProfile } = useAuth();
  const current = profile?.dataCollectionPreferences;
  const [location, setLocation] = useState(Boolean(current?.approximateLocation));
  const [analytics, setAnalytics] = useState(Boolean(current?.analytics));
  const [updates, setUpdates] = useState(Boolean(current?.productUpdates));
  const [city, setCity] = useState(profile?.approximateLocation?.city ?? "");
  const [country, setCountry] = useState(profile?.approximateLocation?.country ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    if (!user) { setError("You need to be signed in to save your data choices."); return; }
    if (location && (!city.trim() || !country.trim())) { setError("Allow location access during consent, or enter your city and country to keep community location enabled."); return; }
    setSaving(true);
    try {
      const preferences: Preferences = {
        approximateLocation: location,
        analytics,
        productUpdates: updates,
        consentVersion: CONSENT_VERSION,
        consentUpdatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", user.uid), {
        dataCollectionPreferences: preferences,
        approximateLocation: location ? {
          city: city.trim(),
          country: country.trim(),
          source: profile?.approximateLocation?.source ?? "user-provided",
          visibleToCreator: true,
          ...(profile?.approximateLocation?.areaId ? { areaId: profile.approximateLocation.areaId } : {}),
          ...(profile?.approximateLocation?.latitude !== undefined ? { latitude: profile.approximateLocation.latitude } : {}),
          ...(profile?.approximateLocation?.longitude !== undefined ? { longitude: profile.approximateLocation.longitude } : {}),
          updatedAt: serverTimestamp(),
        } : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await refreshProfile();
      setSaved(true);
    } catch (saveError) {
      console.error("Tiny Titans: data privacy save failed", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save your privacy choices.");
    } finally { setSaving(false); }
  }

  function setAll(value: boolean) {
    setLocation(value); setAnalytics(value); setUpdates(value); setSaved(false); setError("");
  }

  return <main className="page-container"><section className="personalisation-shell">
    <PageBackButton fallbackPath="/account" label="Back to My Account" />
    <p className="personalisation-eyebrow">My Account</p>
    <h1>🔐 Data &amp; Privacy</h1>
    <p>Core snake tracking does not require optional sharing. You can change everything with one switch or manage each choice separately.</p>

    <section className="personalisation-card"><h2>Quick choice</h2><p>These buttons control all optional Tiny Titans data sharing.</p>
      <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <button className="setup-submit" type="button" onClick={() => setAll(true)} disabled={saving}>Accept Optional Data</button>
        <button className="creator-tool-button" type="button" onClick={() => setAll(false)} disabled={saving}>Decline Optional Data</button>
      </div>
    </section>

    <form onSubmit={save}>
      <section className="personalisation-card"><h2>🌍 Community location</h2><p>When enabled, the initial device location is immediately converted into a coarse privacy area. Tiny Titans does not persist the raw GPS position. The Creator globe shows one aggregated marker for the area.</p>
        <label className="setup-check"><input type="checkbox" checked={location} onChange={(event) => setLocation(event.target.checked)} disabled={saving} /><span><strong>Show my approximate area on the community map</strong><small>Individual identities and exact positions are not shown on the globe.</small></span></label>
        {location && <div className="setup-location-fields"><label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Peterborough" disabled={saving} /></label><label>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g. United Kingdom" disabled={saving} /></label></div>}
      </section>
      <section className="personalisation-card"><h2>📊 Anonymous product analytics</h2><p>Optional aggregated usage and feature-performance information used to improve Tiny Titans.</p><label className="setup-check"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} disabled={saving} /><span><strong>Allow anonymous product analytics</strong><small>You can switch this off later.</small></span></label></section>
      <section className="personalisation-card"><h2>📣 Product updates</h2><p>Optional Tiny Titans feature, release and important product updates.</p><label className="setup-check"><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} disabled={saving} /><span><strong>Receive product updates</strong><small>This is separate from community location and analytics.</small></span></label></section>
      {error && <div className="setup-error" role="alert">{error}</div>}
      {saved && <p className="personalisation-saved">✓ Your data choices have been saved.</p>}
      <button className="setup-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Data & Privacy Choices"}</button>
      <p className="setup-help">Consent version: {current?.consentVersion ?? CONSENT_VERSION}. Optional choices can be withdrawn at any time.</p>
    </form>
  </section></main>;
}
