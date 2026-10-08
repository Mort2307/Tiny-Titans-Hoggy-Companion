import { useCallback, useEffect, useMemo, useState } from "react";
import type { RescueRole } from "../../types/rescue";
import {
import TinyTitansIcon from "../TinyTitansIcon";
  clearRescueStaffInvitation,
  editOrganisationStaffHistory,
  getMyRescueWorkspace,
  getRescueStaffManagement,
  inviteRescueStaff,
  resendRescueStaffInvitation,
  updateRescueStaffRole,
  type RescueStaffInvitation,
  type StaffHistoryEntry,
} from "../../services/rescueWorkspaceService";
import {
  clearBusinessStaffMember,
  getBusinessStaffManagement,
  saveBusinessStaffMember,
  type BusinessStaffMember,
} from "../../services/paidBusinessService";
import "../../styles/organisation-staff.css";

const RESCUE_ROLE_LABELS: Record<Exclude<RescueRole, "owner"> | "owner", string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  staff: "Staff",
  medical: "Medical / Vet",
  foster: "Foster",
  viewer: "Viewer / Volunteer",
};
const BUSINESS_ROLE_LABELS: Record<string, string> = { member: "Team member", manager: "Manager", staff: "Staff", viewer: "Viewer" };
type Mode = "rescue" | "business";
type RescueMember = { uid: string; email: string; displayName: string; role: RescueRole };

function formatDate(value: number | null | undefined, time = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return time ? date.toLocaleString("en-GB") : date.toLocaleDateString("en-GB");
}
function actionKey(value: string) { return value.replaceAll(" ", "_").toLowerCase(); }
function actionLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
function invitationUrl(invitationId: string) { return `${window.location.origin}/rescue/team?invite=${encodeURIComponent(invitationId)}`; }

function simplifyHistory(entries: StaffHistoryEntry[]): StaffHistoryEntry[] {
  return entries
    .filter((entry) => actionKey(entry.action) !== "deleted")
    .map((entry) => {
      if (actionKey(entry.action) === "status_changed" && actionKey(entry.toStatus || "") === "cleared") {
        return { ...entry, action: "cleared" };
      }
      return entry;
    });
}

