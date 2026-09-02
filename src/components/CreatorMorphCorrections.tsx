import { useCallback, useEffect, useMemo, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { useAuth } from "../context/useAuth";
import { storage } from "../firebase/config";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { correctMorphImageSubmission } from "../services/morphImageCorrectionService";
import { getApprovedMorphImages, getMorphImageSubmissions } from "../services/creatorService";
import type { ApprovedMorphImage, MorphImageSubmission } from "../types/morphSubmission";
import "../styles/CreatorTools.css";

function when(value: unknown): string {
  if (!value) return "Unknown date";
  const date = typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function"
    ? value.toDate()
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString("en-GB");
}

export default function CreatorMorphCorrections() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MorphImageSubmission[]>([]);
  const [approved, setApproved] = useState<ApprovedMorphImage[]>([]);
  const [selected, setSelected] = useState<MorphImageSubmission | null>(null);
  const [target, setTarget] = useState<MasterMorphDefinition | null>(null);
  const [queryText, setQueryText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const options = useMemo(() => {
    const query = queryText.trim().toLowerCase();
    return masterMorphs
      .filter((entry) => !query || entry.name.toLowerCase().includes(query) || entry.aliases?.some((alias) => alias.toLowerCase().includes(query)))
      .filter((entry) => entry.verification !== "Disputed" && entry.verification !== "Unverified")
      .slice(0, 30);
  }, [queryText]);

  const refresh = useCallback(async () => {
    if (profile?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const [submissions, approvedImages] = await Promise.all([getMorphImageSubmissions(), getApprovedMorphImages()]);
      setItems(submissions.filter((item) => ["Pending", "NeedsInfo", "Approved"].includes(item.status)));
      setApproved(approvedImages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load morph image corrections.");
    } finally {
      setLoading(false);
    }
  }, [profile?.role]);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  useEffect(() => {
    if (!selected) {
      setImageUrl("");
      return;
    }
    const existingApproved = approved.find((item) => item.sourceSubmissionId === selected.id);
    const path = existingApproved?.storagePath || selected.attachment?.path;
    if (!path) {
      setImageUrl("");
      return;
    }
    void getDownloadURL(ref(storage, path)).then(setImageUrl).catch(() => setImageUrl(existingApproved?.imageUrl || ""));
  }, [selected, approved]);

  async function applyCorrection() {
    if (!selected || !target || !user) return;
    if (target.geneId === selected.morphId && target.name === selected.morphName) {
      setError("Choose a different canonical Morph Library entry.");
      return;
    }
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await correctMorphImageSubmission({
        submissionId: selected.id,
        correctedMorphId: target.geneId,
        correctedMorphName: target.name,
        correctedByUid: user.uid,
        currentMorphId: selected.morphId,
        currentMorphName: selected.morphName,
      });
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, morphId: target.geneId, morphName: target.name } : item));
      setSelected(null);
      setTarget(null);
      setQueryText("");
      setSuccess(`Image re-linked to ${target.name}. The original upload, storage file and contributor credit were preserved.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to correct the Morph Library identity.");
    } finally {
      setWorking(false);
    }
  }

  if (profile?.role !== "admin") return null;

  return (
    <section className="creator-admin-section" aria-label="Morph image corrections">
      <div className="creator-section-heading">
        <p className="creator-admin-kicker">CREATOR TOOL</p>
        <h2>Morph Image Corrections</h2>
        <p>Correct a submitted image's canonical identity without replacing the original upload or contributor credit.</p>
      </div>
      <div className="creator-actions">
        <button className="creator-tool-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close correction desk" : "Open correction desk"}</button>
      </div>
      {success && <div className="creator-success" role="status">{success}</div>}
      {error && <div className="creator-error" role="alert">{error}</div>}
      {open && (
        loading ? <div className="creator-loading">Loading submitted morph images...</div> : (
          <div className="creator-list">
            {items.length === 0 ? <div className="creator-list-card"><strong>No correctable morph image submissions.</strong><span>Pending, Needs Info and Approved submissions will appear here.</span></div> : items.map((item) => (
              <button type="button" className="creator-list-card creator-global-card-button" key={item.id} onClick={() => { setSelected(item); setTarget(null); setQueryText(""); setError(""); }}>
                <strong>{item.morphName}</strong>
                <span>{item.status} · Submitted {when(item.submittedAt)}</span>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        )
      )}

      {selected && (
        <div className="creator-modal-backdrop" role="presentation">
          <section className="creator-modal" role="dialog" aria-modal="true" aria-labelledby="morph-correction-title">
            <div className="creator-section-heading">
              <p className="creator-admin-kicker">MORPH CORRECTION</p>
              <h2 id="morph-correction-title">Correct this image's canonical identity</h2>
              <p>Current identity: <strong>{selected.morphName}</strong>. Choose the correct canonical library entry below.</p>
            </div>
            {imageUrl && <div className="creator-submission-preview"><img src={imageUrl} alt={`Submitted ${selected.morphName}`} /></div>}
            <div className="creator-user-detail-grid">
              <div><strong>Current morph</strong><span>{selected.morphName}</span></div>
              <div><strong>Submission status</strong><span>{selected.status}</span></div>
              <div><strong>Contributor credit</strong><span>{selected.creditType === "name" ? selected.creditName || "Name supplied" : selected.creditType === "social" ? selected.creditSocial || "Social supplied" : "Anonymous"}</span></div>
            </div>
            <div className="creator-user-detail-section">
              <h3>Correct to</h3>
              <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search the complete Morph Library..." />
              <div className="creator-list" style={{ marginTop: 10, maxHeight: 280, overflow: "auto" }}>
                {options.map((entry) => <button key={entry.geneId} type="button" className={`creator-list-card creator-global-card-button${target?.geneId === entry.geneId ? " is-active" : ""}`} onClick={() => setTarget(entry)}><strong>{entry.name}</strong><span>{entry.kind} · {entry.inheritance} · {entry.verification}</span></button>)}
              </div>
            </div>
            {target && <div className="creator-success"><strong>{selected.morphName}</strong> → <strong>{target.name}</strong><p>Only the canonical identity changes. The original image file and attribution stay attached to this submission.</p></div>}
            <div className="creator-submission-actions">
              <button type="button" onClick={() => { setSelected(null); setTarget(null); }}>Cancel</button>
              <button type="button" disabled={working || !target} onClick={() => void applyCorrection()}>{working ? "Relinking image..." : "Correct & re-link image"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
