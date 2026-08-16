import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitFounderApplication } from "../services/creatorService";
import PageBackButton from "../components/PageBackButton";
import "../styles/CreatorTools.css";

export default function Founder() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [experience, setExperience] = useState("");
  const [contribution, setContribution] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !reason.trim() || !experience.trim()) return;
    setSending(true);
    setError("");
    try {
      await submitFounderApplication({
        uid: user.uid,
        email: user.email ?? "",
        displayName: profile?.displayName ?? user.displayName ?? "",
        reason: reason.trim(),
        experience: experience.trim(),
        contribution: contribution.trim(),
      });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your Founder application.");
    } finally {
      setSending(false);
    }
  }

  return <section className="creator-tools-page"><PageBackButton fallbackPath="/account" label="Back to My Account" /><div className="creator-tools-card">
    <div className="creator-tools-header"><span>👑</span><div><h1>Become a Founder</h1><p>Help shape Tiny Titans from the ground up.</p></div></div>
    <div className="creator-founder-grid"><div><h2>Founder access</h2><p>Founders are early supporters who help test features, challenge the genetics database, report bugs and influence what Tiny Titans becomes.</p><ul><li>Founder recognition inside Tiny Titans</li><li>Early access to selected new features</li><li>A direct voice in product development</li><li>Priority consideration for future Founder-only features</li></ul></div><div className="creator-founder-callout"><strong>Founder status is reviewed.</strong><span>Submitting an application does not automatically grant elevated permissions.</span></div></div>
    {sent ? <div className="creator-success"><h2>Application received ✓</h2><p>Thanks, {profile?.displayName || "Founder"}. Your application is now in the Creator Centre.</p><button type="button" onClick={() => navigate("/account")}>Back to My Account</button></div> : <form className="creator-form" onSubmit={submit}>
      <label>Why do you want to become a Founder?<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} maxLength={2000} required /></label>
      <label>Tell us about your reptile / Tiny Titans experience<textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={5} maxLength={2000} required /></label>
      <label>How could you help Tiny Titans grow? <span>(optional)</span><textarea value={contribution} onChange={(e) => setContribution(e.target.value)} rows={4} maxLength={2000} /></label>
      {error && <div className="creator-error">{error}</div>}
      <div className="creator-actions"><button type="button" onClick={() => navigate(-1)}>Cancel</button><button className="creator-primary" type="submit" disabled={sending || !reason.trim() || !experience.trim()}>{sending ? "Submitting…" : "👑 Apply to Become a Founder"}</button></div>
    </form>}
  </div></section>;
}
