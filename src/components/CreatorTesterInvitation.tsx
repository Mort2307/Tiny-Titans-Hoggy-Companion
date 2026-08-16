import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { acceptCreatorTesterInvitation, declineCreatorTesterInvitation, getCreatorTesterInvitation, type CreatorTesterInvitation as Invitation } from "../services/creatorTesterInvitationService";
import "../styles/creatorTesterInvitation.css";

export default function CreatorTesterInvitation() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) { setInvitation(null); setLoading(false); return () => undefined; }
    setLoading(true);
    void getCreatorTesterInvitation()
      .then((result) => { if (active) setInvitation(result); })
      .catch(() => { if (active) setInvitation(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (!user || loading || !invitation || invitation.status !== "pending") return null;

  async function accept() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      await acceptCreatorTesterInvitation();
      setInvitation(null);
      window.location.assign("/creator/tester");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't activate Creator Tester access. Please try again.");
    } finally { setBusy(false); }
  }

  async function decline() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      await declineCreatorTesterInvitation();
      setInvitation(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't decline this invitation. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="creator-tester-invitation-backdrop" role="presentation">
    <section className="creator-tester-invitation" role="dialog" aria-modal="true" aria-labelledby="creator-tester-invitation-title">
      <div className="creator-tester-invitation__eyebrow">🐍 TINY TITANS · CREATOR QA</div>
      <div className="creator-tester-invitation__icon" aria-hidden="true">🤖</div>
      <h2 id="creator-tester-invitation-title">You've been invited to become a Creator Tester</h2>
      <p>Tiny Titans has invited this account to help test Creator and community features. Accepting gives you access to the dedicated Tester Centre — it does <strong>not</strong> grant access to the private Creator Centre.</p>
      <div className="creator-tester-invitation__features"><span>🧪 QA testing</span><span>🔎 Diagnostics</span><span>🧬 Morph testing</span><span>🐛 Bug testing</span></div>
      {message && <div className="creator-tester-invitation__error" role="alert">{message}</div>}
      <div className="creator-tester-invitation__actions">
        <button type="button" className="creator-tester-invitation__secondary" onClick={() => void decline()} disabled={busy}>{busy ? "Please wait…" : "Not now"}</button>
        <button type="button" className="creator-tester-invitation__primary" onClick={() => void accept()} disabled={busy}>{busy ? "Activating…" : "Accept Creator Tester Access"}</button>
      </div>
      <small>Access is controlled server-side by Tiny Titans Creator/Admin permissions.</small>
    </section>
  </div>;
}
