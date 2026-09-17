import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { acceptRescueInvitation, getRescueInvitation } from "../services/rescueWorkspaceService";
import type { RescueRole } from "../types/rescue";
import "../styles/rescue-invitation.css";

const ROLE_LABELS: Record<Exclude<RescueRole, "owner">, string> = {
  manager: "Manager",
  staff: "Staff",
  medical: "Medical / Vet",
  foster: "Foster",
  viewer: "Viewer / Volunteer",
};

function formatExpiry(value: number | null) {
  if (!value) return "No expiry recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No expiry recorded" : date.toLocaleString("en-GB");
}

export default function RescueInvitation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invite")?.trim() || "";
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getRescueInvitation>> | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    if (!invitationId) {
      setError("This Rescue invitation link is incomplete.");
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    void getRescueInvitation(invitationId)
      .then((next) => { if (active) setInvitation(next); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "This Rescue invitation could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invitationId]);

  async function accept() {
    if (!invitationId || !user || accepting) return;
    setAccepting(true);
    setError("");
    try {
      await acceptRescueInvitation(invitationId);
      setAccepted(true);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "The Rescue invitation could not be accepted.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <main className="rescue-page rescue-invitation-page"><section className="rescue-card rescue-invitation-card"><span className="rescue-eyebrow">RESCUE INVITATION</span><h1>Checking your invitation…</h1><p>We are verifying the invitation against the TinyTitans account currently signed in.</p></section></main>;
  }

  if (accepted) {
    return <main className="rescue-page rescue-invitation-page"><section className="rescue-card rescue-invitation-card"><div className="rescue-invitation-success">✓</div><span className="rescue-eyebrow">INVITATION ACCEPTED</span><h1>Welcome to {invitation?.organisationName || "the Rescue Centre"}.</h1><p>Your <strong>{invitation ? ROLE_LABELS[invitation.role] : "Rescue"}</strong> role has been added to the organisation. Your personal TinyTitans account remains separate.</p><div className="rescue-invitation-actions"><button type="button" onClick={() => navigate("/rescue?manage=1", { replace: true })}>Open Rescue Centre →</button><Link className="rescue-secondary-link" to="/account">My Account</Link></div></section></main>;
  }

  if (error || !invitation) {
    return <main className="rescue-page rescue-invitation-page"><section className="rescue-card rescue-invitation-card"><span className="rescue-eyebrow">RESCUE INVITATION</span><h1>We couldn't use this invitation.</h1><p className="rescue-message rescue-message-error" role="alert">{error || "Rescue invitation not found."}</p><p>Make sure you are signed in with the email address the Rescue organisation invited. Invitations cannot be accepted from a different TinyTitans account.</p><Link className="rescue-primary-link" to="/rescue">Back to TinyTitans</Link></section></main>;
  }

  const signedInEmail = (user?.email || "").trim().toLowerCase();
  const targetEmail = invitation.targetEmail.trim().toLowerCase();
  const emailMatches = signedInEmail === targetEmail;

  return <main className="rescue-page rescue-invitation-page"><section className="rescue-card rescue-invitation-card"><div className="rescue-invitation-badge">🛟</div><span className="rescue-eyebrow">YOU'VE BEEN INVITED</span><h1>Join {invitation.organisationName}</h1><p className="rescue-invitation-lead">This Rescue organisation has invited you to join its secure TinyTitans workspace.</p><div className="rescue-invitation-summary"><div><small>Invited email</small><strong>{invitation.targetEmail}</strong></div><div><small>Rescue role</small><strong>{ROLE_LABELS[invitation.role]}</strong></div><div><small>Invitation expires</small><strong>{formatExpiry(invitation.expiresAt)}</strong></div><div><small>Current account</small><strong>{user?.email || "Signed-in account unavailable"}</strong></div></div>{!emailMatches && <div className="rescue-message rescue-message-error" role="alert">This invitation was sent to <strong>{invitation.targetEmail}</strong>, but the current account is <strong>{user?.email || "not using an email address"}</strong>. Sign out and sign in with the invited email before accepting it.</div>}{error && <div className="rescue-message rescue-message-error" role="alert">{error}</div>}<div className="rescue-invitation-actions"><button type="button" onClick={() => void accept()} disabled={!emailMatches || accepting}>{accepting ? "Accepting…" : `Accept ${ROLE_LABELS[invitation.role]} Invitation`}</button><Link className="rescue-secondary-link" to="/rescue">Cancel</Link></div><div className="rescue-invitation-note"><strong>Account separation</strong><span>You keep your personal TinyTitans account. Accepting this invitation only adds your role to this Rescue organisation.</span></div></section></main>;
}
