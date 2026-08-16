import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getIdToken } from "firebase/auth";
import { app, auth } from "../firebase/config";
import "../styles/creatorTesterInvitation.css";

type Invitation = {
  status: "pending" | "accepted" | "revoked";
  targetEmail?: string | null;
  targetDisplayName?: string | null;
  invitationVersion?: number;
};

type GetResponse = { success: boolean; invitation: Invitation | null };
type AcceptResponse = { success: boolean; invitationStatus: string; refreshRequired: boolean };

const functions = getFunctions(app, "europe-west2");
const getInvitation = httpsCallable<Record<string, never>, GetResponse>(functions, "getCreatorTesterInvitation");
const acceptInvitation = httpsCallable<Record<string, never>, AcceptResponse>(functions, "acceptCreatorTesterInvitation");

export default function CreatorTesterInvitationBanner() {
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!auth.currentUser) {
      setLoading(false);
      return () => { active = false; };
    }
    void getInvitation({}).then((result) => {
      if (!active) return;
      const next = result.data.invitation;
      setInvitation(next?.status === "pending" ? next : null);
    }).catch(() => {
      if (active) setInvitation(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading || !invitation) return null;

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      await acceptInvitation({});
      if (auth.currentUser) await getIdToken(auth.currentUser, true);
      setInvitation(null);
      navigate("/creator/tester");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't activate Creator Tester access. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="creator-tester-invite" role="region" aria-labelledby="creator-tester-invite-title">
    <div className="creator-tester-invite__icon" aria-hidden="true">🤖</div>
    <div className="creator-tester-invite__content">
      <span className="creator-tester-invite__eyebrow">TINY TITANS · CREATOR TESTING</span>
      <h2 id="creator-tester-invite-title">You've been invited to become a Creator Tester</h2>
      <p>Help test Creator tools, community moderation, Morph Library submissions and the automated QA systems. Accepting this invitation activates tester access on this account.</p>
      {message && <p className="creator-tester-invite__error" role="alert">{message}</p>}
      <div className="creator-tester-invite__actions">
        <button type="button" className="creator-tester-invite__accept" onClick={() => void accept()} disabled={busy}>{busy ? "Activating…" : "Accept Creator Tester Access"}</button>
        <button type="button" className="creator-tester-invite__dismiss" onClick={() => setInvitation(null)} disabled={busy}>Later</button>
      </div>
    </div>
  </section>;
}
