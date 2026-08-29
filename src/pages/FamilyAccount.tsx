import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { acceptFamilyInvite, createFamily, declineFamilyInvite, getFamilyForUser, getFamilyPendingInvites, getMyFamilyInvites, inviteFamilyMember, removeFamilyMember, revokeFamilyInvite, type FamilyAccount, type FamilyInvite } from "../services/familyService";
import { decideFamilyApproval, getFamilyApprovals, getMemberPermissions, permissionActions, permissionAreas, permissionLabel, resetMemberPermissions, setMemberPermission, type FamilyApproval, type FamilyPermissionKey, type PermissionMode, type FamilyPermissions } from "../services/familyPermissionsService";
import { enableNotifications, getNotificationPermissionState } from "../services/notificationService";
import BackHomeButton from "../components/BackHomeButton";

const modeOptions: PermissionMode[] = ["allow", "deny", "verify"];
const pendingInviteStorageKey = "tinyTitans.pendingFamilyInvite";

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

  useEffect(() => {
    const currentInvite = searchParams.get("invite");
    if (currentInvite) {
      sessionStorage.setItem(pendingInviteStorageKey, currentInvite);
      return;
    }
    if (user) {
      const storedInvite = sessionStorage.getItem(pendingInviteStorageKey);
      if (storedInvite) setSearchParams({ invite: storedInvite }, { replace: true });
    }
  }, [searchParams, setSearchParams, user]);

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
      } else setOutgoingInvites([]);
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
    catch (reason) {
      try { await resetMemberPermissions(user?.uid || "", uid); setPermissions(await getMemberPermissions(uid)); setMessage("That family member's permission profile was repaired using the recommended role defaults."); }
      catch { setError(reason instanceof Error ? reason.message : "Unable to load family permissions."); }
    }
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
      setMessage("Family invitation created. A Tiny Titans invitation email will be sent automatically when email delivery is configured. You can also copy the secure link or open an email addressed to the invited person.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create the invitation."); }
    finally { setBusy(false); }
  }

  async function accept(inviteId: string) { if (!user) return; setBusy(true); setError(""); try { setFamily(await acceptFamilyInvite(user.uid, inviteId)); setInvites((current) => current.filter((invite) => invite.id !== inviteId)); sessionStorage.removeItem(pendingInviteStorageKey); if (searchParams.get("invite") === inviteId) setSearchParams({}); await refreshProfile(); setMessage("Welcome to the family. Shared Tiny Titans data is now available on this account."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to accept that invitation."); } finally { setBusy(false); } }
  async function decline(inviteId: string) { if (!user) return; setBusy(true); setError(""); try { await declineFamilyInvite(user.uid, inviteId); setInvites((current) => current.filter((invite) => invite.id !== inviteId)); sessionStorage.removeItem(pendingInviteStorageKey); if (searchParams.get("invite") === inviteId) setSearchParams({}); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to decline that invitation."); } finally { setBusy(false); } }
  async function remove(uid: string) { if (!user || !window.confirm("Remove this person from your Tiny Titans family? Their own account stays intact.")) return; setBusy(true); setError(""); try { await removeFamilyMember(user.uid, uid); setSelectedMember(null); setPermissions(null); await load(); setMessage("Family member removed. Their account and personal profile remain intact."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove the family member."); } finally { setBusy(false); } }
  async function revokeInvite(inviteId: string) { if (!user || !window.confirm("Remove this pending family link? The old link will immediately stop working.")) return; setBusy(true); setError(""); setMessage(""); try { await revokeFamilyInvite(user.uid, inviteId); setOutgoingInvites((current) => current.filter((invite) => invite.id !== inviteId)); sessionStorage.removeItem(pendingInviteStorageKey); if (searchParams.get("invite") === inviteId) setSearchParams({}); setMessage("Old family invitation link removed. It can no longer be used."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove that family invitation."); } finally { setBusy(false); } }
  async function decide(id: string, status: "approved" | "rejected") { if (!user) return; setBusy(true); setError(""); try { await decideFamilyApproval(user.uid, id, status); setApprovals((current) => current.map((item) => item.id === id ? { ...item, status } : item)); setMessage(status === "approved" ? "Approval accepted. The requested change can now be applied." : "Approval rejected. The production record remains unchanged."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update that approval."); } finally { setBusy(false); } }

  function getInviteLink(invite: FamilyInvite) { return `${window.location.origin}/account/family?invite=${encodeURIComponent(invite.id)}`; }
  async function copyInviteLink(invite: FamilyInvite) { try { await navigator.clipboard.writeText(getInviteLink(invite)); setMessage("Family invitation link copied. Send it by WhatsApp, Messenger, text or email."); } catch { setError("Your browser would not allow the link to be copied. Please use the visible link instead."); } }
  function emailInvite(invite: FamilyInvite) { const link = getInviteLink(invite); const subject = encodeURIComponent("You're invited to join our Tiny Titans family"); const body = encodeURIComponent(`You've been invited to join our Tiny Titans family account.\n\nOpen this secure invitation link:\n${link}\n\nThe invitation is matched to ${invite.targetEmail}. Sign in or create your Tiny Titans account using that email, then accept the invitation.`); window.open(`mailto:${encodeURIComponent(invite.targetEmail)}?subject=${subject}&body=${body}`, "_self"); setMessage("Your email app has been opened with the secure family invitation ready to send."); }

  if (!user) return null;
  if (loading) return <div className="page-container"><BackHomeButton /><div className="welcome-card"><h1>👨‍👩‍👦 Loading Tiny Titans Family…</h1></div></div>;

  return <section className="my-account-page"><BackHomeButton /><div className="my-account-card"><div className="my-account-header"><div className="my-account-avatar">👨‍👩‍👦</div><div><h1>Tiny Titans Family</h1><p>One shared reptile record, with an intelligent experience for every family member.</p></div></div>
    {message && <div className="creator-success" role="status"><p>{message}</p></div>}{error && <div className="creator-error" role="alert"><p>{error}</p></div>}
    {linkInvite && <div className="account-section"><h2>🔗 You've Been Invited</h2><p>This secure Tiny Titans invitation is matched to your signed-in email. If you arrived here before creating an account, the invitation is remembered on this device so it can be picked up after sign-in.</p><div className="account-detail"><span>Family invitation</span><strong>Secure email-matched invitation</strong></div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void accept(linkInvite.id)}>👨‍👩‍👦 Accept Family Invitation</button><button type="button" className="account-button" disabled={busy} onClick={() => setSearchParams({})}>Not now</button></div>}
    {invites.length > 0 && <div className="account-section"><h2>📨 Family Invitations</h2>{invites.map((invite) => <div className="account-detail" key={invite.id}><div><strong>Tiny Titans Family</strong><p className="account-button-subtext">You've been invited to share a family reptile record.</p></div><div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void accept(invite.id)}>✅ Accept</button><button type="button" className="account-button" disabled={busy} onClick={() => void decline(invite.id)}>Decline</button></div></div>)}</div>}
    {!family ? <div className="account-section"><h2>Build Your Family Account</h2><p>Keep each person on their own secure login while sharing the same Tiny Titans snakes, feeding records, weights, sheds and breeding data.</p><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void startFamily()}>👨‍👩‍👦 Create Family Account</button></div> : <>
      <div className="account-section"><h2>👨‍👩‍👦 Your Family</h2><div className="account-detail"><span>Family links</span><strong>{Math.max(0, family.memberUids.length - 1)} / 2 used</strong></div>{family.members.map((member) => <div className="account-detail" key={member.uid}><div><strong>{member.displayName}</strong><p className="account-button-subtext">{member.role === "owner" ? "Family Owner" : member.role === "child" ? "Child profile" : "Adult profile"} · {member.experienceLevel || "beginner"}</p></div><div>{member.uid !== family.ownerUid && family.ownerUid === user.uid && <button type="button" className="account-button" disabled={busy} onClick={() => void selectMember(member.uid)}>⚙️ Permissions</button>}{member.uid !== family.ownerUid && family.ownerUid === user.uid && <button type="button" className="account-button" disabled={busy} onClick={() => void remove(member.uid)}>Remove</button>}</div></div>)}</div>
      {selectedMember && permissions && family.ownerUid === user.uid && <div className="account-section"><div className="account-detail"><div><h2>🛡️ Family Permissions</h2><p className="account-button-subtext">Control what this member can do. <strong>Allow</strong> is immediate, <strong>Deny</strong> blocks the action, and <strong>Verify</strong> sends a proposed change to Family Approval before it becomes official.</p></div><button type="button" className="account-button" disabled={busy} onClick={() => void resetPermissions()}>Reset recommended</button></div><div className="creator-list">{permissionAreas.map((area) => <div className="account-section" key={area.id}><h3>{area.icon} {area.label}</h3>{permissionActions.map((action) => { const key = `${area.id}.${action.id}` as FamilyPermissionKey; return <div className="account-detail" key={key}><span>{action.label}</span><select className="account-input" value={permissions[key]} disabled={busy} onChange={(event) => void changePermission(key, event.target.value as PermissionMode)}>{modeOptions.map((mode) => <option key={mode} value={mode}>{mode === "allow" ? "🟢 Allow" : mode === "deny" ? "🔴 Deny" : "🟠 Verify"}</option>)}</select><small>{permissionLabel(permissions[key])}</small></div>; })}</div>)}</div></div>}
      {family.ownerUid === user.uid && family.memberUids.length < 3 && <div className="account-section"><h2>➕ Add Family Member</h2><p>Invite an existing Tiny Titans account or someone who has never used Tiny Titans. The secure link is matched to the invited email.</p><input className="account-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter email" autoComplete="email" /><button type="button" className="account-button account-button--highlight" disabled={busy || !email.trim()} onClick={() => void sendInvite()}>📨 Create Family Invitation</button></div>}
      {family.ownerUid === user.uid && outgoingInvites.length > 0 && <div className="account-section"><h2>🔗 Active Family Invitations</h2><p className="account-button-subtext">Each invitation is tied to its target email and stops working when revoked.</p>{outgoingInvites.map((invite) => <div className="account-detail" key={invite.id}><div><strong>{invite.targetEmail}</strong><p className="account-button-subtext">Pending invitation</p></div><div><button type="button" className="account-button" disabled={busy} onClick={() => void copyInviteLink(invite)}>Copy link</button><button type="button" className="account-button" disabled={busy} onClick={() => emailInvite(invite)}>Email</button><button type="button" className="account-button" disabled={busy} onClick={() => void revokeInvite(invite.id)}>Revoke</button></div></div>)}</div>}
      {family.ownerUid === user.uid && approvals.length > 0 && <div className="account-section"><h2>🛡️ Family Approvals</h2>{approvals.filter((item) => item.status === "pending").map((approval) => <div className="account-detail" key={approval.id}><div><strong>{approval.area} · {approval.action}</strong><p className="account-button-subtext">Requested by {approval.requesterName || approval.requesterUid}</p></div><div><button type="button" className="account-button account-button--highlight" disabled={busy} onClick={() => void decide(approval.id, "approved")}>✅ Approve</button><button type="button" className="account-button" disabled={busy} onClick={() => void decide(approval.id, "rejected")}>Reject</button></div></div>)}</div>}
      <div className="account-section"><h2>🔔 Family Notifications</h2><p>Each person controls notifications on their own device.</p><div className="account-detail"><span>Notification permission</span><strong>{notificationPermission === "granted" ? "Enabled" : notificationPermission === "denied" ? "Blocked" : notificationPermission === "unsupported" ? "Unsupported" : "Needs setup"}</strong></div>{notificationPermission !== "granted" && <button type="button" className="account-button account-button--highlight" disabled={busy || notificationPermission === "denied"} onClick={() => void enableFamilyNotifications()}>🔔 Enable notifications on this device</button>}</div>
    </>}
  </div></section>;
}
