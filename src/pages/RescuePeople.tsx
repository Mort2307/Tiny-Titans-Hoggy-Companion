import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useAuth } from "../context/useAuth";
import { getRescueAccess } from "../services/rescueService";
import { getMyRescueWorkspace, getRescueTeam, inviteRescueStaff } from "../services/rescueWorkspaceService";
import { getRescueApplicationQueue, getRescueCommunity, updateRescueApplication } from "../services/rescueCommunityService";
import { getRescueSetupState } from "../services/rescueSetupService";
import type { RescueApplication, RescueOrganisation, RescueRole } from "../types/rescue";
import "../styles/rescue.css";
import "../styles/rescue-community.css";

const staffRoleLabels: Record<Exclude<RescueRole, "owner" | "foster" | "viewer">, string> = { manager: "Manager", staff: "Staff", medical: "Medical / Vet" };
const tabLabels = { staff: "Staff", community: "Community", applications: "Applications" } as const;
type Tab = keyof typeof tabLabels;

function formatDate(value: number | null | undefined) { return value ? new Date(value).toLocaleString("en-GB") : "—"; }

export default function RescuePeople() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [org, setOrg] = useState<RescueOrganisation | null>(null);
  const [team, setTeam] = useState<Array<{ uid:string; email:string; displayName:string; role:RescueRole }>>([]);
  const [community, setCommunity] = useState<Array<{ uid:string; email:string; displayName:string; relationship:"viewer"|"foster"; joinedAt:number|null; updatedAt:number|null }>>([]);
  const [applications, setApplications] = useState<RescueApplication[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<RescueRole, "owner" | "foster" | "viewer">>("staff");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = requestedTab && requestedTab in tabLabels ? requestedTab : "staff";

  const load = useCallback(async () => {
    if (!user) return;
    const workspace = await getMyRescueWorkspace();
    setOrg(workspace.organisation);
    setSetupComplete(null);
    if (!workspace.organisation) return;
    const access = getRescueAccess(workspace.organisation, user.uid);
    if (!access.canManageOrganisation) return;
    const setup = await getRescueSetupState(workspace.organisation.id);
    setSetupComplete(setup.organisation.setupComplete);
    if (!setup.organisation.setupComplete) return;
    const [nextTeam, nextCommunity, nextApplications] = await Promise.all([
      getRescueTeam(workspace.organisation.id),
      getRescueCommunity(workspace.organisation.id),
      getRescueApplicationQueue(workspace.organisation.id)
    ]);
    setTeam(nextTeam); setCommunity(nextCommunity); setApplications(nextApplications);
  }, [user]);

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load Rescue people.")); }, [load]);
  const access = getRescueAccess(org, user?.uid);
  const pending = useMemo(() => applications.filter((item) => item.status === "pending"), [applications]);

  async function invite() {
    if (!org || !email.trim() || !access.canManageOrganisation) return;
    setBusy(true); setMessage("");
    try { await inviteRescueStaff(org.id, email.trim(), inviteRole); setEmail(""); await load(); setMessage("Staff invitation sent."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Staff invitation failed."); }
    finally { setBusy(false); }
  }
  async function decide(application: RescueApplication, status: "approved" | "declined") {
    if (!org || !access.canManageOrganisation) return;
    setBusy(true); setMessage("");
    try { await updateRescueApplication(org.id, application.id, status); await load(); setMessage(`${application.applicationType === "foster" ? "Foster" : "Adoption"} application ${status}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Application decision failed."); }
    finally { setBusy(false); }
  }

  if (!user || !org || !access.canManageOrganisation) return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page"><section className="rescue-card"><span className="rescue-eyebrow">PEOPLE & ACCESS</span><h1>Rescue management access required</h1><p>Only Rescue owners and managers can manage staff, community members and applications.</p><Link className="rescue-primary-link" to="/rescue">Back to Rescue →</Link></section></main></PaidTierGate>;
  if (setupComplete === null) return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page"><section className="rescue-card"><p>Checking Rescue setup…</p></section></main></PaidTierGate>;
  if (!setupComplete) return <Navigate to="/rescue" replace state={{ setupRequired:true, from:"/rescue/team" }} />;

  return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page">
    <header className="rescue-subhead"><Link to="/rescue">← Rescue Centre</Link><div><span className="rescue-eyebrow">PEOPLE & ACCESS</span><h1><TinyTitansIcon name="health" size={35}/> {org.name}</h1><p>Staff permissions stay separate from the people who follow, foster for, or apply to adopt from your Rescue.</p></div></header>
    {message && <div className="rescue-message" role="status">{message}</div>}
    <nav className="rescue-card rescue-people-tabs" aria-label="Rescue people sections">
      {(Object.keys(tabLabels) as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setSearchParams({ tab: item })}>{tabLabels[item]}{item === "applications" && pending.length ? ` · ${pending.length}` : ""}</button>)}
    </nav>
    {tab === "staff" && <>
      <section className="rescue-card"><span className="rescue-eyebrow">STAFF ACCESS</span><h2>Invite internal Rescue staff</h2><p className="rescue-form-hint">These are the people who can access the operational Rescue workspace. Foster carers and community viewers are managed separately.</p><div className="rescue-form-grid"><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff.member@example.com" /></label><label>Staff role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>{Object.entries(staffRoleLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div><button type="button" onClick={() => void invite()} disabled={busy || !email.trim()}>{busy ? "Sending…" : "Invite staff member"}</button></section>
      <section className="rescue-card"><span className="rescue-eyebrow">INTERNAL TEAM</span><h2>{team.length} staff member{team.length === 1 ? "" : "s"}</h2><div className="rescue-animal-list">{team.map((member) => <article className="rescue-animal-row" key={member.uid}><span>👤</span><span><strong>{member.displayName || member.email}</strong><small>{member.email}</small></span><span>{member.role === "owner" ? "Owner / Admin" : staffRoleLabels[member.role as keyof typeof staffRoleLabels] || member.role}</span></article>)}{!team.length && <div className="rescue-empty"><strong>No internal staff recorded</strong><span>Accepted staff invitations appear here.</span></div>}</div></section>
    </>}
    {tab === "community" && <>
      <section className="rescue-card"><span className="rescue-eyebrow">RESCUE COMMUNITY</span><h2>Viewers and foster carers</h2><p>Community relationships are not staff permissions. They let keepers follow your Rescue and progress towards fostering or adoption without opening the operational workspace.</p><div className="rescue-detail-grid"><div><small>Viewers / supporters</small><strong>{community.filter((item) => item.relationship === "viewer").length}</strong></div><div><small>Foster carers</small><strong>{community.filter((item) => item.relationship === "foster").length}</strong></div></div></section>
      <section className="rescue-card"><div className="rescue-animal-list">{community.map((member) => <article className="rescue-animal-row" key={member.uid}><span>{member.relationship === "foster" ? "🏠" : "👀"}</span><span><strong>{member.displayName || member.email}</strong><small>{member.email} · Joined {formatDate(member.joinedAt)}</small></span><span>{member.relationship === "foster" ? "Foster carer" : "Viewer / Supporter"}</span></article>)}{!community.length && <div className="rescue-empty"><strong>No community members yet</strong><span>People can join from your public Rescue profile.</span></div>}</div></section>
      <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC ENTRY POINT</span><h2>Let keepers join from the Rescue profile</h2><p>Share the public Rescue page. A keeper can create or use their TinyTitans account, join as a viewer, then apply to foster or adopt.</p><Link className="rescue-primary-link" to={`/rescue/public/${org.id}`}>Open public Rescue profile →</Link></section>
    </>}
    {tab === "applications" && <section className="rescue-card"><span className="rescue-eyebrow">APPLICATIONS</span><h2>Foster and adoption applications</h2><p>Review applications here. Approving a foster application creates a foster-carer relationship; it never grants staff permissions.</p><div className="rescue-animal-list">{applications.map((application) => <article className="rescue-animal-row" key={application.id}><span>{application.applicationType === "foster" ? "🏠" : "❤️"}</span><span><strong>{application.applicantName || application.applicantEmail}</strong><small>{application.applicationType === "foster" ? "Foster application" : "Adoption application"}{application.animalName ? ` · ${application.animalName}` : ""} · {formatDate(application.submittedAt)}</small></span><span>{application.status === "pending" ? <span className="rescue-inline"><button type="button" disabled={busy} onClick={() => void decide(application, "approved")}>Approve</button><button type="button" disabled={busy} onClick={() => void decide(application, "declined")}>Decline</button></span> : application.status}</span></article>)}{!applications.length && <div className="rescue-empty"><strong>No applications yet</strong><span>Applications submitted from the public Rescue profile will appear here.</span></div>}</div></section>}
  </main></PaidTierGate>;
}
