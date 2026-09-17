import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { acceptRescueInvitation, getRescueInvitation } from "../services/rescueWorkspaceService";
import "./RescueInvitationBridge.css";

type Invitation = {
  id: string;
  organisationId: string;
  targetEmail: string;
  role: string;
  expiresAt: number | null;
  organisationName: string;
};

function formatExpiry(value: number | null) {
  if (!value) return "No expiry recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Expiry unavailable" : date.toLocaleString("en-GB");
}

function removeInviteFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export default function RescueInvitationBridge() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invitationId = typeof window !== "undefined" && window.location.pathname === "/rescue/team"
    ? new URLSearchParams(window.location.search).get("invite")?.trim() || ""
    : "";

  useEffect(() => {
    let active = true;
    if (!invitationId || !user) {
      setInvitation(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");
    setMessage("");
    void getRescueInvitation(invitationId)
      .then((nextInvitation) => {
        if (active) setInvitation(nextInvitation);
      })
      .catch((loadError) => {
        if (!active) return;
        setInvitation(null);
        setError(loadError instanceof Error ? loadError.message : "This Rescue invitation could not be opened.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [invitationId, user]);

  if (!invitationId || !user) return null;
  if (loading) {
    return <div className="rescue-invite-backdrop"><section className="rescue-invite-modal" role="dialog" aria-modal="true" aria-labelledby="rescue-invite-title"><span className="rescue-invite-eyebrow">RESCUE INVITATION</span><h2 id="rescue-invite-title">Checking your invitation…</h2><p>Please wait while Tiny Titans checks the invitation against your signed-in account.</p></section></div>;
  }

  if (error) {
    return <div className="rescue-invite-backdrop"><section className="rescue-invite-modal rescue-invite-modal-error" role="alert"><span className="rescue-invite-eyebrow">RESCUE INVITATION</span><h2>Invitation unavailable</h2><p>{error}</p><button type="button" onClick={removeInviteFromUrl}>Close invitation</button></section></div>;
  }

  if (!invitation) return null;

  async function accept() {
    if (accepting) return;
    setAccepting(true);
    setError("");
    try {
      const result = await acceptRescueInvitation(invitation.id);
      setMessage(`You have joined ${result.organisationName} as ${result.role}.`);
      removeInviteFromUrl();
      window.setTimeout(() => window.location.assign("/rescue/team"), 500);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "The invitation could not be accepted.");
    } finally {
      setAccepting(false);
    }
  }

  return <div className="rescue-invite-backdrop"><section className="rescue-invite-modal" role="dialog" aria-modal="true" aria-labelledby="rescue-invite-title"><span className="rescue-invite-eyebrow">RESCUE INVITATION</span><h2 id="rescue-invite-title">Join {invitation.organisationName}</h2><p className="rescue-invite-lead">You have been invited to join this Rescue workspace as <strong>{invitation.role}</strong>.</p><div className="rescue-invite-details"><div><small>Invited account</small><strong>{invitation.targetEmail}</strong></div><div><small>Invitation expires</small><strong>{formatExpiry(invitation.expiresAt)}</strong></div></div>{error && <p className="rescue-invite-error" role="alert">{error}</p>}{message ? <p className="rescue-invite-success" role="status">{message}</p> : <div className="rescue-invite-actions"><button type="button" className="rescue-invite-primary" onClick={() => void accept()} disabled={accepting}>{accepting ? "Joining…" : "Accept invitation"}</button><button type="button" className="rescue-invite-secondary" onClick={removeInviteFromUrl} disabled={accepting}>Not now</button></div>}</section></div>;
}
