import { useEffect, useMemo, useRef, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { reptifitMorphCatalog } from "../data/reptifitMorphCatalog";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import { getApprovedMorphImages } from "../services/creatorService";
import { submitMorphImageV2, type MorphCreditMode } from "../services/morphSubmissionServiceV2";
import "../styles/morphLibrary.css";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
function asReferenceEntry(entry: MasterMorphDefinition): MorphReferenceEntry { return entry as MorphReferenceEntry; }

type ApprovedMorphImage = {
  id?: string;
  imageUrl: string;
  creditName?: string;
  creditSocial?: string;
  creditMode?: MorphCreditMode;
  approvedAt?: unknown;
};

function CommunityMorphGallery({ morphId, morphName }: { morphId: string; morphName: string }) {
  const [images, setImages] = useState<ApprovedMorphImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ApprovedMorphImage | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setImages([]);
    void getApprovedMorphImages(morphId)
      .then((result) => {
        if (cancelled) return;
        setImages((result as ApprovedMorphImage[]).filter((image) => Boolean(image?.imageUrl)));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "We couldn't load the community images.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [morphId]);

  function moveGallery(direction: "left" | "right") {
    galleryRef.current?.scrollBy({ left: direction === "right" ? 320 : -320, behavior: "smooth" });
  }

  return <section className="morph-detail__section morph-community-gallery" aria-labelledby="community-gallery-title">
    <div className="morph-community-gallery__header">
      <div><h3 id="community-gallery-title">Community examples</h3><p>Approved reference photographs submitted by Tiny Titans keepers.</p></div>
      {!loading && !error && images.length > 0 && <span className="morph-community-gallery__count">{images.length} {images.length === 1 ? "example" : "examples"}</span>}
    </div>
    {loading ? <p className="morph-community-gallery__state">Loading approved {morphName} examples…</p> : error ? <p className="morph-community-gallery__state" role="alert">{error}</p> : images.length === 0 ? <p className="morph-community-gallery__state">No community examples have been approved for {morphName} yet. Be the first to contribute.</p> : <div className="morph-community-gallery__viewport">
      <button type="button" className="morph-community-gallery__nav" onClick={() => moveGallery("left")} aria-label="Previous community image">‹</button>
      <div className="morph-community-gallery__scroller" ref={galleryRef} tabIndex={0} aria-label={`${morphName} community image gallery`}>
        {images.map((image, index) => <button key={image.id ?? `${image.imageUrl}-${index}`} type="button" className="morph-community-gallery__card" onClick={() => setSelectedImage(image)} aria-label={`Open ${morphName} community image ${index + 1}`}>
          <img src={image.imageUrl} alt={`${morphName} community example ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} />
          {(image.creditName || image.creditSocial) && <span className="morph-community-gallery__credit">{image.creditName || image.creditSocial}</span>}
        </button>)}
      </div>
      <button type="button" className="morph-community-gallery__nav" onClick={() => moveGallery("right")} aria-label="Next community image">›</button>
    </div>}
    {selectedImage && <div className="morph-community-gallery__lightbox" role="presentation" onMouseDown={() => setSelectedImage(null)}>
      <button type="button" className="morph-community-gallery__lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close image">×</button>
      <img src={selectedImage.imageUrl} alt={`${morphName} community example`} onMouseDown={(event) => event.stopPropagation()} />
      {(selectedImage.creditName || selectedImage.creditSocial) && <p onMouseDown={(event) => event.stopPropagation()}>Credit: {selectedImage.creditName || selectedImage.creditSocial}</p>}
    </div>}
  </section>;
}

function MorphDetail({ morph, onClose }: { morph: MorphReferenceEntry; onClose: () => void }) {
  const contains = morph.contains ?? morph.components?.map((component) => component.morphId) ?? [];
  return <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}><article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="morph-detail-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close morph details">×</button>
    <div className="morph-detail__eyebrow">TINY TITANS · MORPH DATABASE</div><h2 id="morph-detail-title">{morph.name}</h2>
    <div className="morph-detail__badges"><span>{morph.kind}</span><span>{morph.inheritance}</span><span>{morph.verification}</span></div>
    <p className="morph-detail__description">{morph.description ?? "No description has been added yet."}</p>
    <CommunityMorphGallery morphId={morph.geneId} morphName={morph.name} />
    {contains.length > 0 && <section className="morph-detail__section"><h3>Contains</h3><div className="morph-detail__contains">{contains.map((item) => <span key={item}>{item}</span>)}</div></section>}
    {morph.components && morph.components.length > 0 && <section className="morph-detail__section"><h3>Genetic components</h3><ul>{morph.components.map((component) => <li key={`${component.morphId}-${component.copies ?? 1}`}><strong>{component.morphId}</strong>{component.copies ? ` ×${component.copies}` : ""}</li>)}</ul></section>}
    <section className="morph-detail__section"><h3>Genetics notes</h3><p>{morph.educationalNotes ?? "No additional genetics notes have been published for this entry yet."}</p></section>
    <section className="morph-detail__section morph-detail__source"><strong>Reference</strong><span>{morph.sourceLabel ?? "Tiny Titans"}</span><a href={morph.sourceUrl ?? "https://hognose-morphs.com/"} target="_blank" rel="noreferrer">Open source reference →</a></section>
  </article></div>;
}

function MorphSubmissionDialog({ entries, onClose }: { entries: MorphReferenceEntry[]; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedMorph, setSelectedMorph] = useState<MorphReferenceEntry | null>(null);
  const [morphSearch, setMorphSearch] = useState("");
  const [morphMenuOpen, setMorphMenuOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [observedTraits, setObservedTraits] = useState("");
  const [proofDetails, setProofDetails] = useState("");
  const [proofReference, setProofReference] = useState("");
  const [photoRequirementsConfirmed, setPhotoRequirementsConfirmed] = useState(false);
  const [factualAccuracyConfirmed, setFactualAccuracyConfirmed] = useState(false);
  const [creditMode, setCreditMode] = useState<MorphCreditMode>("anonymous");
  const [creditName, setCreditName] = useState("");
  const [creditSocial, setCreditSocial] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const morphOptions = useMemo(() => {
    const needle = normalise(morphSearch);
    if (!needle) return entries.slice(0, 80);
    return entries.filter((entry) => [entry.name, ...(entry.aliases ?? []), ...(entry.contains ?? [])].map(normalise).some((value) => value.includes(needle))).slice(0, 80);
  }, [entries, morphSearch]);

  function chooseImage() { fileRef.current?.click(); }
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null; setError(""); if (!selected) return;
    if (!selected.type.startsWith("image/")) { setImage(null); event.target.value = ""; setError("Please choose an image file."); return; }
    if (selected.size > 20 * 1024 * 1024) { setImage(null); event.target.value = ""; setError("That photo is too large. Please choose a photo under 20 MB."); return; }
    setImage(selected);
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!selectedMorph) { setError("Please select the exact morph from the Morph Library."); setMorphMenuOpen(true); return; }
    if (!image) { setError("Please add the required primary photograph."); return; }
    if (!photoRequirementsConfirmed) { setError("Please confirm that your photo meets all Morph Library requirements."); return; }
    if (!factualAccuracyConfirmed) { setError("Please confirm that you have provided proof supporting the confirmed morph identification."); return; }
    setBusy(true);
    try {
      await submitMorphImageV2({ morphId: selectedMorph.geneId, morphName: selectedMorph.name, description, observedTraits, proofDetails, proofReference, photoRequirementsConfirmed, factualAccuracyConfirmed, creditMode, creditName, creditSocial, image });
      setSent(true);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "We couldn't submit the morph image. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}><article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="morph-submit-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close morph submission">×</button>
    {sent ? <><div className="morph-detail__eyebrow">🐍 TINY TITANS · SUBMISSION RECEIVED</div><h2>Thanks — it is in review.</h2><p className="morph-detail__description">Your photo has been linked directly to <strong>{selectedMorph?.name}</strong> and sent to Creator review. If approved, it will go straight into that Morph Library entry.</p><button type="button" onClick={onClose}>Done</button></> : <form onSubmit={handleSubmit}>
      <div className="morph-detail__eyebrow">🐍 TINY TITANS · MORPH SUBMISSION</div><h2 id="morph-submit-title">Submit a morph image</h2><p className="morph-detail__description">Select the exact Morph Library entry your photograph represents. This links your submission directly to that canonical morph for Creator approval.</p>
      <section className="morph-detail__section"><h3>🧬 Select the morph</h3><div className="morph-selector"><button type="button" className="morph-selector__trigger" onClick={() => setMorphMenuOpen((open) => !open)} aria-expanded={morphMenuOpen}><span>{selectedMorph ? `🐍 ${selectedMorph.name}` : "Select a morph…"}</span><span>⌄</span></button>{morphMenuOpen && <div className="morph-selector__menu"><input autoFocus value={morphSearch} onChange={(event) => setMorphSearch(event.target.value)} placeholder="🔍 Search morphs…" aria-label="Search morphs" />{morphOptions.length === 0 ? <p>No matching morphs.</p> : <div className="morph-selector__options">{morphOptions.map((entry) => <button key={entry.geneId} type="button" onClick={() => { setSelectedMorph(entry); setMorphSearch(""); setMorphMenuOpen(false); setError(""); }}><strong>{entry.name}</strong><small>{entry.kind} · {entry.inheritance}</small></button>)}</div>}</div>}</div>{selectedMorph && <p className="morph-selector__selected">✓ Linked to canonical Morph Library entry: <strong>{selectedMorph.name}</strong></p>}</section>
      <section className="morph-detail__section"><h3>📸 Primary photo requirements — please read</h3><p>The primary photograph must show the <strong>full snake body</strong>, be <strong>properly in focus</strong>, clearly lit and large enough to assess the phenotype. Use a <strong>neutral white, grey or black background</strong>. Please use a clean, staged/reference-style photograph rather than a snake hidden in a vivarium or surrounded by distracting decor.</p><p>Do not use heavy filters, colour grading or edits that could alter the snake's true appearance.</p><label className="morph-submit-check"><input type="checkbox" checked={photoRequirementsConfirmed} onChange={(event) => setPhotoRequirementsConfirmed(event.target.checked)} /> <span>I confirm my primary photo meets <strong>all</strong> of these requirements.</span></label></section>
      <label>What are we looking at?<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the animal, visual traits and why you believe this is the selected morph." rows={4} required /></label><label>Known genetic information <span>(optional)</span><textarea value={observedTraits} onChange={(event) => setObservedTraits(event.target.value)} placeholder="Parent genetics, hets, pairing, breeder information, etc." rows={3} /></label>
      <section className="morph-detail__section"><h3>🧬 Confirmed morph proof — required</h3><p><strong>A visual guess is not sufficient.</strong> Provide evidence supporting the stated morph, such as breeder documentation, parent genetics/provenance or verified breeding records.</p><label>What proof are you providing?<textarea value={proofDetails} onChange={(event) => setProofDetails(event.target.value)} placeholder="Explain the evidence supporting the identification." rows={4} required /></label><label>Proof reference <span>(optional)</span><input value={proofReference} onChange={(event) => setProofReference(event.target.value)} placeholder="Source link, breeder name, document reference, etc." /></label><label className="morph-submit-check"><input type="checkbox" checked={factualAccuracyConfirmed} onChange={(event) => setFactualAccuracyConfirmed(event.target.checked)} /> <span>I confirm that the morph identification is supported by the evidence provided.</span></label></section>
      <section className="morph-detail__section"><h3>Primary photograph</h3><input ref={fileRef} className="morph-submit-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleImageChange} required /><button className="morph-submit-photo-button" type="button" onClick={chooseImage} disabled={busy}>📷 {image ? "Change primary photo" : "Add primary photo"}</button>{image && <div className="morph-submit-photo-selected"><strong>{image.name}</strong><span>{Math.round(image.size / 1024)} KB</span><button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }} disabled={busy}>Remove</button></div>}<p>Photos are resized/compressed before upload. Maximum selected file size is 20 MB.</p></section>
      <section className="morph-detail__section"><h3>Credit</h3><p>Credit is optional if your submission is accepted.</p><div className="morph-detail__badges">{(["name", "social", "anonymous"] as MorphCreditMode[]).map((mode) => <button key={mode} type="button" className={creditMode === mode ? "is-active" : ""} onClick={() => setCreditMode(mode)}>{mode === "name" ? "My name" : mode === "social" ? "Social media" : "Anonymous"}</button>)}</div>{creditMode === "name" && <input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Name to display" required />}{creditMode === "social" && <input value={creditSocial} onChange={(event) => setCreditSocial(event.target.value)} placeholder="@handle or social link" required />}</section>
      {error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "Submitting for review…" : "Submit for review"}</button><button type="button" onClick={onClose} disabled={busy}>Cancel</button>
    </form>}
  </article></div>;
}

export default function MorphLibrary() {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"all" | "gene" | "combination" | "polygenic" | "line-bred">("all"); const [selected, setSelected] = useState<MorphReferenceEntry | null>(null); const [showSubmission, setShowSubmission] = useState(false);
  const entries = useMemo<MorphReferenceEntry[]>(() => { const byName = new Map<string, MorphReferenceEntry>(); [...masterMorphs, ...reptifitMorphCatalog].forEach((entry) => { const key = normalise(entry.name); if (!byName.has(key)) byName.set(key, asReferenceEntry(entry)); }); return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)); }, []);
  const filtered = useMemo(() => { const needle = normalise(query); const exactMatches = needle ? entries.filter((entry) => normalise(entry.name) === needle || (entry.aliases ?? []).some((alias) => normalise(alias) === needle)) : []; const searchPool = exactMatches.length > 0 ? exactMatches : entries.filter((entry) => { if (!needle) return true; const searchable = [entry.name, ...(entry.aliases ?? []), ...(entry.contains ?? [])].map(normalise); return searchable.some((value) => value.includes(needle)); }); return searchPool.filter((entry) => filter === "all" || (filter === "gene" && (entry.kind === "Gene" || entry.kind === "Super")) || (filter === "combination" && entry.kind === "Combination") || (filter === "polygenic" && entry.inheritance === "Polygenic") || (filter === "line-bred" && entry.inheritance === "Line-bred")); }, [entries, filter, query]);
  return <main className="page-container morph-library-page"><BackHomeButton /><header className="morph-library__header"><div className="morph-library__eyebrow">🐍 TINY TITANS · WESTERN HOGNOSE</div><h1>Morph Library</h1><p>Explore genes, super forms and recognised combinations. Tap any entry to open its full genetics record.</p><button type="button" onClick={() => setShowSubmission(true)}>📷 Submit a morph image</button><small>Reference-quality photographs and confirmed morph evidence are required. Every submission is reviewed.</small></header><div className="morph-library__controls"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search morphs, aliases or components…" aria-label="Search morph library" /><div className="morph-library__filters" role="group" aria-label="Morph type filters">{(["all", "gene", "combination", "polygenic", "line-bred"] as const).map((value) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : value.replace("-", " ")}</button>)}</div></div><div className="morph-library__count">Showing <strong>{filtered.length}</strong> of <strong>{entries.length}</strong> records</div><div className="morph-grid morph-library__grid">{filtered.map((morph) => <button className="morph-card morph-card--interactive" key={morph.geneId} type="button" onClick={() => setSelected(morph)}><div className="morph-card__topline"><span>{morph.kind}</span><span>{morph.verification}</span></div><h2>{morph.name}</h2><p className="morph-card__inheritance">{morph.inheritance}</p>{morph.contains && morph.contains.length > 0 ? <p className="morph-card__contains">Contains: {morph.contains.join(" + ")}</p> : <p>{morph.description ?? "Reference entry"}</p>}<span className="morph-card__open">Open details →</span></button>)}</div>{filtered.length === 0 && <div className="welcome-card"><h2>No matching morphs</h2><p>Try a different name, alias or category.</p></div>}{selected && <MorphDetail morph={selected} onClose={() => setSelected(null)} />}{showSubmission && <MorphSubmissionDialog entries={entries} onClose={() => setShowSubmission(false)} />}</main>;
}
