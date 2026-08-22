import { useCallback, useEffect, useState } from "react";
import { listMentorApplications, reviewMentorApplication, type MentorApplicationRecord, type MentorReviewDecision } from "../../services/mentorAdminRepository";
import { useAuth } from "../../context/useAuth";

const decisions: { id: MentorReviewDecision; label: string }[] = [
  { id: "approved", label: "Approve mentor" },
  { id: "needs-more-evidence", label: "Request more evidence" },
  { id: "declined", label: "Decline" },
];

type Props = { isAdmin: boolean };

export default function MentorApplicationReview({ isAdmin }: Props) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<MentorApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setError(null);
    try { setApplications(await listMentorApplications("submitted")); }
    catch (e) { setError(e instanceof Error ? e.message : "Mentor applications could not be loaded."); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (applicationId: string, decision: MentorReviewDecision) => {
    if (!user) return;
    setLoading(true); setError(null);
    try { await reviewMentorApplication(applicationId, user.uid, decision, notes[applicationId]?.trim() || "Reviewed by TTHC admin."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "The mentor review could not be saved."); setLoading(false); }
  };

  if (!isAdmin) return null;
  return <section className="kmb-admin-review"><div className="kmb-network-heading"><div><span className="kmb-label">CREATOR CENTRE · MENTOR REVIEW</span><h2>Mentor applications</h2><p>Review experience, evidence and conduct before a mentor becomes visible in the community directory.</p></div><span className="kmb-network-status">🔐 Admin only</span></div>{error && <div className="kmb-network-error">⚠️ {error}</div>}{loading && !applications.length ? <div className="kmb-admin-empty">Loading applications…</div> : applications.length ? <div className="kmb-admin-list">{applications.map((application) => <article className="kmb-admin-card" key={application.id}><div className="kmb-admin-card-head"><div><strong>Applicant {application.applicantId.slice(0, 8)}…</strong><small>Requested: {application.requestedVerification}</small></div><span>{application.status}</span></div><p>{application.experienceSummary || "No experience summary supplied yet."}</p>{application.breedingExperience ? <p><strong>Breeding:</strong> {application.breedingExperience}</p> : null}{application.evidenceNotes ? <p><strong>Evidence:</strong> {application.evidenceNotes}</p> : null}<textarea value={notes[application.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Review note / evidence request…" /> <div className="kmb-admin-actions">{decisions.map((decision) => <button type="button" className={decision.id === "approved" ? "kmb-primary-button" : "kmb-secondary"} disabled={loading} onClick={() => void decide(application.id, decision.id)} key={decision.id}>{decision.label}</button>)}</div></article>)}</div> : <div className="kmb-admin-empty">No submitted mentor applications are waiting for review.</div>}</section>;
}
