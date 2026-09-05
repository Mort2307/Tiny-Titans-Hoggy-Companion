import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { INITIAL_SNAKE_SPECIES, findSnakeSpecies } from "../data/species/speciesRegistry";
import { getApprovedVivariumShowcases, submitVivariumShowcase } from "../services/vivariumShowcaseService";
import type { VivariumCreditMode, VivariumShowcaseSubmission } from "../types/vivariumShowcase";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/vivariumShowcase.css";

const emptyForm = {
  speciesId: "heterodon-nasicus", individualName: "", title: "", description: "", whatWorks: "", whatChanged: "", lessonsLearned: "",
  enclosureType: "", dimensions: "", setupAge: "", substrate: "", heating: "", thermostat: "", lighting: "", humidity: "", temperature: "",
  ventilation: "", hidesAndEnrichment: "", plantsAndBioactive: "", waterAndFeeding: "", creditMode: "anonymous" as VivariumCreditMode, creditName: "", creditSocial: "",
};

type FormState = typeof emptyForm;
const inputClass = "vivarium-field";

function formatDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MediaStrip({ submission }: { submission: VivariumShowcaseSubmission }) {
  return <div className="vivarium-media-grid">{submission.media?.map((media) => media.type === "video"
    ? <figure key={media.id} className="vivarium-media-card"><video controls preload="metadata" src={media.url} aria-label={media.caption || `${submission.title} setup video`} /><figcaption>🎥 Video walkthrough</figcaption></figure>
    : <figure key={media.id} className="vivarium-media-card"><img src={media.url} alt={media.caption || `${submission.title} enclosure`} loading="lazy" /><figcaption>📷 Enclosure photograph</figcaption></figure>)}
  </div>;
}

function ShowcaseCard({ submission }: { submission: VivariumShowcaseSubmission }) {
  const species = findSnakeSpecies(submission.speciesId);
  const credit = submission.creditMode === "name" ? submission.creditName : submission.creditMode === "social" ? submission.creditSocial : "Anonymous keeper";
  return <article className="vivarium-showcase-card">
    <div className="vivarium-showcase-card__heading"><div><span className="vivarium-kicker">KEEPER SETUP · {species?.commonNames[0] || submission.speciesName}</span><h3>{submission.title}</h3><p>{submission.description}</p></div><span className="vivarium-date">{formatDate(submission.submittedAt)}</span></div>
    <MediaStrip submission={submission} />
    <div className="vivarium-meta-grid">
      {submission.dimensions && <div><span>Enclosure</span><strong>{submission.dimensions}</strong></div>}
      {submission.enclosureType && <div><span>Type</span><strong>{submission.enclosureType}</strong></div>}
      {submission.substrate && <div><span>Substrate</span><strong>{submission.substrate}</strong></div>}
      {submission.temperature && <div><span>Temperature</span><strong>{submission.temperature}</strong></div>}
      {submission.humidity && <div><span>Humidity</span><strong>{submission.humidity}</strong></div>}
      {submission.setupAge && <div><span>Setup age</span><strong>{submission.setupAge}</strong></div>}
    </div>
    <div className="vivarium-learning-grid">
      {submission.whatWorks && <section><h4>💚 What works well</h4><p>{submission.whatWorks}</p></section>}
      {submission.whatChanged && <section><h4>🔧 What I changed</h4><p>{submission.whatChanged}</p></section>}
      {submission.lessonsLearned && <section><h4>🧠 Lessons learned</h4><p>{submission.lessonsLearned}</p></section>}
      <section><h4>🪴 Setup details</h4><p>{[submission.heating && `Heating: ${submission.heating}`, submission.thermostat && `Control: ${submission.thermostat}`, submission.lighting && `Lighting: ${submission.lighting}`, submission.ventilation && `Ventilation: ${submission.ventilation}`, submission.hidesAndEnrichment && `Enrichment: ${submission.hidesAndEnrichment}`, submission.plantsAndBioactive && `Plants/bioactive: ${submission.plantsAndBioactive}`, submission.waterAndFeeding && `Water/feeding: ${submission.waterAndFeeding}`].filter(Boolean).join(" · ") || "No additional setup details supplied."}</p></section>
    </div>
    <footer className="vivarium-showcase-card__footer"><span>Shared by {credit}</span><span>Community setup · not a universal husbandry recommendation</span></footer>
  </article>;
}

