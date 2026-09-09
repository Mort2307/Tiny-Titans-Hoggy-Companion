import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import { savePrivacyPreferences } from "../services/privacyService";
import type { CommunityMessagingDeclineReason } from "../types/privacy";

export const CONSENT_VERSION = "2026-09-09-community-messaging-v5";

type Props = { onAccepted: () => void };
type CoarseLocation = { city: string; country: string; areaId: string; latitude: number; longitude: number };
const CELL_SIZE_DEGREES = 0.05;
const DECLINE_OPTIONS: Array<{ value: CommunityMessagingDeclineReason; label: string }> = [
  { value: "dont-want-messages", label: "I don't want messages" },
  { value: "privacy-concern", label: "I'm concerned about privacy" },
  { value: "dont-understand", label: "I don't understand what is collected" },
  { value: "dont-trust-messaging", label: "I don't trust online messaging" },
  { value: "other", label: "Other" },
];

function coarseCell(latitude: number, longitude: number) { const latIndex = Math.floor(latitude / CELL_SIZE_DEGREES); const lngIndex = Math.floor(longitude / CELL_SIZE_DEGREES); return { areaId: `geo-${latIndex}-${lngIndex}`, latitude: Number(((latIndex + 0.5) * CELL_SIZE_DEGREES).toFixed(4)), longitude: Number(((lngIndex + 0.5) * CELL_SIZE_DEGREES).toFixed(4)) }; }
async function resolveCoarseLocation(latitude: number, longitude: number): Promise<CoarseLocation> { const cell = coarseCell(latitude, longitude); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`, { headers: { Accept: "application/json" } }); if (!response.ok) throw new Error("Unable to determine your approximate area."); const data = await response.json() as { address?: Record<string, string> }; const address = data.address ?? {}; const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county; const country = address.country; if (!city || !country) throw new Error("Your approximate area could not be identified."); return { city, country, ...cell }; }

const backdropStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(0, 0, 0, 0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };
const modalStyle: React.CSSProperties = { width: "min(680px, 100%)", maxHeight: "min(90vh, 820px)", overflowY: "auto", padding: "28px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.16)", background: "linear-gradient(145deg, #21102d 0%, #120b19 100%)", boxShadow: "0 30px 100px rgba(0,0,0,0.65)", color: "inherit" };

export default function DataPrivacyConsentModal({ onAccepted }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [customising, setCustomising] = useState(false);
  const [location, setLocation] = useState(Boolean(profile?.dataCollectionPreferences?.approximateLocation));
  const [analytics, setAnalytics] = useState(Boolean(profile?.dataCollectionPreferences?.analytics));
  const [communityHusbandryData, setCommunityHusbandryData] = useState(false);
  const [communityMessaging, setCommunityMessaging] = useState(Boolean(profile?.dataCollectionPreferences?.communityMessaging));
  const [communityMessagingDeclineReason, setCommunityMessagingDeclineReason] = useState<CommunityMessagingDeclineReason | null>(null);
  const [communityMessagingDeclineReasonDetail, setCommunityMessagingDeclineReasonDetail] = useState("");
  const [updates, setUpdates] = useState(Boolean(profile?.dataCollectionPreferences?.productUpdates));
  const [city, setCity] = useState(profile?.approximateLocation?.city ?? "");
  const [country, setCountry] = useState(profile?.approximateLocation?.country ?? "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  async function saveChoices(next: { location: boolean; analytics: boolean; communityHusbandryData: boolean; communityMessaging: boolean; communityMessagingDeclineReason: CommunityMessagingDeclineReason | null; communityMessagingDeclineReasonDetail: string; updates: boolean }) {
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

      const consentRecord = { version: CONSENT_VERSION, acceptedAt: serverTimestamp() };
      await setDoc(doc(db, "users", user.uid), { privacyConsent: consentRecord, dataCollectionPreferences: { approximateLocation: next.location, analytics: next.analytics, communityHusbandryData: next.communityHusbandryData, communityMessaging: next.communityMessaging, communityMessagingDeclineReason: next.communityMessaging ? null : next.communityMessagingDeclineReason, communityMessagingDeclineReasonDetail: next.communityMessaging ? null : next.communityMessagingDeclineReasonDetail.slice(0, 500), productUpdates: next.updates, consentVersion: CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, approximateLocation, updatedAt: serverTimestamp() }, { merge: true });
      await savePrivacyPreferences(user.uid, { communityLocation: next.location, anonymousAnalytics: next.analytics, communityHusbandryData: next.communityHusbandryData, communityMessaging: next.communityMessaging, communityMessagingDeclineReason: next.communityMessaging ? null : next.communityMessagingDeclineReason, communityMessagingDeclineReasonDetail: next.communityMessaging ? null : next.communityMessagingDeclineReasonDetail, productUpdates: next.updates });
      window.localStorage.setItem(`tinytitans:privacy-consent:${user.uid}`, CONSENT_VERSION);
      await refreshProfile();
      onAccepted();
    } catch (saveError) { console.error("Tiny Titans: consent save failed", saveError); setError(saveError instanceof Error ? saveError.message : "Unable to save your data choices. Please try again."); }
    finally { setSaving(false); setLocating(false); }
  }

  const saveAll = () => void saveChoices({ location: true, analytics: true, communityHusbandryData: true, communityMessaging: true, communityMessagingDeclineReason: null, communityMessagingDeclineReasonDetail: "", updates: true });
  const saveNone = () => void saveChoices({ location: false, analytics: false, communityHusbandryData: false, communityMessaging: false, communityMessagingDeclineReason: communityMessagingDeclineReason ?? "privacy-concern", communityMessagingDeclineReasonDetail, updates: false });

  return (
    <div className="privacy-consent-backdrop" style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="privacy-consent-title">
      <section className="privacy-consent-modal" style={modalStyle}>
        <p className="personalisation-eyebrow">TINY TITANS · YOUR CHOICE</p><h1 id="privacy-consent-title">🔐 Data &amp; Privacy</h1>
        <p className="privacy-consent-intro">Tiny Titans works without optional data sharing. We ask separately about community interaction because comments and messages need a minimal account identity. Your core app remains yours either way.</p>
        {!customising ? <>
          <div className="privacy-consent-option"><strong>💬 Community conversations</strong><small>Comments and messages use your Firebase UID as an internal account identifier plus the community name you choose to display. They do not require your contacts, microphone, phone contents or exact GPS location.</small></div>
          <div className="privacy-consent-option"><strong>🌍 Community location</strong><small>If enabled, your device location is immediately converted into a coarse privacy area. Tiny Titans does not store your raw GPS position for the community map.</small></div>
          <div className="privacy-consent-option"><strong>📊 Anonymous product analytics</strong><small>Optional aggregated usage information that helps improve Tiny Titans.</small></div>
          <div className="privacy-consent-option"><strong>🐍 Community husbandry intelligence</strong><small>If enabled, your feeding, weight and shedding records can contribute anonymously to aggregate community statistics and the advanced Intelligence layer. Declining it does not disable the rest of the app.</small></div>
          <div className="privacy-consent-option"><strong>📣 Product updates</strong><small>Optional Tiny Titans feature and release updates.</small></div>
          {error && <div className="setup-error" role="alert">{error}</div>}
          <button className="setup-submit" type="button" onClick={saveAll} disabled={saving}>{saving ? (locating ? "Finding your approximate area…" : "Saving your choices…") : "Accept Optional Data"}</button>
          <button className="creator-tool-button" type="button" onClick={saveNone} disabled={saving}>Decline Optional Data</button>
          <button className="creator-tool-button" type="button" onClick={() => setCustomising(true)} disabled={saving}>Customise choices</button>
        </> : <>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={communityMessaging} onChange={(event) => setCommunityMessaging(event.target.checked)} disabled={saving} /><span><strong>💬 Community conversations</strong><small>Allows Community Hub comments and private messages with Tiny Titans. Only minimal account identity is attached to messages.</small></span></label>{!communityMessaging && <div className="setup-location-fields"><label>Why are you declining?<select value={communityMessagingDeclineReason ?? "privacy-concern"} onChange={(event) => setCommunityMessagingDeclineReason(event.target.value as CommunityMessagingDeclineReason)} disabled={saving}>{DECLINE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Anything else? <span>(optional)</span><textarea value={communityMessagingDeclineReasonDetail} onChange={(event) => setCommunityMessagingDeclineReasonDetail(event.target.value.slice(0, 500))} placeholder="Tell us what feels unclear or uncomfortable…" rows={3} maxLength={500} disabled={saving} /></label></div>}</div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={location} onChange={(event) => setLocation(event.target.checked)} disabled={saving} /><span><strong>🌍 Community location</strong><small>Uses a coarse privacy area rather than your exact GPS position. The globe aggregates users into area markers.</small></span></label>{location && <div className="setup-location-fields"><label>City<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Fallback: e.g. Peterborough" disabled={saving} /></label><label>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Fallback: e.g. United Kingdom" disabled={saving} /></label></div>}</div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} disabled={saving} /><span><strong>📊 Anonymous product analytics</strong><small>Aggregated usage and feature-performance information.</small></span></label></div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={communityHusbandryData} onChange={(event) => setCommunityHusbandryData(event.target.checked)} disabled={saving} /><span><strong>🐍 Community husbandry intelligence</strong><small>Allows eligible husbandry records to contribute anonymously to aggregate community intelligence.</small></span></label></div>
          <div className="privacy-consent-option"><label className="setup-check"><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} disabled={saving} /><span><strong>📣 Product updates</strong><small>Optional Tiny Titans feature and release updates.</small></span></label></div>
          {error && <div className="setup-error" role="alert">{error}</div>}
          <button className="setup-submit" type="button" onClick={() => void saveChoices({ location, analytics, communityHusbandryData, communityMessaging, communityMessagingDeclineReason, communityMessagingDeclineReasonDetail, updates })} disabled={saving}>{saving ? "Saving…" : "Save Choices"}</button>
          <button className="creator-tool-button" type="button" onClick={() => setCustomising(false)} disabled={saving}>Back to simple choice</button>
        </>}
        <p className="setup-help">Optional choices can be withdrawn later. Core snake tracking remains available without optional sharing. Your community-message choice is separate from the existing Titan Intelligence modifier.</p>
      </section>
    </div>
  );
}
