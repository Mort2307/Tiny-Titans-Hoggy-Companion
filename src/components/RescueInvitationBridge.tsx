import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../context/useAuth";
import { app } from "../firebase/config";
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

function getInvitationRedirect() {
  return `${window.location.pathname}${window.location.search}`;
}

export default function RescueInvitationBridge() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invitationId = typeof window !== "undefined" && window.location.pathname === "/rescue/team"
    ? new URLSearchParams(window.location.search).get("invite")?.trim() || ""
    : "";

  useEffect(() => {
    let active = true;
    setDismissed(false);
    setEmailMismatch(false);

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
        if (!active) return;
        setInvitation(nextInvitation);
        setEmailMismatch(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setInvitation(null);
        const rawMessage = loadError instanceof Error
          ? loadError.message
          : "This Rescue invitation could not be opened.";
        const mismatch = rawMessage.toLowerCase().includes("different email address");
        setEmailMismatch(mismatch);
        setError(
          mismatch
            ? "This invitation was issued for a different email address than the account currently signed in."
            : rawMessage,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [invitationId, user]);

  function dismiss() {
    setDismissed(true);
    removeInviteFromUrl();
  }

  async function switchAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      const redirect = encodeURIComponent(getInvitationRedirect());
      await signOut(getAuth(app));
      window.location.assign(`/login?redirect=${redirect}`);
    } catch (switchError) {
      setSwitchingAccount(false);
      setError(switchError instanceof Error ? switchError.message : "Unable to switch accounts. Please sign out and try again.");
    }
  }

  if (!invitationId || !user || dismissed) return null;

  if (loading) {
    return (
      <div className="rescue-invite-backdrop">
        <section className="rescue-invite-modal" role="dialog" aria-modal="true" aria-labelledby="rescue-invite-title">
          <span className="rescue-invite-eyebrow">RESCUE INVITATION</span>
          <h2 id="rescue-invite-title">Checking your invitation…</h2>
          <p>Please wait while Tiny Titans checks the invitation against your signed-in account.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rescue-invite-backdrop">
        <section className="rescue-invite-modal rescue-invite-modal-error" role="alertdialog" aria-modal="true" aria-labelledby="rescue-invite-error-title">
          <span className="rescue-invite-eyebrow">RESCUE INVITATION</span>
          <h2 id="rescue-invite-error-title">Invitation unavailable</h2>
          <p>{error}</p>
          {emailMismatch && (
            <div className="rescue-invite-details">
              <div>
                <small>Currently signed in as</small>
                <strong>{user.email || "No email on this account"}</strong>
              </div>
            </div>
          )}
          <div className="rescue-invite-actions">
            {emailMismatch && (
              <button
                type="button"
                className="rescue-invite-primary"
                onClick={() => void switchAccount()}
                disabled={switchingAccount}
              >
                {switchingAccount ? "Signing out…" : "Switch account"}
              </button>
            )}
            <button type="button" className="rescue-invite-secondary" onClick={dismiss} disabled={switchingAccount}>
              Close invitation
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!invitation) return null;

  async function accept() {
    if (accepting) return;
    const currentInvitation = invitation;
    setAccepting(true);
    setError("");
    try {
      const result = await acceptRescueInvitation(currentInvitation.id);
      setMessage(`You have joined ${result.organisationName} as ${result.role}.`);
      removeInviteFromUrl();
      window.setTimeout(() => window.location.assign("/rescue/team"), 500);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "The invitation could not be accepted.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="rescue-invite-backdrop">
      <section className="rescue-invite-modal" role="dialog" aria-modal="true" aria-labelledby="rescue-invite-title">
        <span className="rescue-invite-eyebrow">RESCUE INVITATION</span>
        <h2 id="rescue-invite-title">Join {invitation.organisationName}</h2>
        <p className="rescue-invite-lead">
          You have been invited to join this Rescue workspace as <strong>{invitation.role}</strong>.
        </p>
        <div className="rescue-invite-details">
          <div>
            <small>Invited account</small>
            <strong>{invitation.targetEmail}</strong>
          </div>
          <div>
            <small>Invitation expires</small>
            <strong>{formatExpiry(invitation.expiresAt)}</strong>
          </div>
        </div>
        {error && <p className="rescue-invite-error" role="alert">{error}</p>}
        {message ? (
          <p className="rescue-invite-success" role="status">{message}</p>
        ) : (
          <div className="rescue-invite-actions">
            <button type="button" className="rescue-invite-primary" onClick={() => void accept()} disabled={accepting}>
              {accepting ? "Joining…" : "Accept invitation"}
            </button>
            <button type="button" className="rescue-invite-secondary" onClick={dismiss} disabled={accepting}>
              Not now
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
