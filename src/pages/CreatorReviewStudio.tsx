import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import SubmissionConversationPanel from "../components/TitanIntelligence/SubmissionConversationPanel";
import { approveMorphImageSubmission, getMorphImageSubmissions, rejectMorphImageSubmission } from "../services/creatorService";
import { saveMorphSubmissionReview } from "../services/creatorReviewStudioService";
import { canTransitionMorphSubmission, isAwaitingMorphReview, validateMorphSubmissionForApproval } from "../services/morphSubmissionLifecycle";
import { getCreatorUserDisplayNames } from "../services/creatorUserDirectoryService";
import { getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { searchSnakeSpecies } from "../data/species/speciesRegistry";
import { masterMorphs, resolveMasterMorph, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { storage } from "../firebase/config";
import type { MorphImageSubmission } from "../types/morphSubmission";
import "../styles/CreatorTools.css";

const normalise = (value: string) => value.trim().toLowerCase();
const normaliseSearch = (value: string) => normalise(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const isUnknownMorph = (morph: MasterMorphDefinition) => normaliseSearch(morph.name) === "unknown" || normaliseSearch(morph.geneId) === "unknown";

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j < current.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function matchesMorphSearch(morph: MasterMorphDefinition, search: string) {
  const terms = normaliseSearch(search).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const values = [morph.geneId, morph.name, ...(morph.aliases ?? [])].map(normaliseSearch);
  return terms.every((term) =>
    values.some((value) =>
      value.includes(term) ||
      value.split(" ").some((word) => word.startsWith(term)) ||
      value.split(" ").some((word) => Math.min(term.length, word.length) >= 4 && editDistance(term, word) <= 1),
    ),
  );
}

type Draft = {
  speciesId: string;
  speciesName: string;
  morphId: string;
  morphName: string;
  description: string;
  geneticsNotes: string;
  observedTraits: string;
  proofDetails: string;
  proofReference: string;
  creditType: MorphImageSubmission["creditType"];
  creditName: string;
  creditSocial: string;
  allowMorphLibraryLink: boolean;
  creatorReviewerNotes: string;
};

const toDraft = (item: MorphImageSubmission): Draft => ({
  speciesId: item.speciesId ?? "",
  speciesName: item.speciesName ?? "",
  morphId: item.morphId ?? "",
  morphName: item.morphName ?? "",
  description: item.description ?? "",
  geneticsNotes: item.geneticsNotes ?? "",
  observedTraits: item.observedTraits ?? "",
  proofDetails: item.proofDetails ?? "",
  proofReference: item.proofReference ?? "",
  creditType: item.creditType ?? "anonymous",
  creditName: item.creditName ?? "",
  creditSocial: item.creditSocial ?? "",
  allowMorphLibraryLink: item.allowMorphLibraryLink !== false,
  creatorReviewerNotes: "",
});

function formatDate(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return new Date(value.toMillis()).toLocaleString("en-GB");
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label><strong style={{ display: "block", marginBottom: 6, color: "var(--secondary,#F5B642)", fontSize: ".75rem", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</strong>{children}</label>;
}

export default function CreatorReviewStudio() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<MorphImageSubmission[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [queueFilter, setQueueFilter] = useState<"pending" | "all">("pending");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [morphSearch, setMorphSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const visible = useMemo(() => queueFilter === "pending" ? items.filter((item) => isAwaitingMorphReview(item.status)) : items, [items, queueFilter]);
  const speciesOptions = useMemo(() => {
    const needle = normaliseSearch(speciesSearch);
    return searchSnakeSpecies("").filter((species) => !needle || [species.id, ...species.commonNames, species.acceptedScientificName].some((value) => normaliseSearch(String(value)).includes(needle))).slice(0, 60);
  }, [speciesSearch]);
  const speciesIdForMorphs = draft?.speciesId ?? "";
  const morphOptions = useMemo(() => {
    if (!speciesIdForMorphs) return [];
    return [...getSpeciesVisualMorphs(speciesIdForMorphs)]
      .filter((morph) => matchesMorphSearch(morph, morphSearch))
      .sort((a, b) => {
        const aUnknown = isUnknownMorph(a);
        const bUnknown = isUnknownMorph(b);
        if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
        return a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });
      });
  }, [speciesIdForMorphs, morphSearch]);
  const currentCanonical = useMemo(() => {
    if (!draft?.morphId && !draft?.morphName) return null;
    return resolveMasterMorph(draft.morphId || draft.morphName) ?? masterMorphs.find((morph) => morph.geneId === draft.morphId) ?? null;
  }, [draft?.morphId, draft?.morphName]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const next = await getMorphImageSubmissions();
      setItems(next);
      setNames(await getCreatorUserDisplayNames(next.map((item) => item.userId).filter((uid): uid is string => Boolean(uid))));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load morph submissions.");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (profile?.role === "admin" && user) void load(); }, [profile?.role, user, load]);

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setDraft(toDraft(selected)); setDirty(false); setNotice(""); setError(""); setSpeciesSearch(""); setMorphSearch("");
    if (!selected.attachment?.path) { setImageUrl(""); return; }
    let active = true;
    void getDownloadURL(ref(storage, selected.attachment.path)).then((url) => active && setImageUrl(url)).catch(() => active && setImageUrl(""));
    return () => { active = false; };
  }, [selected]);

  function patch(partial: Partial<Draft>) { setDraft((current) => current ? { ...current, ...partial } : current); setDirty(true); setNotice(""); setError(""); }
  function selectSpecies(speciesId: string) {
    const species = searchSnakeSpecies("").find((item) => item.id === speciesId);
    patch({ speciesId, speciesName: species?.commonNames[0] ?? "", morphId: "", morphName: "" });
    setMorphSearch("");
  }
  function selectMorph(morph: MasterMorphDefinition) {
    const canonical = resolveMasterMorph(morph.geneId) ?? resolveMasterMorph(morph.name) ?? morph;
    patch({ morphId: canonical.geneId, morphName: canonical.name });
    setMorphSearch(canonical.name);
  }

  async function saveDraft(status?: "Pending" | "NeedsInfo") {
    if (!selected || !draft) return false;
    setWorking(true); setError("");
    try {
      await saveMorphSubmissionReview(selected.id, { ...draft, status });
      const next = { ...selected, ...draft, ...(status ? { status } : {}) } as MorphImageSubmission;
      setItems((current) => current.map((item) => item.id === selected.id ? next : item));
      setDirty(false);
      setNotice(status === "NeedsInfo" ? "Saved and marked Needs Info." : "Draft saved privately.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the review draft.");
      return false;
    } finally { setWorking(false); }
  }

  async function approve() {
    if (!selected || !draft || !user) return;
    const proposed = { ...selected, ...draft } as MorphImageSubmission;
    if (!canTransitionMorphSubmission(selected.status, "Approved")) { setError("This submission cannot transition to Approved from its current state."); return; }
    const validation = validateMorphSubmissionForApproval(proposed);
    if (validation) { setError(validation); return; }
    setWorking(true); setError(""); setNotice("");
    try {
      await saveMorphSubmissionReview(selected.id, draft);
      await approveMorphImageSubmission(proposed, user.uid);
      setNotice(`Approved and published ${draft.morphName}.`);
      setDirty(false);
      setSelectedId(""); setDraft(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to approve this submission.");
    } finally { setWorking(false); }
  }

  async function requestInfo() {
    if (!selected || !draft) return;
    const note = window.prompt("What information should the creator provide before approval?", draft.creatorReviewerNotes) ?? "";
    if (!note.trim()) return;
    setWorking(true); setError("");
    try {
      await saveMorphSubmissionReview(selected.id, { ...draft, creatorReviewerNotes: note, status: "NeedsInfo" });
      setNotice("Request for information saved. The submission remains in the live queue."); setDirty(false);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to request more information."); }
    finally { setWorking(false); }
  }

  async function reject() {
    if (!selected || !user) return;
    const reason = window.prompt("Rejection reason for the creator:", "") ?? "";
    if (!reason.trim()) return;
    setWorking(true); setError("");
    try {
      await rejectMorphImageSubmission(selected.id, selected.attachment.path, user.uid, reason);
      setNotice(`Rejected ${draft?.morphName ?? selected.morphName}.`); setSelectedId(""); setDraft(null); await load();
    } catch (reasonError) { setError(reasonError instanceof Error ? reasonError.message : "Unable to reject this submission."); }
    finally { setWorking(false); }
  }

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return <main className="creator-admin-page">
    <header className="creator-admin-header">
      <div><PageBackButton fallbackPath="/creator" label="Back to Creator Centre" /><span className="creator-admin-kicker">CREATOR CENTRE · REVIEW STUDIO</span><h1>🧬 Creator Review Studio</h1><p>Live-edit a private submission, resolve it to the canonical Morph Library, then explicitly approve and publish.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading || working}>{loading ? "↻ Loading…" : "↻ Refresh"}</button>
    </header>
    {error && <div className="creator-error">{error}</div>}
    {notice && <div className="creator-success">✓ {notice}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,360px) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
      <section className="creator-admin-section" style={{ padding: 16 }}>
        <div className="creator-section-heading"><span className="creator-admin-kicker">LIVE QUEUE</span><h2>{visible.length} submissions</h2><select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as typeof queueFilter)}><option value="pending">Pending / Needs Info</option><option value="all">All submissions</option></select></div>
        {loading ? <div className="creator-loading">Loading submissions…</div> : <div className="creator-list">{visible.map((item) => <button key={item.id} type="button" className="creator-user-row" onClick={() => { if (dirty && !window.confirm("Discard unsaved edits and open another submission?")) return; setSelectedId(item.id); }}><span className="creator-user-avatar">🧬</span><span className="creator-user-main"><strong>{item.morphName}</strong><small>{item.speciesName || item.speciesId}</small><small>{names[item.userId ?? ""] || "Anonymous user"}</small></span><span className="creator-user-meta"><strong>{item.status}</strong><small>{formatDate(item.submittedAt)}</small></span></button>)}</div>}
      </section>

      {selected && draft ? <section className="creator-admin-section" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(270px,.95fr)", gap: 18 }}>
          <div>
            <div className="creator-section-heading"><span className="creator-admin-kicker">PRIVATE EDITOR</span><h2>{draft.morphName || "Unnamed submission"}</h2><p>{selected.status} · Submitted {formatDate(selected.submittedAt)}</p></div>
            {imageUrl ? <div className="creator-submission-preview"><img src={imageUrl} alt={`Submitted ${draft.morphName}`} /></div> : <div className="creator-list-item"><strong>Preview unavailable</strong><span>The submitted media could not be loaded.</span></div>}
            <div className="creator-form" style={{ marginTop: 18 }}>
              <Field label="Species"><input value={speciesSearch} onChange={(event) => setSpeciesSearch(event.target.value)} placeholder={draft.speciesName || draft.speciesId} /><select value={draft.speciesId} onChange={(event) => selectSpecies(event.target.value)}><option value="">Select species…</option>{speciesOptions.map((species) => <option key={species.id} value={species.id}>{species.commonNames[0]} · {species.id}</option>)}</select></Field>
              <Field label="Canonical Morph">
                <input value={morphSearch} onChange={(event) => setMorphSearch(event.target.value)} placeholder="Search canonical name, alias or ID…" autoComplete="off" aria-label="Search canonical morph library" />
                <div role="listbox" aria-label="Canonical morph library" style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--tt-tier-edge, rgba(255,255,255,.14))", borderRadius: 12, padding: 6, background: "rgba(0,0,0,.16)" }}>
                  {morphOptions.length === 0 ? (
                    <div style={{ padding: 14, opacity: .75 }}>No canonical morphs match that search.</div>
                  ) : morphOptions.map((morph) => (
                    <button
                      key={morph.geneId}
                      type="button"
                      role="option"
                      aria-selected={draft.morphId === morph.geneId}
                      onClick={() => selectMorph(morph)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: 0, borderRadius: 9, padding: "9px 10px", background: draft.morphId === morph.geneId ? "var(--tt-tier-glow, rgba(255,255,255,.08))" : "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
                    >
                      <span><strong>{morph.name}</strong><small style={{ display: "block", opacity: .72 }}>{morph.kind} · {morph.geneId}</small></span>
                      {draft.morphId === morph.geneId && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
                <small>{morphOptions.length} canonical morph{morphOptions.length === 1 ? "" : "s"} shown. Results are A–Z with Unknown kept at the bottom.</small>
                {currentCanonical && <small>{currentCanonical.kind} · {currentCanonical.inheritance} · {currentCanonical.geneId}</small>}
              </Field>
              <Field label="Public morph name"><input value={draft.morphName} onChange={(event) => patch({ morphName: event.target.value })} /></Field>
              <Field label="Description"><textarea rows={4} value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></Field>
              <Field label="Genetics notes"><textarea rows={3} value={draft.geneticsNotes} onChange={(event) => patch({ geneticsNotes: event.target.value })} /></Field>
              <Field label="Observed traits"><textarea rows={3} value={draft.observedTraits} onChange={(event) => patch({ observedTraits: event.target.value })} /></Field>
              <Field label="Proof details"><textarea rows={3} value={draft.proofDetails} onChange={(event) => patch({ proofDetails: event.target.value })} /></Field>
              <Field label="Proof reference"><input value={draft.proofReference} onChange={(event) => patch({ proofReference: event.target.value })} /></Field>
              <Field label="Credit type"><select value={draft.creditType} onChange={(event) => patch({ creditType: event.target.value as Draft["creditType"] })}><option value="name">Name</option><option value="social">Social handle</option><option value="anonymous">Anonymous</option></select></Field>
              {draft.creditType === "name" && <Field label="Credit name"><input value={draft.creditName} onChange={(event) => patch({ creditName: event.target.value })} /></Field>}
              {draft.creditType === "social" && <Field label="Credit social"><input value={draft.creditSocial} onChange={(event) => patch({ creditSocial: event.target.value })} /></Field>}
              <Field label="Private Creator notes"><textarea rows={3} value={draft.creatorReviewerNotes} onChange={(event) => patch({ creatorReviewerNotes: event.target.value })} placeholder="Internal moderation notes; never published." /></Field>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" checked={draft.allowMorphLibraryLink} onChange={(event) => patch({ allowMorphLibraryLink: event.target.checked })} />Publish this media into the Morph Library when approved</label>
            </div>
          </div>
          <aside>
            <div className="creator-list-item" style={{ position: "sticky", top: 18 }}><span className="creator-admin-kicker">PUBLIC PREVIEW</span><h3 style={{ marginTop: 0 }}>{draft.morphName || "Unnamed morph"}</h3><p><strong>Species:</strong> {draft.speciesName || draft.speciesId || "—"}</p><p><strong>Canonical:</strong> {draft.morphId || "—"}</p><p><strong>Description:</strong> {draft.description || "—"}</p><p><strong>Observed:</strong> {draft.observedTraits || "—"}</p><p><strong>Genetics:</strong> {draft.geneticsNotes || "—"}</p><p><strong>Credit:</strong> {draft.creditType === "name" ? draft.creditName : draft.creditType === "social" ? draft.creditSocial : "Anonymous"}</p>{dirty && <p style={{ fontWeight: 800, color: "var(--secondary,#F5B642)" }}>● Unsaved edits</p>}<p style={{ fontSize: ".8rem", color: "var(--muted,#C8B8D8)" }}>Submission edits remain private until approval.</p></div>
          </aside>
        </div>
        <SubmissionConversationPanel submissionType="morph-image" submissionId={selected.id} submitterUid={selected.userId} submitterName={names[selected.userId ?? ""] || "Anonymous user"} submissionTitle={draft.morphName} submissionStatus={selected.status} />
        {isAwaitingMorphReview(selected.status) && <div className="creator-submission-actions"><button type="button" onClick={() => void reject()} disabled={working}>✕ Reject</button><button type="button" onClick={() => void requestInfo()} disabled={working}>📨 Request Info</button><button type="button" onClick={() => void saveDraft()} disabled={working || !dirty}>{working ? "Saving…" : "💾 Save Draft"}</button><button type="button" onClick={() => void approve()} disabled={working}>✓ {working ? "Publishing…" : "Approve & Publish"}</button></div>}
      </section> : <section className="creator-admin-section"><h2>Select a submission</h2><p>Choose an item from the queue to open the live editor.</p></section>}
    </div>
  </main>;
}
