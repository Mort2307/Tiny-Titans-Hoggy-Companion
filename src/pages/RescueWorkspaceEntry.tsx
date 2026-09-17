import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RescueCentre } from "./RescuePages";
import { useAuth } from "../context/useAuth";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getMyRescueCommunityState, getPublicRescueProfile } from "../services/rescueCommunityService";
import type { RescueApplication, RescueRole } from "../types/rescue";
import "../styles/rescue.css";
import "../styles/rescue-community.css";

const STAFF_ROLES: RescueRole[] = ["owner", "manager", "staff", "medical"];
export default function RescueWorkspaceEntry() {
  const { user } = useAuth(); const [loading, setLoading] = useState(true); const [role, setRole] = useState<RescueRole|null>(null); const [orgId, setOrgId] = useState<string|null>(null); const [orgName, setOrgName] = useState(""); const [applications, setApplications] = useState<RescueApplication[]>([]); const [error, setError] = useState("");
  useEffect(() => { if (!user) { setLoading(false); return; } void getMyRescueWorkspace().then(async (workspace) => { setRole(workspace.role); setOrgId(workspace.organisation?.id || null); setOrgName(workspace.organisation?.name || "Rescue Centre"); if (workspace.organisation && workspace.role && !STAFF_ROLES.includes(workspace.role)) { const state = await getMyRescueCommunityState(workspace.organisation.id); setApplications(state.applications); } }).catch((err) => setError(err instanceof Error ? err.message : "Could not load Rescue access.")).finally(() => setLoading(false)); }, [user]);
  if (loading) return <main className="rescue-page"><section className="rescue-card"><p>Loading Rescue area…</p></section></main>;
  if (role && STAFF_ROLES.includes(role)) return <RescueCentre />;
  if (!orgId) return <RescueCentre />;
  return <main className="rescue-page"><header className="rescue-subhead"><div><span className="rescue-eyebrow">MY RESCUE CONNECTION</span><h1>{orgName}</h1><p>You are connected to this Rescue as a community member, not as staff.</p></div></header>{error && <div className="rescue-message rescue-message-error" role="alert">{error}</div>}<section className="rescue-card"><span className="rescue-eyebrow">COMMUNITY ACCESS</span><h2>{role === "foster" ? "Foster carer" : "Viewer / Supporter"}</h2><p>Community access is kept separate from the Rescue's private operational workspace. Your connection lets you follow the Rescue and manage foster or adoption applications.</p><div className="rescue-form-actions"><Link className="rescue-primary-link" to={`/rescue/public/${orgId}`}>Open Rescue profile →</Link>{role !== "foster" && <Link className="rescue-primary-link" to={`/rescue/public/${orgId}?apply=foster`}>Apply to foster</Link>}<Link className="rescue-primary-link" to={`/rescue/public/${orgId}?apply=adoption`}>Apply to adopt</Link></div></section>{applications.length > 0 && <section className="rescue-card"><span className="rescue-eyebrow">MY APPLICATIONS</span><div className="rescue-animal-list">{applications.map((application) => <article className="rescue-animal-row" key={application.id}><span>{application.applicationType === "foster" ? "🏠" : "❤️"}</span><span><strong>{application.applicationType === "foster" ? "Foster application" : `Adoption application${application.animalName ? ` · ${application.animalName}` : ""}`}</strong><small>{application.status} · {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-GB") : ""}</small></span><span>{application.status}</span></article>)}</div></section>}</main>;
}
