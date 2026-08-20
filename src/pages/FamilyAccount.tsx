import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { acceptFamilyInvite, createFamily, declineFamilyInvite, getFamilyForUser, getFamilyPendingInvites, getMyFamilyInvites, inviteFamilyMember, removeFamilyMember, type FamilyAccount, type FamilyInvite } from "../services/familyService";
import { decideFamilyApproval, getFamilyApprovals, getMemberPermissions, permissionActions, permissionAreas, permissionLabel, resetMemberPermissions, setMemberPermission, type FamilyApproval, type FamilyPermissionKey, type PermissionMode, type FamilyPermissions } from "../services/familyPermissionsService";
import { enableNotifications, getNotificationPermissionState } from "../services/notificationService";
import BackHomeButton from "../components/BackHomeButton";

const modeOptions: PermissionMode[] = ["allow", "deny", "verify"];

export default function FamilyAccount() {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<FamilyInvite[]>([]);
  const [approvals, setApprovals] = useState<FamilyApproval[]>([]);
  const [email, setEmail] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<FamilyPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionState());

  const linkInviteId = searchParams.get("invite");
  const linkInvite = useMemo(() => invites.find((invite) => invite.id === linkInviteId) ?? null, [invites, linkInviteId]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const loadedFamily = await getFamilyForUser(user.uid);
      setFamily(loadedFamily);
      setInvites(await getMyFamilyInvites(user.email || ""));
      if (loadedFamily?.ownerUid === user.uid) {
        setApprovals(await getFamilyApprovals(user.uid));
        setOutgoingInvites(await getFamilyPendingInvites(user.uid));
      } else {
        setOutgoingInvites([]);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load your family account."); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); setNotificationPermission(getNotificationPermissionState()); }, [load]);

  async function enableFamilyNotifications() {
    if (!user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const permission = await enableNotifications(user.uid);
      setNotificationPermission(permission);
      setMessage(permission === "granted" ? "Family notifications are enabled on this device." : permission === "denied" ? "Notifications are blocked by your browser. Allow them in the browser site settings, then try again." : "This browser cannot provide Tiny Titans notifications.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to enable notifications on this device."); }
    finally { setBusy(false); }
  }

  async function selectMember(uid: string) {
    setSelectedMember(uid); setPermissions(null); setError("");
    try { setPermissions(await getMemberPermissions(uid)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load family permissions."); }
  }

  async function changePermission(key: FamilyPermissionKey, mode: PermissionMode) {
    if (!user || !selectedMember || family?.ownerUid !== user.uid) return;
    setBusy(true); setError("");
    try { await setMemberPermission(user.uid, selectedMember, key, mode); setPermissions((current) => current ? { ...current, [key]: mode } : current); setMessage("Family permission updated."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update that permission."); }
    finally { setBusy(false); }
  }

  async function resetPermissions() {
    if (!user || !selectedMember) return;
    setBusy(true); setError("");
    try { await resetMemberPermissions(user.uid, selectedMember); setPermissions(await getMemberPermissions(selectedMember)); setMessage("Permissions reset to the member's recommended family profile."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reset permissions."); }
    finally { setBusy(false); }
  }

  async function startFamily() { if (!user || !profile) return; setBusy(true); setError(""); try { const created = await createFamily(user.uid, { uid: user.uid, displayName: profile.displayName || user.displayName || "Family Owner", email: user.email || profile.email, role: "owner", ageBand: profile.ageBand, experienceLevel: profile.experienceLevel }); setFamily(created); await refreshProfile(); setMessage("Your Tiny Titans Family is ready. You have two family links available."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create the family account."); } finally { setBusy(false); } }

  async function sendInvite() {
    if (!user || !email.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const invite = await inviteFamilyMember(user.uid, email);
      setOutgoingInvites((current) => current.some((item) => item.id === invite.id) ? current : [...current, invite]);
      setEmail("");
      setSearchParams({ invite: invite.id });
      setMessage("Family invitation created. Share the secure link shown below — it works for existing and brand-new Tiny Titans accounts.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create the invitation."); }
    finally { setBusy(false); }
  }

  async function accept(inviteId: string) {
    if (!user) return;
    setBusy(true); setError("");
    try {
      setFamily(await acceptFamilyInvite(user.uid, inviteId));
      setInvites((current) => current.filter((invite) => invite.id !== inviteId));
      if (searchParams.get("invite") === inviteId) setSearchParams({});
      await refreshProfile();
      setMessage("Welcome to the family. Shared Tiny Titans data is now available on this account.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to accept that invitation."); }
    finally { setBusy(false); }
  }

  async function decline(inviteId: string) { if (!user) return; setBusy(true); setError(""); try { await declineFamilyInvite(user.uid, inviteId); setInvites((current) => current.filter((invite) => invite.id !== inviteId)); if (searchParams.get("invite") === inviteId) setSearchParams({}); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to decline that invitation."); } finally { setBusy(false); } }
  async function remove(uid: string) { if (!user || !window.confirm("Remove this person from your Tiny Titans family? Their own account stays intact.")) return; setBusy(true); setError(""); try { await removeFamilyMember(user.uid, uid); setSelectedMember(null); setPermissions(null); await load(); setMessage("Family member removed. Their account and personal profile remain intact."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove this family member."); } finally { setBusy(false); } }
  async function decide(id: string, status: "approved" | "rejected") { if (!user) return; setBusy(true); setError(""); try { await decideFamilyApproval(user.uid, id, status); setApprovals((current) => current.map((item) => item.id === id ? { ...item, status } : item)); setMessage(status === "approved" ? "Approval accepted. The requested change can now be applied." : "Approval rejected. The production record remains unchanged."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update that approval."); } finally { setBusy(false); } }

  function getInviteLink(invite: FamilyInvite) { return `${window.location.origin}/account/family?invite=${encodeURIComponent(invite.id)}`; }
  async function copyInviteLink(invite: FamilyInvite) { try { await navigator.clipboard.writeText(getInviteLink(invite)); setMessage("Family invitation link copied. Send it by WhatsApp, Messenger, text or email."); } catch { setError("Your browser would not allow the link to be copied. Please use the visible link instead."); } }

  if (!user) return null;
  if (loading) return <div className="page-container"><BackHomeButton /><div className="welcome-card"><h1>👨‍👩‍👦 Loading Tiny Titans Family…</h1></div></div>;

  return <section className="my-account-page"><BackHomeButton /><div className="my-account-card">
    <div className="my-account-header"><div className="my-account-avatar">👨‍👩‍👦</div><div><h1>Tiny Titans Family</h1><p>One shared reptile record, with an intelligent experience for every family member.</p></div></div>
    {message && <div className="creator-success" role="status"><p>{message}</p></div>}{error && <div className="creator-error" role="alert"><p>{error}</p></div>}
    {linkInvite && <div className="account-section"><h2>🔗 You've Been Invited</h2><p>This secure Tiny Titans invitation works for an existing account or someone completely new to Tiny Titans. If you're already signed in with <strong>{user.email}</strong>, you can accept it now. If you're creating a new account, your invitation stays with you through account setup.</p><div className="account-detail"><span>Family invitation</span><strong>Secure email-matched invitation</strong></div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void accept(linkInvite.id)}>👨‍👩‍👦 Accept Family Invitation</button><button type="button" className="account-button" disabled={busy} onClick={() => setSearchParams({})}>Not now</button></div>}
    {invites.length > 0 && <div className="account-section"><h2>📨 Family Invitations</h2>{invites.map((invite) => <div className="account-detail" key={invite.id}><div><strong>Tiny Titans Family</strong><p className="account-button-subtext">You've been invited to share a family reptile record.</p></div><div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void accept(invite.id)}>✅ Accept</button><button type="button" className="account-button" disabled={busy} onClick={() => void decline(invite.id)}>Decline</button></div></div>)}</div>}
    {!family ? <div className="account-section"><h2>Build Your Family Account</h2><p>Keep each person on their own secure login while sharing the same Tiny Titans snakes, feeding records, weights, sheds and breeding data.</p><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void startFamily()}>👨‍👩‍👦 Create Family Account</button></div> : <>
      <div className="account-section"><h2>👨‍👩‍👦 Your Family</h2><div className="account-detail"><span>Family links</span><strong>{Math.max(0, family.memberUids.length - 1)} / 2 used</strong></div>{family.members.map((member) => <div className="account-detail" key={member.uid}><div><strong>{member.displayName}</strong><p className="account-button-subtext">{member.role === "owner" ? "Family Owner" : member.role === "child" ? "Child profile" : "Adult profile"} · {member.experienceLevel || "beginner"}</p></div><div>{member.uid !== family.ownerUid && family.ownerUid === user.uid && <button type="button" className="account-button" disabled={busy} onClick={() => void selectMember(member.uid)}>⚙️ Permissions</button>}{member.uid !== family.ownerUid && <button type="button" className="account-button" disabled={busy} onClick={() => void remove(member.uid)}>Remove</button>}</div></div>)}</div>
      {selectedMember && permissions && family.ownerUid === user.uid && <div className="account-section"><div className="account-detail"><div><h2>🛡️ Family Permissions</h2><p className="account-button-subtext">Control what this member can do. <strong>Allow</strong> is immediate, <strong>Deny</strong> blocks the action, and <strong>Verify</strong> sends a proposed change to Family Approval before it becomes official.</p></div><button type="button" className="account-button" disabled={busy} onClick={() => void resetPermissions()}>Reset recommended</button></div><div className="creator-list">{permissionAreas.map((area) => <div className="account-section" key={area.id}><h3>{area.icon} {area.label}</h3>{permissionActions.map((action) => { const key = `${area.id}.${action.id}` as FamilyPermissionKey; return <div className="account-detail" key={key}><span>{action.label}</span><select className="account-input" value={permissions[key]} disabled={busy} onChange={(event) => void changePermission(key, event.target.value as PermissionMode)}>{modeOptions.map((mode) => <option key={mode} value={mode}>{mode === "allow" ? "🟢 Allow" : mode === "deny" ? "🔴 Deny" : "🟠 Verify"}</option>)}</select><small>{permissionLabel(permissions[key])}</small></div>; })}</div>)}</div></div>}
      {family.ownerUid === user.uid && family.memberUids.length < 3 && <div className="account-section"><h2>➕ Add Family Member</h2><p>Invite an existing Tiny Titans account <strong>or someone who has never used Tiny Titans</strong>. The secure link works for both. They keep their own login, age/experience profile and personal learning progress while the family reptile data is shared.</p><input className="account-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Eli or Megs' email address" autoComplete="email" /><button type="button" className="account-button account-button--highlight" disabled={busy || !email.trim()} onClick={() => void sendInvite()}>📨 Create &amp; Share Family Link</button></div>}
      {family.ownerUid === user.uid && outgoingInvites.length > 0 && <div className="account-section"><h2>🔗 Active Family Links</h2><p className="account-button-subtext">Pending links can be shared anywhere. The link is tied to the invited email, so another person cannot use it to join.</p>{outgoingInvites.map((invite) => <div className="account-detail" key={invite.id}><div><strong>{invite.targetEmail}</strong><p className="account-button-subtext">Pending invitation · <span>{getInviteLink(invite)}</span></p></div><button type="button" className="account-button" disabled={busy} onClick={() => void copyInviteLink(invite)}>📋 Copy Link</button></div>)}</div>}
      <div className="account-section"><h2>🔔 Family Notifications</h2><p>Family invitations, approval requests and approval decisions use Tiny Titans notifications. Notification permission is stored by the browser, while the device token is registered to your account.</p><div className="account-detail"><span>Browser permission</span><strong>{notificationPermission}</strong></div>{notificationPermission === "granted" ? <p className="creator-success" role="status">✓ Notifications are permitted on this device. If a Family event occurs, the backend can target this device when a valid token is registered.</p> : <button type="button" className="account-button account-button--highlight" disabled={busy || notificationPermission === "denied"} onClick={() => void enableFamilyNotifications()}>{notificationPermission === "denied" ? "🔒 Notifications blocked — allow in browser settings" : "🔔 Enable Family Notifications"}</button>}</div>
      {family.ownerUid === user.uid && <div className="account-section"><h2>🔔 Family Approval Queue</h2>{approvals.filter((item) => item.status === "pending").length === 0 ? <p>No pending approvals. Your family is all clear.</p> : approvals.filter((item) => item.status === "pending").map((item) => <div className="account-detail" key={item.id}><div><strong>{item.title}</strong><p className="account-button-subtext">{item.requesterName} · {item.description}</p></div><div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void decide(item.id, "approved")}>✅ Approve</button><button type="button" className="account-button" disabled={busy} onClick={() => void decide(item.id, "rejected")}>❌ Reject</button></div></div>)}</div>}
      <div className="account-section"><h2>🧪 Safe Family Sandbox</h2><p>Kids and adults can experiment with genetics, hypothetical pairings and breeding ideas without changing the real family records. Sandbox calculations are isolated from production data.</p><Link className="account-button account-button--highlight" to="/sandbox">🧪 Open Family Sandbox</Link></div>
      <div className="account-section"><h2>💬 Family Communication</h2><p>Need help with a Tiny Titans issue or want to follow up on feedback?</p><div className="account-detail"><Link className="account-button account-button--highlight" to="/conversations">💬 My Conversations</Link><Link className="account-button" to="/my-issue-reports">🐛 My Reports</Link></div></div>
      <div className="account-section"><h2>🧠 Intelligent Family Experience</h2><p>Tiny Titans uses each member's age band and experience level to adapt explanations, learning content and what is surfaced to them. Permissions control the actions they can take, while the underlying husbandry records remain shared.</p><div className="account-detail"><span>Shared data</span><strong>🐍 Snakes · 🍽️ Feedings · ⚖️ Weights · 🐍 Sheds · 🧬 Breeding</strong></div></div>
    </>}
  </div></section>;
}
