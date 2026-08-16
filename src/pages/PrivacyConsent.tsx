import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivacyConsent() {
  const { user, profile, completeRequiredConsent } = useAuth();
  const navigate = useNavigate();
  const [requiredAccepted, setRequiredAccepted] = useState(false);
  const [optionalAnalytics, setOptionalAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!user || !requiredAccepted || saving) return;
    setSaving(true);
    setError(null);
    try {
      await completeRequiredConsent({ optionalAnalytics });
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Tiny Titans: unable to save privacy consent", err);
      setError("We couldn't save your privacy choices. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user || !profile) return null;

  return (
    <main className="page-container" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="welcome-card" style={{ width: "min(760px, 100%)" }} aria-labelledby="privacy-consent-title">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <h1 id="privacy-consent-title">Tiny Titans Privacy & Permissions</h1>
        <p>
          Before you enter Tiny Titans, please review and confirm the data choices required for your account.
          We only want the information needed to run and improve the app.
        </p>

        <div style={{ display: "grid", gap: 12, margin: "24px 0" }}>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={requiredAccepted} onChange={(event) => setRequiredAccepted(event.target.checked)} />
            <span>
              <strong>Required app data consent</strong><br />
              I understand that Tiny Titans may process the account, app activity and diagnostics data required to provide, secure and operate the service.
            </span>
          </label>

          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={optionalAnalytics} onChange={(event) => setOptionalAnalytics(event.target.checked)} />
            <span>
              <strong>Optional analytics</strong><br />
              Allow aggregated usage analytics to help improve Tiny Titans. This is optional and can be changed later.
            </span>
          </label>
        </div>

        <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.06)", marginBottom: 20 }}>
          <strong>Community location data</strong>
          <p style={{ marginBottom: 0 }}>
            Where location data is enabled, community analytics use coarse country/city information only. Tiny Titans does not use this feature to expose home addresses or precise GPS locations.
          </p>
        </div>

        <p style={{ fontSize: 14, opacity: 0.8 }}>
          You can review and change your choices later from Settings → Privacy & Permissions.
        </p>

        {error && <p role="alert" style={{ color: "#ff8b8b" }}>{error}</p>}

        <button type="button" disabled={!requiredAccepted || saving} onClick={handleContinue} style={{ width: "100%", padding: "14px 18px", fontSize: 16 }}>
          {saving ? "Saving choices…" : "Accept & Continue"}
        </button>
      </section>
    </main>
  );
}
