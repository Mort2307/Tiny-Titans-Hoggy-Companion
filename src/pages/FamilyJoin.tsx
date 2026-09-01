import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getFamilyForUser } from "../services/familyService";
import { decideFamilyJoinRequest, generateFamilyJoinCode, getFamilyJoinCode, getFamilyJoinRequests, requestFamilyJoinByCode, revokeFamilyJoinCode, type FamilyJoinRequest } from "../services/familyJoinCodeService";
import type { FamilyAccount } from "../services/familyService";
import "../styles/family-join.css";

function formatDate(value: unknown): string { if (!value) return "Unknown date"; try { const date = typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function" ? value.toDate() : new Date(String(value)); if (Number.isNaN(date.getTime())) return "Unknown date"; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); } catch { return "Unknown date"; } }
function errorMessage(reason: unknown, fallback: string): string { return reason instanceof Error ? reason.message : fallback; }

export default function FamilyJoin() {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [requests, setRequests] = useState<FamilyJoinRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isOwner = Boolean(user && family?.ownerUid === user.uid);
  const familyFull = Boolean(family && family.memberUids.length >= 3);

  async function refresh() {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const loaded = await getFamilyForUser(user.uid);
      setFamily(loaded);
      if (loaded?.ownerUid === user.uid) {
        const code = await getFamilyJoinCode().catch(() => ({ code: "", expiresAt: "" }));
        setActiveCode(code.code || ""); setExpiresAt(code.expiresAt || "");
        setRequests(await getFamilyJoinRequests());
      } else { setActiveCode(""); setExpiresAt(""); setRequests([]); }
    } catch (reason) { setError(errorMessage(reason, "Unable to load the family join system.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [user]);

  async function generateCode() { setBusy(true); setError(""); setMessage(""); try { const result = await generateFamilyJoinCode(); setActiveCode(result.code); setExpiresAt(result.expiresAt); setMessage("New family join code created. The previous code is no longer active."); } catch (reason) { setError(errorMessage(reason, "Unable to generate the family join code.")); } finally { setBusy(false); } }
  async function revokeCode() { setBusy(true); setError(""); setMessage(""); try { await revokeFamilyJoinCode(); setActiveCode(""); setExpiresAt(""); setMessage("Family join code revoked. It can no longer be used to create join requests."); } catch (reason) { setError(errorMessage(reason, "Unable to revoke the family join code.")); } finally { setBusy(false); } }
  async function submitJoin() { const normalised = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (normalised.length !== 8) { setError("Enter the 8-character code from the Family Owner."); return; } setBusy(true); setError(""); setMessage(""); try { await requestFamilyJoinByCode(normalised); setPendingRequest(true); setJoinCode(""); setMessage("Join request sent. The Family Owner must approve it before this account is connected."); } catch (reason) { setError(errorMessage(reason, "Unable to use that family code.")); } finally { setBusy(false); } }
  async function decide(id: string, decision: "approved" | "rejected") { setBusy(true); setError(""); setMessage(""); try { await decideFamilyJoinRequest(id, decision); setRequests((current) => current.filter((item) => item.id !== id)); await refresh(); setMessage(decision === "approved" ? "Family member approved and connected." : "Join request rejected."); } catch (reason) { setError(errorMessage(reason, "Unable to decide that join request.")); } finally { setBusy(false); } }
  const expiryLabel = useMemo(() => expiresAt ? formatDate(expiresAt) : "No active code", [expiresAt]);

  if (!user) return null;
  if (loading) return <main className="page-container family-join-page"><BackHomeButton /><section className="family-join-card"><p className="family-join-kicker">Tiny Titans Family</p><h1>Loading family join…</h1></section></main>;
  return <main className="page-container family-join-page"><BackHomeButton />
    <section className="family-join-hero"><div><p className="family-join-kicker">👨‍👩‍👧 FAMILY CONNECTION</p><h1>Join a Tiny Titans Family</h1><p>Use a short code instead of relying on email links. The code only starts a request — the Family Owner still controls the final approval.</p></div><Link className="family-join-button family-join-button--secondary" to="/account/family">← Back to Family</Link></section>
    {message && <div className="family-join-message" role="status">{message}</div>}{error && <div className="family-join-error" role="alert">{error}</div>}
    {isOwner ? <>
      <section className="family-join-card family-join-owner"><div className="family-join-section-head"><div><p className="family-join-kicker">🔐 FAMILY OWNER</p><h2>Your secure join code</h2></div><span>{familyFull ? "Family full" : `${Math.max(0, (family?.memberUids.length || 1) - 1)} / 2 member places used`}</span></div>
        <p>This code is deliberately separate from account identity. Sharing it lets someone request to join, but it never bypasses your approval.</p>
        {activeCode && !familyFull ? <div className="family-join-code-wrap"><strong>{activeCode}</strong><small>Expires {expiryLabel}</small></div> : <div className="family-join-empty">{familyFull ? "This family already has three accounts." : "No active join code."}</div>}
        <div className="family-join-actions">{!familyFull && <button type="button" className="family-join-button family-join-button--primary" disabled={busy} onClick={() => void generateCode()}>{activeCode ? "🔄 Generate new code" : "🔐 Generate join code"}</button>}{activeCode && <button type="button" className="family-join-button" disabled={busy} onClick={() => void revokeCode()}>Revoke code</button>}{activeCode && <button type="button" className="family-join-button" disabled={busy} onClick={() => { void navigator.clipboard.writeText(activeCode).then(() => setMessage("Family join code copied. Send it by WhatsApp, Messenger, text or email.")).catch(() => setError("Your browser would not allow the code to be copied. You can select and copy it manually.")); }}>📋 Copy code</button>}</div>
      </section>
      <section className="family-join-card"><div className="family-join-section-head"><div><p className="family-join-kicker">🛡️ APPROVALS</p><h2>Join requests</h2></div><span>{requests.length} pending</span></div>{requests.length === 0 ? <p>No one is waiting to join your family.</p> : <div className="family-join-request-list">{requests.map((request) => <article className="family-join-request" key={request.id}><div><strong>{request.requesterDisplayName}</strong><span>{request.requesterEmail || "Email not supplied"} · {request.requesterRole === "child" ? "Child" : "Adult"}</span><small>Requested {formatDate(request.createdAt)}</small></div><div className="family-join-request-actions"><button type="button" className="family-join-button family-join-button--primary" disabled={busy} onClick={() => void decide(request.id, "approved")}>✅ Approve</button><button type="button" className="family-join-button" disabled={busy} onClick={() => void decide(request.id, "rejected")}>Reject</button></div></article>)}</div>}</section>
    </> : <section className="family-join-card"><p className="family-join-kicker">🔑 JOIN WITH A CODE</p><h2>Enter the code from your Family Owner</h2><p>Codes look like <strong>TT-7K4P-92XM</strong>. You can type the letters and numbers with or without the dashes.</p>{family ? <div className="family-join-message">This account is already connected to a Tiny Titans family. You do not need another join code.</div> : pendingRequest ? <div className="family-join-pending"><strong>⏳ Join request pending</strong><p>Your request is with the Family Owner. Nothing is shared into the family account until they approve it.</p></div> : <><label className="family-join-label">Family join code<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="TT-XXXX-XXXX" inputMode="text" autoComplete="off" maxLength={11} /></label><button type="button" className="family-join-button family-join-button--primary family-join-submit" disabled={busy || joinCode.replace(/[^A-Z0-9]/g, "").length !== 8} onClick={() => void submitJoin()}>{busy ? "Sending request…" : "👨‍👩‍👧 Request to join family"}</button></>}</section>}
    <section className="family-join-card family-join-safety"><h2>🛡️ How it stays safe</h2><div className="family-join-safety-grid"><div><strong>Code ≠ access</strong><span>A code only creates a pending request.</span></div><div><strong>Owner approval</strong><span>The owner must explicitly approve every new member.</span></div><div><strong>Three-account cap</strong><span>The existing Tiny Titans family limit still applies.</span></div><div><strong>Revocable</strong><span>Owners can replace or revoke the active code at any time.</span></div></div></section>
  </main>;
}
