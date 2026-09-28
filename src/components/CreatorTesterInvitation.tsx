import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansFeedback from "./TinyTitansFeedback";
import TinyTitansAction from "./TinyTitansAction";
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
      <div className="creator-tester-invitation__eyebrow"><TinyTitansIcon name="testing" size={15} /> TINY TITANS · CREATOR QA</div>
      <div className="creator-tester-invitation__icon" aria-hidden="true"><TinyTitansIcon name="testing" size={30} /></div>
      <h2 id="creator-tester-invitation-title">Creator Tester invitation</h2>
      <p>This account has a Tiny Titans Creator Tester invitation. Accepting activates the private Tester Centre for the Tiny Titans owner account.</p>
      <div className="creator-tester-invitation__features"><span><TinyTitansIcon name="testing" size={14} /> QA testing</span><span><TinyTitansIcon name="search" size={14} /> Diagnostics</span><span><TinyTitansIcon name="genetics" size={14} /> Morph testing</span><span><TinyTitansIcon name="warning" size={14} /> Bug testing</span></div>
      {message && <TinyTitansFeedback kind="error" className="creator-tester-invitation__error">{message}</TinyTitansFeedback>}
      <div className="creator-tester-invitation__actions">
        <TinyTitansAction className="creator-tester-invitation__secondary" variant="secondary" label="Not now" onClick={() => void decline()} busy={busy} />
        <TinyTitansAction className="creator-tester-invitation__primary" variant="primary" icon="testing" label="Accept Creator Tester Access" onClick={() => void accept()} busy={busy} />
      </div>
      <small>Access is restricted to tinytitans.exotics@gmail.com and enforced server-side.</small>
    </section>
  </div>;
}