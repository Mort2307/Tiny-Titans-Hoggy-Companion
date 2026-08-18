import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";

export const CONSENT_VERSION = "2026-08-18-privacy-location-v2";

type Props = { onAccepted: () => void };

type CoarseLocation = { city: string; country: string; areaId: string; latitude: number; longitude: number };
const CELL_SIZE_DEGREES = 0.05;

function coarseCell(latitude: number, longitude: number) { const latIndex = Math.floor(latitude / CELL_SIZE_DEGREES); const lngIndex = Math.floor(longitude / CELL_SIZE_DEGREES); return { areaId: `geo-${latIndex}-${lngIndex}`, latitude: Number(((latIndex + 0.5) * CELL_SIZE_DEGREES).toFixed(4)), longitude: Number(((lngIndex + 0.5) * CELL_SIZE_DEGREES).toFixed(4)) }; }
async function resolveCoarseLocation(latitude: number, longitude: number): Promise<CoarseLocation> { const cell = coarseCell(latitude, longitude); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`, { headers: { Accept: "application/json" } }); if (!response.ok) throw new Error("Unable to determine your approximate area."); const data = await response.json() as { address?: Record<string, string> }; const address = data.address ?? {}; const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county; const country = address.country; if (!city || !country) throw new Error("Your approximate area could not be identified."); return { city, country, ...cell }; }

const backdropStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(0, 0, 0, 0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };
const modalStyle: React.CSSProperties = { width: "min(680px, 100%)", maxHeight: "min(90vh, 820px)", overflowY: "auto", padding: "28px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.16)", background: "linear-gradient(145deg, #21102d 0%, #120b19 100%)", boxShadow: "0 30px 100px rgba(0,0,0,0.65)", color: "inherit" };

export default function DataPrivacyConsentModal({ onAccepted }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [customising, setCustomising] = useState(false);
  const [location, setLocation] = useState(Boolean(profile?.dataCollectionPreferences?.approximateLocation));
  const [analytics, setAnalytics] = useState(Boolean(profile?.dataCollectionPreferences?.analytics));
  const [updates, setUpdates] = useState(Boolean(profile?.dataCollectionPreferences?.productUpdates));
  const [city, setCity] = useState(profile?.approximateLocation?.city ?? "");
  const [country, setCountry] = useState(profile?.approximateLocation?.country ?? "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  async function saveChoices(next: { location: boolean; analytics: boolean; updates: boolean }) {
    if (!user) return;
    setError(""); setSaving(true);
    try {
      let approximateLocation = null as Record<string, unknown> | null;
      if (next.location) {
        let resolved: CoarseLocation | undefined;
        if (navigator.geolocation) { setLocating(true); try { const position = await new Promise<GeolocationPosition>((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }); }); resolved = await resolveCoarseLocation(position.coords.latitude, position.coords.longitude); } catch { resolved = undefined; } finally { setLocating(false); } }
        if (!resolved) {
          if (!city.trim() || !country.trim()) throw new Error("Allow approximate location access, or enter your city and country manually.");
          const existing = profile?.approximateLocation;
          const cell = existing?.areaId && existing.latitude !== undefined && existing.longitude !== undefined ? { areaId: existing.areaId, latitude: existing.latitude, longitude: existing.longitude } : { areaId: `manual-${city.trim().toLocaleLowerCase("en-GB")}-${country.trim().toLocaleLowerCase("en-GB")}`, latitude: 0, longitude: 0 };
          resolved = { city: city.trim(), country: country.trim(), ...cell };
        }
        approximateLocation = { city: resolved.city, country: resolved.country, source: "coarse-geolocation", visibleToCreator: true, areaId: resolved.areaId, latitude: resolved.latitude, longitude: resolved.longitude, updatedAt: serverTimestamp() };
      }
      await setDoc(doc(db, "users", user.uid), { dataCollectionPreferences: { approximateLocation: next.location, analytics: next.analytics, productUpdates: next.updates, consentVersion: CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, approximateLocation, updatedAt: serverTimestamp() }, { merge: true });
      await refreshProfile();
      window.localStorage.setItem(`tinytitans:privacy-consent:${user.uid}`, CONSENT_VERSION);
      onAccepted();
    } catch (saveError) { console.error("Tiny Titans: consent save failed", saveError); setError(saveError instanceof Error ? saveError.message : "Unable to save your data choices. Please try again."); }
    finally { setSaving(false); setLocating(false); }
  }

  return (
    <div className="privacy-consent-backdrop" style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="privacy-consent-title">
      <section className="privacy-consent-modal" style={modalStyle}>
        <p className="personalisation-eyebrow">TINY TITANS · YOUR CHOICE</p><h1 id="privacy-consent-title">🔐 Data &amp; Privacy</h1>
        <p className="privacy-consent-intro">Tiny Titans works without optional data sharing. You can make one simple choice now and change individual choices later from My Account → Data &amp; Privacy.</p>
        {!customising ? <>
          <div className="privacy-consent-option"><strong>🌍 Community location</strong><small>If enabled, your device location is immediately converted into a coarse privacy area. Tiny Titans does not store your raw GPS position. The Creator globe shows one aggregated marker for each area.</small></div>
          <div className="privacy-consent-option"><strong>📊 Anonymous product analytics</strong><small>Optional aggregated usage information that helps improve Tiny Titans.</small></div>
          <div className="privacy-consent-option"><strong>📣 Product updates</strong><small>Optional Tiny Titans feature and release updates.</small></div>
          {error && <div className="setup-error" role="alert">{error}</div>}
          <button className="setup-submit" type="button" onClick={() => void saveChoices({ location: true, analytics: true, updates: true })} disabled={saving}>{saving ? (locating ? "Finding your approximate area…" : "Saving your choices…") : "Accept Optional Data"}</button>
          <button className="creator-tool-button" type="button" onClick={() => void saveChoices({ location: false, analytics: false, updates: false })} disabled={saving}>Decline Optional Data</button>
          <button className="creator-tool-button" type="button" onClick={() => setCustomising(true)} disabled={saving}>Customise choices</button>
        </> : <>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={location} onChange={(event) => setLocation(event.target.checked)} disabled={saving} /><span><strong>🌍 Community location</strong><small>Uses a coarse privacy area rather than your exact GPS position. The globe aggregates users into one area marker.</small></span></label>{location && <div className="setup-location-fields"><label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Fallback: e.g. Peterborough" disabled={saving} /></label><label>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Fallback: e.g. United Kingdom" disabled={saving} /></label></div>}</div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} disabled={saving} /><span><strong>📊 Anonymous product analytics</strong><small>Aggregated usage and feature-performance information.</small></span></label></div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} disabled={saving} /><span><strong>📣 Product updates</strong><small>Optional Tiny Titans feature and release updates.</small></span></label></div>
          {error && <div className="setup-error" role="alert">{error}</div>}
          <button className="setup-submit" type="button" onClick={() => void saveChoices({ location, analytics, updates })} disabled={saving}>{saving ? "Saving…" : "Save Choices"}</button>
          <button className="creator-tool-button" type="button" onClick={() => setCustomising(false)} disabled={saving}>Back to simple choice</button>
        </>}
        <p className="setup-help">Optional choices can be withdrawn later. Core snake tracking remains available without optional sharing.</p>
      </section>
    </div>
  );
}