export default function OrganisationStaffManager({ mode }: { mode: Mode }) {
  const [rescueName, setRescueName] = useState("");
  const [rescueId, setRescueId] = useState("");
  const [rescueMembers, setRescueMembers] = useState<RescueMember[]>([]);
  const [rescueInvitations, setRescueInvitations] = useState<RescueStaffInvitation[]>([]);
  const [businessMembers, setBusinessMembers] = useState<BusinessStaffMember[]>([]);
  const [history, setHistory] = useState<StaffHistoryEntry[]>([]);
  const [roleManage, setRoleManage] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(mode === "rescue" ? "staff" : "member");
  const [inviteNote, setInviteNote] = useState("");
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [historyNoteDrafts, setHistoryNoteDrafts] = useState<Record<string, string>>({});
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (mode === "rescue") {
        const workspace = await getMyRescueWorkspace();
        if (!workspace.organisation) throw new Error("No Rescue organisation is attached to this account.");
        setRescueName(workspace.organisation.name);
        setRescueId(workspace.organisation.id);
        const result = await getRescueStaffManagement(workspace.organisation.id);
        setRescueMembers(result.members);
        setRescueInvitations(result.invitations.filter((item) => item.status === "pending"));
        setHistory(simplifyHistory(result.history));
      } else {
        const result = await getBusinessStaffManagement();
        setBusinessMembers(result.members);
        setRoleManage(result.roleManage);
        setHistory(simplifyHistory(result.history));
      }
    } catch (error) {
      setMessage(errorMessage(error, "Staff workspace could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const members = mode === "rescue" ? rescueMembers : businessMembers;
    return {
      active: members.length,
      pending: mode === "rescue" ? rescueInvitations.length : businessMembers.filter((member) => member.status === "invited").length,
      history: history.length,
    };
  }, [businessMembers, history.length, mode, rescueInvitations.length, rescueMembers]);

  async function rescueInvite() {
    if (mode !== "rescue" || !rescueId || !inviteEmail.trim()) return;
    setBusyKey("invite"); setMessage("");
    try {
      await inviteRescueStaff(rescueId, inviteEmail, inviteRole as Exclude<RescueRole, "owner">);
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteNote("");
      setMessage("Invitation created and email queued.");
      await load();
    } catch (error) { setMessage(errorMessage(error, "Rescue invitation failed.")); }
    finally { setBusyKey(""); }
  }

  async function resendRescue(invitation: RescueStaffInvitation) {
    if (!rescueId) return;
    setBusyKey(`resend-${invitation.id}`); setMessage("");
    try {
      await resendRescueStaffInvitation(rescueId, invitation.id);
      setMessage(`Invitation email re-sent to ${invitation.email}.`);
      await load();
    } catch (error) { setMessage(errorMessage(error, "Invitation email could not be re-sent.")); }
    finally { setBusyKey(""); }
  }

  async function copyRescueLink(invitation: RescueStaffInvitation) {
    try {
      await navigator.clipboard.writeText(invitationUrl(invitation.id));
      setMessage("Invitation link copied.");
    } catch {
      setMessage("The invitation link could not be copied on this device.");
    }
  }

  async function clearRescue(invitation: RescueStaffInvitation) {
    if (!rescueId) return;
    setBusyKey(`clear-${invitation.id}`); setMessage("");
    try { await clearRescueStaffInvitation(rescueId, invitation.id); setMessage(`${invitation.email} invitation cleared.`); await load(); }
    catch (error) { setMessage(errorMessage(error, "Invitation could not be cleared.")); }
    finally { setBusyKey(""); }
  }

  async function changeRescueRole(member: RescueMember, role: Exclude<RescueRole, "owner">) {
    if (!rescueId || member.role === "owner" || busyKey) return;
    setBusyKey(`role-${member.uid}`); setMessage("");
    try { await updateRescueStaffRole(rescueId, member.uid, role); setMessage(`${member.email || member.displayName} is now ${RESCUE_ROLE_LABELS[role]}.`); await load(); }
    catch (error) { setMessage(errorMessage(error, "Staff role could not be updated.")); }
    finally { setBusyKey(""); }
  }

  function editBusiness(member: BusinessStaffMember) {
    setEditingBusinessId(member.id);
    setInviteEmail(member.email);
    setInviteDisplayName(member.displayName || "");
    setInviteRole(member.role || "member");
    setInviteNote(member.note || "");
  }

  function startNewBusinessMember() {
    setEditingBusinessId(null);
    setInviteEmail(""); setInviteDisplayName(""); setInviteRole("member"); setInviteNote("");
  }

  async function saveBusiness() {
    if (mode !== "business" || !inviteEmail.trim()) return;
    setBusyKey("business-save"); setMessage("");
    try {
      await saveBusinessStaffMember({ id: editingBusinessId || undefined, email: inviteEmail, displayName: inviteDisplayName, role: inviteRole, note: inviteNote, status: editingBusinessId ? undefined : "invited" });
      setMessage(editingBusinessId ? "Team member updated." : "Team member invitation record created.");
      startNewBusinessMember();
      await load();
    } catch (error) { setMessage(errorMessage(error, "Business staff record could not be saved.")); }
    finally { setBusyKey(""); }
  }

  async function clearBusiness(member: BusinessStaffMember) {
    setBusyKey(`business-clear-${member.id}`); setMessage("");
    try { await clearBusinessStaffMember(member.id); if (editingBusinessId === member.id) startNewBusinessMember(); setMessage(`${member.email} team record cleared.`); await load(); }
    catch (error) { setMessage(errorMessage(error, "Business team record could not be cleared.")); }
    finally { setBusyKey(""); }
  }

  async function saveHistoryNote(entry: StaffHistoryEntry) {
    const value = historyNoteDrafts[entry.id] ?? entry.note ?? "";
    setBusyKey(`history-${entry.id}`); setMessage("");
    try {
      await editOrganisationStaffHistory(mode, mode === "rescue" ? rescueId : entry.organisationId, entry.id, value);
      setMessage("History note updated.");
      setEditingHistoryId(null);
      await load();
    } catch (error) { setMessage(errorMessage(error, "History note could not be updated.")); }
    finally { setBusyKey(""); }
  }

  const title = mode === "rescue" ? `${rescueName || "Rescue"} staff` : "Business staff & access";
  const description = mode === "rescue"
    ? "Invite staff, manage roles and keep a simple record of important team changes."
    : "Manage team records, roles and important access changes in one place.";

  return <main className="organisation-staff-page">
    <header className="organisation-staff-hero">
      <div><span className="organisation-staff-eyebrow">{mode === "rescue" ? "RESCUE · PEOPLE & PERMISSIONS" : "BUSINESS · PEOPLE & PERMISSIONS"}</span><h1>{title}</h1><p>{description}</p></div>
      {mode === "business" && <button className="organisation-staff-secondary" type="button" onClick={startNewBusinessMember}><TinyTitansIcon name="add" size={14} /> New team member</button>}
    </header>

    {message && <div className={`organisation-staff-message ${/failed|could not|error|not found|denied|unable/i.test(message) ? "is-error" : "is-success"}`} role="status">{message}</div>}

    <section className="organisation-staff-stat-grid"><article><span>Current staff</span><strong>{stats.active}</strong></article><article><span>Pending / invited</span><strong>{stats.pending}</strong></article><article><span>History</span><strong>{stats.history}</strong></article></section>

    {mode === "rescue" && rescueInvitations.length > 0 && <section className="organisation-staff-card"><div className="organisation-staff-card-heading"><div><span className="organisation-staff-eyebrow">PENDING INVITATIONS</span><h2>Waiting for acceptance</h2><p>Resend the email, copy the direct link, or clear the invitation.</p></div></div><div className="organisation-staff-list">{rescueInvitations.map((invitation) => <article className="organisation-staff-row" key={invitation.id}><div className="organisation-staff-avatar"><TinyTitansIcon name="messages" size={18} /></div><div className="organisation-staff-row-main"><strong>{invitation.email}</strong><small>{RESCUE_ROLE_LABELS[invitation.role as keyof typeof RESCUE_ROLE_LABELS] || actionLabel(invitation.role)} · expires {formatDate(invitation.expiresAt)}</small></div><div className="organisation-staff-row-actions"><button type="button" onClick={() => void resendRescue(invitation)} disabled={busyKey !== ""}>{busyKey === `resend-${invitation.id}` ? "Sending…" : "Resend email"}</button><button type="button" onClick={() => void copyRescueLink(invitation)} disabled={busyKey !== ""}>Copy link</button><button className="organisation-staff-danger" type="button" onClick={() => void clearRescue(invitation)} disabled={busyKey !== ""}>{busyKey === `clear-${invitation.id}` ? "Clearing…" : "Clear"}</button></div></article>)}</div></section>}

    <section className="organisation-staff-card"><div className="organisation-staff-card-heading"><div><span className="organisation-staff-eyebrow">{mode === "rescue" ? "INVITE TEAM" : "TEAM RECORD"}</span><h2>{mode === "rescue" ? "Add a staff member" : editingBusinessId ? "Edit team member" : "Add a team member"}</h2><p>{mode === "rescue" ? "Each person keeps their own TinyTitans account; organisation access is separate." : "Business staff records are owned by the Business workspace rather than the personal keeper profile."}</p></div></div><div className="organisation-staff-form-grid"><label>Email<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="team.member@example.com" /></label><label>Name / display name<input value={inviteDisplayName} onChange={(event) => setInviteDisplayName(event.target.value)} placeholder="Optional" /></label><label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>{Object.entries(mode === "rescue" ? RESCUE_ROLE_LABELS : BUSINESS_ROLE_LABELS).filter(([key]) => key !== "owner").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="organisation-staff-form-span">Internal note<textarea value={inviteNote} onChange={(event) => setInviteNote(event.target.value)} placeholder="Role context or access details…" /></label></div><div className="organisation-staff-actions">{mode === "rescue" ? <button type="button" onClick={() => void rescueInvite()} disabled={busyKey !== "" || !inviteEmail.trim()}>{busyKey === "invite" ? "Creating…" : "Invite staff member"}</button> : <><button type="button" onClick={() => void saveBusiness()} disabled={busyKey !== "" || !inviteEmail.trim()}>{busyKey === "business-save" ? "Saving…" : editingBusinessId ? "Save team member" : "Create invitation record"}</button>{editingBusinessId && <button className="organisation-staff-secondary" type="button" onClick={startNewBusinessMember}>Cancel edit</button>}</>}</div></section>

    <section className="organisation-staff-card"><div className="organisation-staff-card-heading"><div><span className="organisation-staff-eyebrow">CURRENT STAFF</span><h2>People with workspace access</h2></div></div>{loading ? <p>Loading staff…</p> : mode === "rescue" ? <div className="organisation-staff-list">{rescueMembers.map((member) => <article className="organisation-staff-row" key={member.uid}><div className="organisation-staff-avatar"><TinyTitansIcon name={member.role === "medical" ? "vet" : member.role === "manager" ? "account" : "community"} size={18} /></div><div className="organisation-staff-row-main"><strong>{member.displayName || member.email || member.uid}</strong><small>{member.email || "Email unavailable"}</small></div><div className="organisation-staff-inline-controls">{member.role === "owner" ? <span className="organisation-staff-role-badge">Owner / Admin</span> : <select value={member.role} onChange={(event) => void changeRescueRole(member, event.target.value as Exclude<RescueRole, "owner">)} disabled={!roleManage || busyKey !== ""}><option value="manager">Manager</option><option value="staff">Staff</option><option value="medical">Medical / Vet</option><option value="foster">Foster</option><option value="viewer">Viewer / Volunteer</option></select>}</div></article>)}{!rescueMembers.length && <div className="organisation-staff-empty">No current Rescue staff members found.</div>}</div> : <div className="organisation-staff-list">{businessMembers.map((member) => <article className="organisation-staff-row" key={member.id}><div className="organisation-staff-avatar"><TinyTitansIcon name={member.status === "invited" ? "messages" : "account"} size={18} /></div><div className="organisation-staff-row-main"><strong>{member.displayName || member.email}</strong><small>{member.email} · {BUSINESS_ROLE_LABELS[member.role] || actionLabel(member.role)} · {actionLabel(member.status)}</small>{member.note && <span className="organisation-staff-note-preview">{member.note}</span>}</div><div className="organisation-staff-row-actions"><button type="button" onClick={() => editBusiness(member)}>Edit</button><button className="organisation-staff-danger" type="button" onClick={() => void clearBusiness(member)} disabled={busyKey !== ""}>Clear</button></div></article>)}{!businessMembers.length && <div className="organisation-staff-empty">No Business team records yet.</div>}</div>}</section>

    <section className="organisation-staff-card"><div className="organisation-staff-card-heading"><div><span className="organisation-staff-eyebrow">STAFF HISTORY</span><h2>Important changes</h2><p>System timestamps and actors stay unchanged. Low-level delete entries are hidden so the history shows the meaningful staff change.</p></div></div><div className="organisation-staff-history">{loading ? <p>Loading history…</p> : history.length ? history.map((entry) => <article className="organisation-staff-history-row" key={entry.id}><div><div className="organisation-staff-history-top"><strong>{actionLabel(entry.action)}</strong><span>{formatDate(entry.createdAt)}</span></div><p>{entry.subjectName || entry.subjectEmail || "Staff record"}{entry.subjectEmail && entry.subjectName ? ` · ${entry.subjectEmail}` : ""}</p><small>{entry.fromRole && entry.toRole && entry.fromRole !== entry.toRole ? `${actionLabel(entry.fromRole)} to ${actionLabel(entry.toRole)}` : ""}{entry.fromStatus || entry.toStatus ? `${entry.fromRole && entry.toRole && entry.fromRole !== entry.toRole ? " · " : ""}${entry.fromStatus || "—"} to ${entry.toStatus || "—"}` : ""}</small></div>{editingHistoryId === entry.id ? <div className="organisation-staff-history-editor"><textarea value={historyNoteDrafts[entry.id] ?? entry.note ?? ""} onChange={(event) => setHistoryNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder="Add a note…" /><div className="organisation-staff-row-actions"><button type="button" onClick={() => void saveHistoryNote(entry)} disabled={busyKey !== ""}>{busyKey === `history-${entry.id}` ? "Saving…" : "Save note"}</button><button className="organisation-staff-secondary" type="button" onClick={() => setEditingHistoryId(null)} disabled={busyKey !== ""}>Cancel</button></div></div> : <div className="organisation-staff-history-note"><span>{entry.note || ""}</span><button className="organisation-staff-secondary" type="button" onClick={() => setEditingHistoryId(entry.id)}>Edit note</button></div>}</article>) : <div className="organisation-staff-empty">New important staff changes will appear here.</div>}</div></section>
  </main>;
}
