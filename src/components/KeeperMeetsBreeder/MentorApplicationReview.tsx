import { useCallback, useEffect, useState } from "react";
import { listMentorApplications, reviewMentorApplication, type MentorApplicationRecord, type MentorReviewDecision } from "../../services/mentorAdminRepository";
import { listPublishedMentorsForAdmin, updatePublishedMentorRoles, type PublishedMentor } from "../../services/mentorDirectoryRepository";
import { useAuth } from "../../context/useAuth";
import type { MentorRole } from "../../services/mentorNetwork";

const decisions: { id: MentorReviewDecision; label: string }[] = [
  { id: "approved", label: "Approve mentor" },
  { id: "needs-more-evidence", label: "Request more evidence" },
  { id: "declined", label: "Decline" },
];

type Props = { isAdmin: boolean };

export default function MentorApplicationReview({ isAdmin }: Props) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<MentorApplicationRecord[]>([]);
  const [publishedMentors, setPublishedMentors] = useState<PublishedMentor[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, MentorRole[]>>({});

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setError(null);
    try {
      const [pending, published] = await Promise.all([
        listMentorApplications(["submitted", "needs-more-evidence"]),
        listPublishedMentorsForAdmin(),
      ]);
      setApplications(pending);
      setPublishedMentors(published);
      setRoleDrafts(Object.fromEntries(published.map((mentor) => [mentor.id, mentor.mentorRoles?.length ? mentor.mentorRoles : ["keeper"]])));
    } catch (e) { setError(e instanceof Error ? e.message : "Mentor applications could not be loaded."); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (applicationId: string, decision: MentorReviewDecision) => {
    if (!user) return;
    setLoading(true); setError(null);
    try { await reviewMentorApplication(applicationId, user.uid, decision, notes[applicationId]?.trim() || (decision === "needs-more-evidence" ? "Please provide more evidence for the areas selected." : "Reviewed by TTHC admin.")); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentor review could not be saved."); setLoading(false); }
  };

  const saveRoles = async (mentorId: string) => {
    const roles = roleDrafts[mentorId] ?? [];
    if (!roles.length) return setError("Keep at least one mentor role. If this person should no longer be a mentor, remove the published mentor profile instead.");
    setRoleSavingId(mentorId); setError(null);
    try { await updatePublishedMentorRoles(mentorId, roles); setPublishedMentors((current) => current.map((mentor) => mentor.id === mentorId ? { ...mentor, mentorRoles: roles } : mentor)); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentor roles could not be updated."); }
    finally { setRoleSavingId(""); }
  };

  const toggleDraftRole = (mentorId: string, role: MentorRole) => setRoleDrafts((current) => ({ ...current, [mentorId]: (current[mentorId] ?? []).includes(role) ? (current[mentorId] ?? []).filter((item) => item !== role) : [...(current[mentorId] ?? []), role] }));

  if (!isAdmin) return null;
  return <section className="kmb-admin-review">
    <div className="kmb-network-heading"><div><span className="kmb-label">CREATOR CENTRE · MENTOR REVIEW</span><h2>Mentor applications</h2><p>Review actual experience, selected mentor role(s), specialities and conduct before publication.</p></div><span className="kmb-network-status">🔐 Admin only</span></div>
    {error && <div className="kmb-network-error">⚠️ {error}</div>}
    {loading && !applications.length && !publishedMentors.length ? <div className="kmb-admin-empty">Loading mentor review…</div> : <>
      {applications.length ? <div className="kmb-admin-list">{applications.map((application) => <article className="kmb-admin-card" key={application.id}>
        <div className="kmb-admin-card-head"><div><strong>Applicant {application.applicantId.slice(0, 8)}…</strong><small>{application.experienceYears} year{application.experienceYears === 1 ? "" : "s"} · Requested: {application.requestedVerification}</small></div><span>{application.status}</span></div>
        <div className="kmb-focus-list"><span>🧑‍🏫 Roles: {application.mentorRoles?.map((role) => role === "keeper" ? "Keeper Mentor" : "Breeder Mentor").join(" + ") || "Legacy application"}</span><span>🎯 Specialities: {application.specialities.join(", ") || "None supplied"}</span><span>🤝 Conduct: {application.conductAccepted ? "Accepted" : "Not accepted"}</span></div>
        <p><strong>Experience:</strong> {application.experienceSummary || "No experience summary supplied yet."}</p>
        {application.breedingExperience ? <p><strong>Breeding:</strong> {application.breedingExperience}</p> : null}
        {application.evidenceNotes ? <p><strong>Evidence:</strong> {application.evidenceNotes}</p> : null}
        <textarea value={notes[application.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Review note, approval context or evidence request…" />
        <div className="kmb-admin-actions">{decisions.map((decision) => <button type="button" className={decision.id === "approved" ? "kmb-primary-button" : "kmb-secondary"} disabled={loading} onClick={() => void decide(application.id, decision.id)} key={decision.id}>{decision.label}</button>)}</div>
      </article>)}</div> : <div className="kmb-admin-empty">No mentor applications are currently waiting for review.</div>}

      <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">PUBLISHED MENTORS</span><h2>Role management</h2><p>Keeper Mentor and Breeder Mentor are independent roles. This lets Creator Centre remove one role without deleting the other.</p></div></div><div className="kmb-admin-list">{publishedMentors.map((mentor) => <article className="kmb-admin-card" key={mentor.id}><div className="kmb-admin-card-head"><div><strong>{mentor.displayName}</strong><small>{mentor.experienceYears} year{mentor.experienceYears === 1 ? "" : "s"} · {mentor.verification}</small></div><span>Published</span></div><div className="kmb-record-grid">{(["keeper", "breeder"] as MentorRole[]).map((role) => <label className={`kmb-record ${(roleDrafts[mentor.id] ?? []).includes(role) ? "selected" : ""}`} key={role}><input type="checkbox" checked={(roleDrafts[mentor.id] ?? []).includes(role)} onChange={() => toggleDraftRole(mentor.id, role)} /><span><strong>{role === "keeper" ? "Keeper Mentor" : "Breeder Mentor"}</strong><small>{role === "keeper" ? "Keeper support role" : "Breeding/genetics/hatchling support role"}</small></span></label>)}</div><button type="button" className="kmb-primary-button" disabled={roleSavingId === mentor.id} onClick={() => void saveRoles(mentor.id)}>{roleSavingId === mentor.id ? "Saving…" : "Save mentor roles"}</button></article>)}{!publishedMentors.length && <div className="kmb-admin-empty">No published mentors yet.</div>}</div></section>
    </>}
  </section>;
}
