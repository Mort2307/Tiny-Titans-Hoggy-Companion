import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import PageBackButton from "../components/PageBackButton";
import { useCreatorReviewStudio } from "../hooks/useCreatorReviewStudio";
import { formatCreatorReviewDate, type ReviewDraft } from "../lib/creatorReviewStudio";
import { isAwaitingMorphReview } from "../services/morphSubmissionLifecycle";
import SubmissionConversationPanel from "../components/TitanIntelligence/SubmissionConversationPanel";
import "../styles/CreatorTools.css";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label><strong style={{ display: "block", marginBottom: 6, color: "var(--secondary,#F5B642)", fontSize: ".75rem", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</strong>{children}</label>;
}

export default function CreatorReviewStudio() {
  const {
    profile,user,items,names,selectedId,setSelectedId,draft,imageUrl,queueFilter,setQueueFilter,
    speciesSearch,setSpeciesSearch,morphSearch,setMorphSearch,loading,working,dirty,error,notice,
    visible,speciesOptions,morphOptions,currentCanonical,selected,load,patch,selectSpecies,selectMorph,
    saveDraft,approve,requestInfo,reject,
  } = useCreatorReviewStudio();

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
        {loading ? <div className="creator-loading">Loading submissions…</div> : <div className="creator-list">{visible.map((item) => <button key={item.id} type="button" className="creator-user-row" onClick={() => { if (dirty && !window.confirm("Discard unsaved edits and open another submission?")) return; setSelectedId(item.id); }}><span className="creator-user-avatar">🧬</span><span className="creator-user-main"><strong>{item.morphName}</strong><small>{item.speciesName || item.speciesId}</small><small>{names[item.userId ?? ""] || "Anonymous user"}</small></span><span className="creator-user-meta"><strong>{item.status}</strong><small>{formatCreatorReviewDate(item.submittedAt)}</small></span></button>)}</div>}
      </section>

      {selected && draft ? <section className="creator-admin-section" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(270px,.95fr)", gap: 18 }}>
          <div>
            <div className="creator-section-heading"><span className="creator-admin-kicker">PRIVATE EDITOR</span><h2>{draft.morphName || "Unnamed submission"}</h2><p>{selected.status} · Submitted {formatCreatorReviewDate(selected.submittedAt)}</p></div>
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
              <Field label="Credit type"><select value={draft.creditType} onChange={(event) => patch({ creditType: event.target.value as ReviewDraft["creditType"] })}><option value="name">Name</option><option value="social">Social handle</option><option value="anonymous">Anonymous</option></select></Field>
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
