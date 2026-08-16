import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { captureApproximateCommunityLocation, type ApproximateCommunityLocation } from "../services/communityLocationService";

export default function PrivacyConsent() {
  const { user, profile, completeRequiredConsent } = useAuth();
  const navigate = useNavigate();
  const [requiredAccepted, setRequiredAccepted] = useState(false);
  const [optionalAnalytics, setOptionalAnalytics] = useState(false);
  const [communityLocation, setCommunityLocation] = useState(false);
  const [location, setLocation] = useState<ApproximateCommunityLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLocationToggle(enabled: boolean) {
    setCommunityLocation(enabled); setError(null);
    if (!enabled) { setLocation(null); return; }
    setLocating(true);
    try { setLocation(await captureApproximateCommunityLocation()); }
    catch (err) { setCommunityLocation(false); setLocation(null); setError(err instanceof Error ? err.message : "We couldn't determine your approximate community location."); }
    finally { setLocating(false); }
  }

  async function handleContinue() {
    if (!user || !requiredAccepted || saving || locating) return;
    setSaving(true); setError(null);
    try { await completeRequiredConsent({ optionalAnalytics, communityLocation, city: location?.city, country: location?.country, approxLat: location?.approxLat, approxLng: location?.approxLng }); navigate("/", { replace: true }); }
    catch (err) { console.error("Tiny Titans: unable to save privacy consent", err); setError("We couldn't save your privacy choices. Please try again."); }
    finally { setSaving(false); }
  }
  if (!user || !profile) return null;
  return <main className="page-container" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section className="welcome-card" style={{ width: "min(760px, 100%)" }} aria-labelledby="privacy-consent-title"><div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div><h1 id="privacy-consent-title">Tiny Titans Privacy & Permissions</h1><p>Before you enter Tiny Titans, please review and confirm the data choices required for your account. Optional community location is requested separately and can be changed later.</p><div style={{ display: "grid", gap: 12, margin: "24px 0" }}>
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={requiredAccepted} onChange={(event) => setRequiredAccepted(event.target.checked)} /><span><strong>Required app data consent</strong><br />I understand that Tiny Titans may process the account, app activity and diagnostics data required to provide, secure and operate the service.</span></label>
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={optionalAnalytics} onChange={(event) => setOptionalAnalytics(event.target.checked)} /><span><strong>Optional analytics</strong><br />Allow aggregated usage analytics to help improve Tiny Titans. This is optional and can be changed later.</span></label>
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={communityLocation} disabled={locating} onChange={(event) => void handleLocationToggle(event.target.checked)} /><span><strong>🌍 Community Globe location</strong><br />Allow Tiny Titans to use your device location to determine your approximate town/city and country for the community globe. <strong>We never store your raw GPS coordinates or address.</strong>{location && <><br /><span style={{ opacity: 0.85 }}>Community area detected: {location.city}, {location.country}. Public map position is rounded to approximately 0.1° (roughly 5–7 miles in the UK).</span></>}{locating && <><br /><span>Requesting device location…</span></>}</span></label>
  </div><div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.06)", marginBottom: 20 }}><strong>Location privacy</strong><p style={{ marginBottom: 0 }}>The globe uses a rounded community position rather than your precise device position. You can turn participation off later from your privacy settings.</p></div><p style={{ fontSize: 14, opacity: 0.8 }}>You can review and change your choices later from Settings → Privacy & Permissions.</p>{error && <p role="alert" style={{ color: "#ff8b8b" }}>{error}</p>}<button type="button" disabled={!requiredAccepted || saving || locating} onClick={handleContinue} style={{ width: "100%", padding: "14px 18px", fontSize: 16 }}>{saving ? "Saving choices…" : "Accept & Continue"}</button></section></main>;
}
