import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { FOUNDING_FOLLOWER_CAMPAIGN, FOUNDING_FOLLOWER_PLATFORM_LABELS, type FoundingFollowerPlatform } from "../config/foundingFollowerReward";
import { formatClaimDate, subscribeToMyFoundingFollowerClaim, submitFoundingFollowerClaim, type FoundingFollowerClaim } from "../services/foundingFollowerRewardService";
import "../styles/foundingFollowerReward.css";

export default function FoundingFollowerReward() {
  const { user } = useAuth();
  const [claim, setClaim] = useState<FoundingFollowerClaim | null>(null);
  const [platform, setPlatform] = useState<FoundingFollowerPlatform>("facebook");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToMyFoundingFollowerClaim(user.uid, setClaim);
  }, [user?.uid]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const canSubmit = Boolean(file) && !busy && FOUNDING_FOLLOWER_CAMPAIGN.enabled;
  const statusText = useMemo(() => {
    if (!claim) return "";
    if (claim.status === "pending" || claim.status === "processing") return "Your screenshot is in the Creator review queue. We will update you when it is approved.";
    if (claim.status === "approved") return "Approved — your Titan Pro reward is active.";
    return claim.rejectionReason || "The screenshot did not provide enough evidence to verify the follow. You can submit a replacement screenshot.";
  }, [claim]);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitFoundingFollowerClaim(platform, file);
      setMessage("Claim submitted. Keep an eye on Tiny Titans notifications for the approval result.");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The screenshot could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  const expiry = claim?.status === "approved" ? formatClaimDate(claim.trialExpiresAt) : null;
  const canResubmit = claim?.status === "rejected" || !claim;

  return (
    <main className="tt-founding-page">
      <section className="tt-founding-hero">
        <span className="tt-founding-eyebrow">🦖 FOUNDING FOLLOWER REWARD</span>
        <h1>30 days of Titan Pro, on us.</h1>
        <p>Thank you for being part of Tiny Titans. Follow us on Facebook or Instagram, send us a screenshot proving the follow, and we will activate your free Titan Pro month after a quick Creator review.</p>
      </section>

      <section className="tt-founding-card">
        <div className="tt-founding-steps">
          <div><strong>1</strong><span>Follow Tiny Titans on Facebook or Instagram.</span></div>
          <div><strong>2</strong><span>Take a screenshot showing that you follow the Tiny Titans account/page.</span></div>
          <div><strong>3</strong><span>Upload it here. We review the image manually, then activate your reward.</span></div>
        </div>

        {claim && (
          <section className={`tt-founding-status tt-founding-status-${claim.status}`} role="status">
            <div>
              <span className="tt-founding-status-kicker">CURRENT CLAIM · {claim.status.toUpperCase()}</span>
              <h2>{claim.status === "approved" ? "🎁 Titan Pro is active" : claim.status === "rejected" ? "We need a clearer screenshot" : "Claim received"}</h2>
              <p>{statusText}</p>
              {claim.submittedAt && <small>Submitted {formatClaimDate(claim.submittedAt)} · {FOUNDING_FOLLOWER_PLATFORM_LABELS[claim.platform]}</small>}
              {expiry && <small>Reward active until {expiry}</small>}
            </div>
            {claim.status === "approved" && <Link to="/account/billing" className="tt-founding-button">View account access →</Link>}
          </section>
        )}

        {canResubmit && (
          <section className="tt-founding-form">
            <div className="tt-founding-form-header">
              <div>
                <span className="tt-founding-label">FOLLOW VERIFICATION</span>
                <h2>{claim ? "Replace your screenshot" : "Submit your screenshot"}</h2>
              </div>
              <span className="tt-founding-limit">JPG · PNG · WEBP · MAX 5 MB</span>
            </div>

            <div className="tt-founding-platforms" role="group" aria-label="Choose the social platform">
              {(FOUNDING_FOLLOWER_CAMPAIGN.platforms as FoundingFollowerPlatform[]).map((item) => (
                <button key={item} type="button" className={platform === item ? "is-selected" : ""} onClick={() => setPlatform(item)}>
                  <strong>{item === "facebook" ? "f" : "◎"}</strong>
                  <span>{FOUNDING_FOLLOWER_PLATFORM_LABELS[item]}</span>
                </button>
              ))}
            </div>

            <label className="tt-founding-upload">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setError(""); setMessage(""); setFile(event.target.files?.[0] || null); }} />
              <span className="tt-founding-upload-icon">📷</span>
              <strong>{file ? file.name : "Choose follow screenshot"}</strong>
              <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Show the Tiny Titans Facebook page or Instagram profile with the follow state visible."}</small>
            </label>

            {previewUrl && <img className="tt-founding-preview" src={previewUrl} alt="Preview of your follow verification screenshot" />}

            {message && <p className="tt-founding-message" role="status">{message}</p>}
            {error && <p className="tt-founding-error" role="alert">{error}</p>}

            <button type="button" className="tt-founding-primary" onClick={() => void submit()} disabled={!canSubmit}>
              {busy ? "Submitting…" : "Submit for Creator review"}
            </button>

            <p className="tt-founding-privacy">Please crop out unrelated personal information where practical. Tiny Titans only needs the part of the screenshot that shows the follow relationship.</p>
          </section>
        )}

        {!canResubmit && claim?.status === "approved" && (
          <div className="tt-founding-success">
            <strong>You're all set.</strong>
            <span>Your reward is already attached to this Tiny Titans account. No further action is needed.</span>
          </div>
        )}
      </section>
    </main>
  );
}
