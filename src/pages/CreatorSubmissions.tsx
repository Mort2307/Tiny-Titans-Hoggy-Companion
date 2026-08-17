import { useEffect, useMemo, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageBackButton from "../components/PageBackButton";
import { approveMorphImageSubmission, getMorphImageSubmissions, rejectMorphImageSubmission } from "../services/creatorService";
import { isAwaitingMorphReview, canTransitionMorphSubmission, getMorphSubmissionActionLabel, validateMorphSubmissionForApproval } from "../services/morphSubmissionLifecycle";
import { storage } from "../firebase/config";
import type { MorphImageSubmission } from "../types/morphSubmission";
import "../styles/CreatorTools.css";

function formatDate(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
}

export default function CreatorSubmissions() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<MorphImageSubmission[]>([]);
  const [selected, setSelected] = useState<MorphImageSubmission | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setItems(await getMorphImageSubmissions()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load morph submissions."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (profile?.role === "admin" && user) void load(); }, [profile?.role, user]);

  useEffect(() => {
    if (!selected?.attachment?.path) { setImageUrl(""); return; }
    let active = true;
    getDownloadURL(ref(storage, selected.attachment.path)).then((url) => { if (active) setImageUrl(url); }).catch(() => { if (active) setImageUrl(""); });
    return () => { active = false; };
  }, [selected]);

  const visible = useMemo(() => filter === "pending" ? items.filter((item) => isAwaitingMorphReview(item.status)) : items, [filter, items]);
  const pendingCount = items.filter((item) => isAwaitingMorphReview(item.status)).length;

  async function approve() {
    if (!selected || !user) return;
    const validationError = validateMorphSubmissionForApproval(selected);
    if (validationError) { setError(validationError); return; }
    if (!canTransitionMorphSubmission(selected.status, "Approved")) { setError("This submission cannot transition to Approved from its current state."); return; }
    setWorking(true); setError(""); setSuccess("");
    try {
      await approveMorphImageSubmission(selected, user.uid);
      setSuccess(`Approved ${selected.morphName}. The image is now available to the Morph Library.`);
      setSelected(null); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Unable to approve this submission."); }
    finally { setWorking(false); }
  }

  async function reject() {
    if (!selected || !user) return;
    if (!canTransitionMorphSubmission(selected.status, "Rejected")) { setError("This submission cannot transition to Rejected from its current state."); return; }
    const reason = window.prompt("Optional rejection reason for the creator:", "") ?? "";
    if (reason === "") return;
    setWorking(true); setError(""); setSuccess("");
    try {
      await rejectMorphImageSubmission(selected.id, selected.attachment.path, user.uid, reason);
      setSuccess(`Rejected ${selected.morphName} and removed the submitted file from temporary storage.`);
      setSelected(null); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Unable to reject this submission."); }
    finally { setWorking(false); }
  }

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return <main className="creator-admin-page">
    <header className="creator-admin-header">
      <div><PageBackButton fallbackPath="/creator" label="Back to Creator Centre" /><span className="creator-admin-kicker">CREATOR CENTRE · MODERATION</span><h1>🧬 Morph Submission Review</h1><p>Inspect community-submitted morph photographs before they enter the public Morph Library.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button>
    </header>
    {error && <div className="creator-error">{error}</div>}
    {success && <div className="creator-success">✓ {success}</div>}
    <section className="creator-admin-section">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">SUBMISSION QUEUE</span><h2>{pendingCount} awaiting review</h2><p>Submitted files remain available here for review until approved or rejected.</p></div><label>Show <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="pending">Pending / Needs Info</option><option value="all">All submissions</option></select></label></div>
      {loading ? <div className="creator-loading">Loading submission files…</div> : visible.length === 0 ? <div className="creator-list-item"><strong>No submissions in this view.</strong><span>The queue is clear.</span></div> : <div className="creator-list">{visible.map((item) => <button key={item.id} type="button" className="creator-user-row" onClick={() => { setSelected(item); setError(""); setSuccess(""); }}><span className="creator-user-avatar">🧬</span><span className="creator-user-main"><strong>{item.morphName}</strong><small>{item.description || "No description provided"}</small></span><span className="creator-user-meta"><strong>{getMorphSubmissionActionLabel(item.status)}</strong><small>{formatDate(item.submittedAt)}</small></span><span>→</span></button>)}</div>}
    </section>
    {selected && <div className="creator-user-modal-backdrop" role="presentation" onClick={() => !working && setSelected(null)}><section className="creator-user-modal creator-submission-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">SUBMISSION REVIEW</span><h2>🧬 {selected.morphName}</h2><p>Submitted {formatDate(selected.submittedAt)} · {getMorphSubmissionActionLabel(selected.status)}</p></div><button type="button" onClick={() => setSelected(null)} disabled={working}>✕</button></div>
      {imageUrl ? <div className="creator-submission-preview"><img src={imageUrl} alt={`Submitted ${selected.morphName}`} /></div> : <div className="creator-list-item"><strong>Preview unavailable</strong><span>The submission record exists, but its temporary storage preview could not be opened. Approval can still use the stored file if it remains available.</span></div>}
      <div className="creator-user-detail-grid"><div><strong>Morph</strong><span>{selected.morphName}</span></div><div><strong>Canonical ID</strong><span>{selected.morphId || "Will be resolved during approval"}</span></div><div><strong>Submitter UID</strong><span>{selected.userId || "Not recorded"}</span></div><div><strong>Credit</strong><span>{selected.creditType === "anonymous" ? "Anonymous" : selected.creditName || selected.creditSocial || "Not supplied"}</span></div></div>
      <div className="creator-user-detail-section"><h3>📝 Submission details</h3><p>{selected.description || "No description supplied."}</p>{selected.observedTraits && <p><strong>Observed traits:</strong> {selected.observedTraits}</p>}{selected.geneticsNotes && <p><strong>Genetics notes:</strong> {selected.geneticsNotes}</p>}{selected.proofDetails && <p><strong>Proof:</strong> {selected.proofDetails}</p>}{selected.proofReference && <p><strong>Reference:</strong> {selected.proofReference}</p>}</div>
      {(isAwaitingMorphReview(selected.status)) && <div className="creator-submission-actions"><button type="button" onClick={() => void reject()} disabled={working || !canTransitionMorphSubmission(selected.status, "Rejected")}>✕ Reject</button><button type="button" onClick={() => void approve()} disabled={working || !canTransitionMorphSubmission(selected.status, "Approved")}>✓ {working ? "Approving…" : "Approve & Add to Morph Library"}</button></div>}
    </section></div>}
  </main>;
}