export default function VivariumShowcase() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [showcases, setShowcases] = useState<VivariumShowcaseSubmission[]>([]);
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleShowcases = useMemo(() => speciesFilter === "all" ? showcases : showcases.filter((item) => item.speciesId === speciesFilter), [showcases, speciesFilter]);
  const speciesOptions = useMemo(() => INITIAL_SNAKE_SPECIES.slice().sort((a, b) => a.commonNames[0].localeCompare(b.commonNames[0])), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getApprovedVivariumShowcases().then((items) => { if (mounted) setShowcases(items); }).catch((loadError) => { if (mounted) setError(loadError instanceof Error ? loadError.message : "Unable to load community setups."); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function update(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function closeForm() { if (busy) return; setShowForm(false); setSent(false); setError(""); setForm({ ...emptyForm }); setFiles([]); if (fileRef.current) fileRef.current.value = ""; }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!user) { setError("You must be signed in to share a setup."); return; }
    setBusy(true);
    try {
      await submitVivariumShowcase({ ...form, media: files });
      setSent(true); setFiles([]); if (fileRef.current) fileRef.current.value = "";
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to submit this setup."); } finally { setBusy(false); }
  }

  return <main className="page-container vivarium-showcase-page">
    <BackHomeButton />
    <header className="vivarium-hero">
      <div><span className="vivarium-kicker">🏡 TINY TITANS · COMMUNITY LEARNING</span><h1>Vivarium Showcase</h1><p>See how other keepers build and run their enclosures, take ideas, compare approaches and learn from real-world experience.</p><p className="vivarium-philosophy"><strong>No setup is being ranked.</strong> This is a library of keeper approaches — not a “mine is better than yours” competition.</p></div>
      <button type="button" className="primary-button" onClick={() => { setError(""); setSent(false); setShowForm(true); }} disabled={!user}>🏡 Share my setup</button>
    </header>

    <section className="vivarium-community-note"><span>🧠</span><div><strong>Community experience, not universal law.</strong><p>Tiny Titans husbandry guidance remains separate. Community setups show what individual keepers do, what has worked for them, and what they have learned.</p></div></section>

    <section className="vivarium-filter-bar"><label>Species<select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}><option value="all">All species</option>{speciesOptions.map((species) => <option key={species.id} value={species.id}>{species.commonNames[0]}</option>)}</select></label><span>{visibleShowcases.length} published setup{visibleShowcases.length === 1 ? "" : "s"}</span></section>

    {loading && <div className="tracker-card vivarium-empty"><h2>Loading community setups…</h2><p>Fetching approved keeper examples.</p></div>}
    {!loading && error && <div className="tracker-card vivarium-empty"><h2>We couldn't load the showcase.</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
    {!loading && !error && !visibleShowcases.length && <div className="tracker-card vivarium-empty"><h2>Be the first setup in the showcase. 🐍</h2><p>Share a real enclosure, explain why you built it that way, and help the next keeper learn from it.</p></div>}
    {!loading && !error && visibleShowcases.length > 0 && <section className="vivarium-showcase-list">{visibleShowcases.map((submission) => <ShowcaseCard key={submission.id} submission={submission} />)}</section>}

    {showForm && <div className="vivarium-modal-backdrop" role="presentation" onMouseDown={closeForm}><article className="vivarium-modal" role="dialog" aria-modal="true" aria-labelledby="vivarium-submit-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="vivarium-modal__close" type="button" onClick={closeForm} aria-label="Close">×</button>
      {sent ? <div className="vivarium-success"><div className="vivarium-success__icon">🏡</div><span className="vivarium-kicker">SETUP SUBMITTED</span><h2 id="vivarium-submit-title">Your vivarium is in review.</h2><p>Thanks for sharing it. A Creator will review the submission before it enters the community showcase.</p><p>Your setup is being treated as keeper experience and learning material — not as a universal husbandry prescription.</p><button type="button" className="primary-button" onClick={closeForm}>Done</button></div> : <form onSubmit={(event) => void submit(event)}>
        <span className="vivarium-kicker">COMMUNITY SETUP SUBMISSION</span><h2 id="vivarium-submit-title">Share your vivarium</h2><p className="vivarium-form-intro">Tell people what you built, why you built it and what you have learned. Honest trade-offs are useful — this is about sharing ideas, not winning a setup contest.</p>
        <div className="vivarium-form-grid"><label className={inputClass}>Species<select value={form.speciesId} onChange={(event) => update("speciesId", event.target.value)}>{speciesOptions.map((species) => <option key={species.id} value={species.id}>{species.commonNames[0]} · {species.acceptedScientificName}</option>)}</select></label><label className={inputClass}>Individual name <span className="optional">optional</span><input value={form.individualName} onChange={(event) => update("individualName", event.target.value)} placeholder="e.g. Marmalade" /></label><label className={inputClass}>Setup title<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Naturalistic adult hognose setup" required /></label><label className={inputClass}>Enclosure dimensions<input value={form.dimensions} onChange={(event) => update("dimensions", event.target.value)} placeholder="e.g. 4 × 2 × 2 ft" /></label><label className={inputClass}>Enclosure type<input value={form.enclosureType} onChange={(event) => update("enclosureType", event.target.value)} placeholder="Front-opening glass, PVC, tub, custom…" /></label><label className={inputClass}>How long has this setup been running?<input value={form.setupAge} onChange={(event) => update("setupAge", event.target.value)} placeholder="e.g. 9 months" /></label></div>
        <label className={inputClass}>What does the setup look like?<textarea rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the enclosure and your thinking behind it…" required /></label>
        <div className="vivarium-form-grid"><label className={inputClass}>Substrate<textarea rows={2} value={form.substrate} onChange={(event) => update("substrate", event.target.value)} /></label><label className={inputClass}>Heating<textarea rows={2} value={form.heating} onChange={(event) => update("heating", event.target.value)} /></label><label className={inputClass}>Thermostat / control<textarea rows={2} value={form.thermostat} onChange={(event) => update("thermostat", event.target.value)} /></label><label className={inputClass}>Lighting / UVB<textarea rows={2} value={form.lighting} onChange={(event) => update("lighting", event.target.value)} /></label><label className={inputClass}>Temperature range<textarea rows={2} value={form.temperature} onChange={(event) => update("temperature", event.target.value)} placeholder="Warm / cool / night where relevant" /></label><label className={inputClass}>Humidity<textarea rows={2} value={form.humidity} onChange={(event) => update("humidity", event.target.value)} /></label><label className={inputClass}>Ventilation<textarea rows={2} value={form.ventilation} onChange={(event) => update("ventilation", event.target.value)} /></label><label className={inputClass}>Hides & enrichment<textarea rows={2} value={form.hidesAndEnrichment} onChange={(event) => update("hidesAndEnrichment", event.target.value)} /></label><label className={inputClass}>Plants / bioactive<textarea rows={2} value={form.plantsAndBioactive} onChange={(event) => update("plantsAndBioactive", event.target.value)} /></label><label className={inputClass}>Water / feeding area<textarea rows={2} value={form.waterAndFeeding} onChange={(event) => update("waterAndFeeding", event.target.value)} /></label></div>
        <div className="vivarium-form-grid"><label className={inputClass}>💚 What works well?<textarea rows={3} value={form.whatWorks} onChange={(event) => update("whatWorks", event.target.value)} placeholder="What would you keep or recommend to another keeper as an idea?" /></label><label className={inputClass}>🔧 What have you changed?<textarea rows={3} value={form.whatChanged} onChange={(event) => update("whatChanged", event.target.value)} placeholder="What did you try that you later changed, and why?" /></label><label className={inputClass}>🧠 Lessons learned<textarea rows={3} value={form.lessonsLearned} onChange={(event) => update("lessonsLearned", event.target.value)} placeholder="Anything you wish you'd known earlier?" /></label></div>
        <section className="vivarium-upload"><h3>📸 Images & 🎥 video</h3><p>Add up to 6 enclosure images/videos. A clear main enclosure photo is ideal, but walkthrough videos are welcome too.</p><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />{files.length > 0 && <div className="vivarium-selected-files">{files.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.type.startsWith("video/") ? "🎥" : "📷"} {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>)}</div>}</section>
        <section className="vivarium-credit"><h3>Credit & privacy</h3><label className={inputClass}>Credit<select value={form.creditMode} onChange={(event) => update("creditMode", event.target.value as VivariumCreditMode)}><option value="anonymous">Anonymous keeper</option><option value="name">Show my name</option><option value="social">Show my social handle</option></select></label>{form.creditMode === "name" && <label className={inputClass}>Display name<input value={form.creditName} onChange={(event) => update("creditName", event.target.value)} placeholder="Name to show publicly" /></label>}{form.creditMode === "social" && <label className={inputClass}>Social handle/link<input value={form.creditSocial} onChange={(event) => update("creditSocial", event.target.value)} placeholder="@handle or profile link" /></label>}<label className="vivarium-check"><input type="checkbox" defaultChecked required /> I confirm I have permission to share these images/videos and want this setup considered for the Tiny Titans community showcase.</label></section>
        {error && <p className="vivarium-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy ? "Uploading setup…" : "Submit vivarium for review"}</button>
      </form>}
    </article></div>}
  </main>;
}
