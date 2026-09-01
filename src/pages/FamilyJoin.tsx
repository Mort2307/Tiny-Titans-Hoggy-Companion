import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { createFamily, getFamilyForUser, type FamilyAccount } from "../services/familyService";
import { decideFamilyJoinRequest, generateFamilyJoinCode, getFamilyJoinCode, getFamilyJoinRequests, requestFamilyJoinByCode, revokeFamilyJoinCode, type FamilyJoinRequest } from "../services/familyJoinCodeService";
import "../styles/family-join.css";

function formatDate(value: unknown): string { if (!value) return "Unknown date"; try { const date = typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function" ? value.toDate() : new Date(String(value)); if (Number.isNaN(date.getTime())) return "Unknown date"; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); } catch { return "Unknown date"; } }
function errorMessage(reason: unknown, fallback: string): string { return reason instanceof Error ? reason.message : fallback; }

export default function FamilyJoin() {
  const { user, profile, refreshProfile } = useAuth();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [requests, setRequests] = useState<FamilyJoinRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const familyFull = Boolean(family && family.memberUids.length >= 4);

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
        setMode("choice");
      } else if (loaded) {
        setActiveCode(""); setExpiresAt(""); setRequests([]); setMode("choice");
      }
    } catch (reason) { setError(errorMessage(reason, "Unable to load the family system.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [user]);

  async function startFamily() {
    if (!user || !profile) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const created = await createFamily(user.uid, { uid: user.uid, displayName: profile.displayName || user.displayName || "Family Head", email: user.email || profile.email, role: "owner", ageBand: profile.ageBand, experienceLevel: profile.experienceLevel });
      setFamily(created); setMode("choice"); await refreshProfile();
      const code = await generateFamilyJoinCode();
      setActiveCode(code.code); setExpiresAt(code.expiresAt);
      setMessage("Your Tiny Titans Family is ready. You are the Family Head and your unique join code is ready to share.");
    } catch (reason) { setError(errorMessage(reason, "Unable to start your Tiny Titans family.")); }
    finally { setBusy(false); }
  }
  async function generateCode() { setBusy(true); setError(""); setMessage(""); try { const result = await generateFamilyJoinCode(); setActiveCode(result.code); setExpiresAt(result.expiresAt); setMessage("New family join code created. Existing family members remain connected. Only the old code is invalidated."); } catch (reason) { setError(errorMessage(reason, "Unable to generate the family join code.")); } finally { setBusy(false); } }
  async function revokeCode() { setBusy(true); setError(""); setMessage(""); try { await revokeFamilyJoinCode(); setActiveCode(""); setExpiresAt(""); setMessage("Family join code revoked. Existing family members remain connected."); } catch (reason) { setError(errorMessage(reason, "Unable to revoke the family join code.")); } finally { setBusy(false); } }
  async function submitJoin() { const normalised = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (normalised.length !== 10) { setError("Enter the Family Code exactly as shown, for example TT-K97A-8E9C."); return; } setBusy(true); setError(""); setMessage(""); try { await requestFamilyJoinByCode(normalised.slice(-8)); setPendingRequest(true); setJoinCode(""); setMessage("Join request sent. The Family Head must approve it before this account is connected."); } catch (reason) { setError(errorMessage(reason, "Unable to use that family code.")); } finally { setBusy(false); } }
  async function decide(id: string, decision: "approved" | "rejected") { setBusy(true); setError(""); setMessage(""); try { await decideFamilyJoinRequest(id, decision); setRequests((current) => current.filter((item) => item.id !== id)); await refresh(); setMessage(decision === "approved" ? "Family member approved and connected." : "Join request rejected."); } catch (reason) { setError(errorMessage(reason, "Unable to decide that join request.")); } finally { setBusy(false); } }
  const expiryLabel = useMemo(() => expiresAt ? formatDate(expiresAt) : "No active code", [expiresAt]);

  if (!user) return null;
  if (loading) return <main className="page-container family-join-page"><BackHomeButton /><section className="family-join-card"><p className="family-join-kicker">Tiny Titans Family</p><h1>Loading family connection…</h1></section></main>;

  if (!family && mode === "choice") return <main className="page-container family-join-page"><BackHomeButton />
    <section className="family-join-hero"><div><p className="family-join-kicker">👨‍👩‍👧 FAMILY CONNECTION</p><h1>Start or Join a Tiny Titans Family</h1><p>Every keeper gets both choices. Start a family to become its Family Head and generate a code, or join an existing family with the code its Head gives you.</p></div></section>
    {message && <div className="family-join-message" role="status">{message}</div>}{error && <div className="family-join-error" role="alert">{error}</div>}
    <section className="family-join-choice-grid">
      <article className="family-join-card"><p className="family-join-kicker">👑 START A FAMILY</p><h2>Become the Family Head</h2><p>Create your own Tiny Titans Family. You become the Head, and Tiny Titans generates a unique code you can share with up to three other family accounts.</p><button type="button" className="family-join-button family-join-button--primary" disabled={busy} onClick={() => void startFamily()}>👑 Start a Family</button></article>
      <article className="family-join-card"><p className="family-join-kicker">🔑 JOIN A FAMILY</p><h2>Use a Family Code</h2><p>Already have a code from a Family Head? Enter it here. A code creates a join request — it never grants access by itself.</p><button type="button" className="family-join-button family-join-button--primary" onClick={() => setMode("join")}>🔑 Join a Family</button></article>
    </section>
  </main>;

  if (!family && mode === "join") return <main className="page-container family-join-page"><BackHomeButton />
    <section className="family-join-hero"><div><p className="family-join-kicker">🔑 JOIN A FAMILY</p><h1>Enter your Family Code</h1><p>Ask the Family Head for their current <strong>TT-XXXX-XXXX</strong> code. The code is not an access password; it simply sends a request to the Head for approval.</p></div><button type="button" className="family-join-button family-join-button--secondary" onClick={() => setMode("choice")}>← Back</button></section>
    {message && <div className="family-join-message" role="status">{message}</div>}{error && <div className="family-join-error" role="alert">{error}</div>}
    <section className="family-join-card">{pendingRequest ? <div className="family-join-pending"><strong>⏳ Join request pending</strong><p>Your request is with the Family Head. Nothing is shared into the family account until they approve it.</p></div> : <><label className="family-join-label">Family join code<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="TT-XXXX-XXXX" inputMode="text" autoComplete="off" maxLength={12} /></label><button type="button" className="family-join-button family-join-button--primary family-join-submit" disabled={busy || joinCode.replace(/[^A-Z0-9]/g, "").length !== 10} onClick={() => void submitJoin()}>{busy ? "Sending request…" : "👨‍👩‍👧 Request to join family"}</button></>}</section>
  </main>;

  if (!family) return null;

  return <main className="page-container family-join-page"><BackHomeButton />
    <section className="family-join-hero"><div><p className="family-join-kicker">👑 FAMILY HEAD</p><h1>Your Tiny Titans Family</h1><p>You are the Family Head. Share your unique code with people you trust. Regenerating the code never removes existing members.</p></div><Link className="family-join-button family-join-button--secondary" to="/account/family/manage">⚙️ Manage Family</Link></section>
    {message && <div className="family-join-message" role="status">{message}</div>}{error && <div className="family-join-error" role="alert">{error}</div>}
    <section className="family-join-card family-join-owner"><div className="family-join-section-head"><div><p className="family-join-kicker">🔐 SHARE THIS CODE</p><h2>Your secure Family Code</h2></div><span>{familyFull ? "Family full" : `${Math.max(0, family.memberUids.length - 1)} / 3 member places used`}</span></div>
      <p>This code identifies your family for a join request. It does not reveal account data and does not bypass your approval.</p>
      {activeCode && !familyFull ? <div className="family-join-code-wrap"><strong>{activeCode}</strong><small>Expires {expiryLabel}</small></div> : <div className="family-join-empty">{familyFull ? "This family already has four accounts." : "No active join code."}</div>}
      <div className="family-join-actions">{!familyFull && <button type="button" className="family-join-button family-join-button--primary" disabled={busy} onClick={() => void generateCode()}>{activeCode ? "🔄 Generate new code" : "🔐 Generate join code"}</button>}{activeCode && <button type="button" className="family-join-button" disabled={busy} onClick={() => void revokeCode()}>Revoke code</button>}{activeCode && <button type="button" className="family-join-button" disabled={busy} onClick={() => { void navigator.clipboard.writeText(activeCode).then(() => setMessage("Family code copied. Send it by WhatsApp, Messenger, text, email or in person.")).catch(() => setError("Your browser would not allow the code to be copied. You can select and copy it manually.")); }}>📋 Copy code</button>}</div>
    </section>
    <section className="family-join-card"><div className="family-join-section-head"><div><p className="family-join-kicker">🛡️ APPROVALS</p><h2>Join requests</h2></div><span>{requests.length} pending</span></div>{requests.length === 0 ? <p>No one is waiting to join your family.</p> : <div className="family-join-request-list">{requests.map((request) => <article className="family-join-request" key={request.id}><div><strong>{request.requesterDisplayName}</strong><span>{request.requesterEmail || "Email not supplied"} · {request.requesterRole === "child" ? "Child" : "Adult"}</span><small>Requested {formatDate(request.createdAt)}</small></div><div className="family-join-request-actions"><button type="button" className="family-join-button family-join-button--primary" disabled={busy} onClick={() => void decide(request.id, "approved")}>✅ Approve</button><button type="button" className="family-join-button" disabled={busy} onClick={() => void decide(request.id, "rejected")}>Reject</button></div></article>)}</div>}</section>
    <section className="family-join-card family-join-safety"><h2>🛡️ How it works</h2><div className="family-join-safety-grid"><div><strong>Start or Join</strong><span>Every user can choose either path.</span></div><div><strong>Code ≠ access</strong><span>A code only creates a pending request.</span></div><div><strong>Four accounts</strong><span>The Family Head plus up to three members.</span></div><div><strong>Regenerate safely</strong><span>New codes invalidate old codes but never remove current members.</span></div></div></section>
  </main>;
}
