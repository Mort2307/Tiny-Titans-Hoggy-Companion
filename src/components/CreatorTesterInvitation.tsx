import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { acceptCreatorTesterInvitation, declineCreatorTesterInvitation, getCreatorTesterInvitation, type CreatorTesterInvitation as Invitation } from "../services/creatorTesterInvitationService";
import "../styles/creatorTesterInvitation.css";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === OWNER_EMAIL;
}

export default function CreatorTesterInvitation() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!user || !isOwnerEmail(user.email)) {
      setLoading(false);
      setInvitation(null);
      return () => { active = false; };
    }
    void getCreatorTesterInvitation()
      .then((result) => { if (active) setInvitation(result); })
      .catch(() => { if (active) setInvitation(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (!user || !isOwnerEmail(user.email) || loading || !invitation || invitation.status !== "pending") return null;

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
      <h2 id="creator-tester-invitation-title">Creator Tester invitation</h2>
      <p>This account has a Tiny Titans Creator Tester invitation. Accepting activates the private Tester Centre for the Tiny Titans owner account.</p>
      <div className="creator-tester-invitation__features"><span>🧪 QA testing</span><span>🔎 Diagnostics</span><span>🧬 Morph testing</span><span>🐛 Bug testing</span></div>
      {message && <div className="creator-tester-invitation__error" role="alert">{message}</div>}
      <div className="creator-tester-invitation__actions">
        <button type="button" className="creator-tester-invitation__secondary" onClick={() => void decline()} disabled={busy}>{busy ? "Please wait…" : "Not now"}</button>
        <button type="button" className="creator-tester-invitation__primary" onClick={() => void accept()} disabled={busy}>{busy ? "Activating…" : "Accept Creator Tester Access"}</button>
      </div>
      <small>Access is restricted to tinytitans.exotics@gmail.com and enforced server-side.</small>
    </section>
  </div>;
}