import { useEffect, useMemo, useRef, useState } from "react";
import SpeciesSelector from "../components/SpeciesSelector";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import { getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import { submitMorphImageV2, type MorphCreditMode } from "../services/morphSubmissionServiceV2";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import "../styles/morphLibrary.css";

function asReferenceEntry(entry: MasterMorphDefinition): MorphReferenceEntry {
  return entry as MorphReferenceEntry;
}

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function SpeciesMorphImageSubmissionDialog({
  onClose,
  initialMorphId,
  initialSpeciesId,
}: {
  onClose: () => void;
  initialMorphId: string;
  initialSpeciesId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [speciesId, setSpeciesId] = useState(findSnakeSpecies(initialSpeciesId)?.id ?? initialSpeciesId);
  const selectedSpecies = findSnakeSpecies(speciesId);
  const speciesEntries = useMemo(() => getSpeciesVisualMorphs(speciesId).map(asReferenceEntry), [speciesId]);
  const fallbackEntries = useMemo(() => speciesEntries.length ? speciesEntries : masterMorphs.map(asReferenceEntry), [speciesEntries]);
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

  useEffect(() => {
    setSelectedMorph(speciesEntries.find((entry) => entry.geneId === initialMorphId) ?? speciesEntries[0] ?? null);
    setMorphSearch("");
    setMorphMenuOpen(false);
  }, [initialMorphId, speciesEntries]);

  const morphOptions = useMemo(() => {
    const needle = normalise(morphSearch);
    if (!needle) return fallbackEntries.slice(0, 80);
    return fallbackEntries.filter((entry) => [entry.name, ...(entry.aliases ?? []), ...(entry.contains ?? [])].map(normalise).some((value) => value.includes(needle))).slice(0, 80);
  }, [fallbackEntries, morphSearch]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!selectedSpecies) { setError("Select a recognised snake species first."); return; }
    if (!selectedMorph) { setError("Select the canonical morph this photograph represents."); return; }
    if (!image || !photoRequirementsConfirmed || !factualAccuracyConfirmed) { setError("Add a compliant photograph and confirm the evidence requirements."); return; }
    setBusy(true);
    try {
      await submitMorphImageV2({ speciesId, morphId: selectedMorph.geneId, morphName: selectedMorph.name, description, observedTraits, proofDetails, proofReference, photoRequirementsConfirmed, factualAccuracyConfirmed, creditMode, creditName, creditSocial, image });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't submit the morph image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="morph-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="morph-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="morph-detail__close" type="button" onClick={onClose} aria-label="Close">×</button>
        {sent ? (
          <>
            <div className="morph-detail__eyebrow">🐍 SUBMISSION RECEIVED</div>
            <h2>Thanks — it is in review.</h2>
            <p className="morph-detail__description">Your image for {selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName} · {selectedMorph?.name ?? "selected morph"} has been linked to the species-specific Morph Library entry and sent to Creator review.</p>
            <button type="button" onClick={onClose}>Done</button>
          </>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="morph-detail__eyebrow">🐍 MORPH IMAGE SUBMISSION</div>
            <h2>Submit a morph image</h2>
            <SpeciesSelector id="species-morph-image-submission-species" value={speciesId} onChange={setSpeciesId} label="Species" />
            <section className="morph-detail__section">
              <h3>🧬 Select the canonical morph</h3>
              <p className="morph-detail__source-note">This photograph will be tagged to the selected species and exact Morph Library entry. A pending genetics catalogue still supports Normal / Wild Type image evidence.</p>
              <div className="morph-selector">
                <button type="button" className="morph-selector__trigger" onClick={() => setMorphMenuOpen((open) => !open)}>{selectedMorph?.name ?? "Select a morph…"}</button>
                {morphMenuOpen && <div className="morph-selector__menu"><input autoFocus value={morphSearch} onChange={(event) => setMorphSearch(event.target.value)} placeholder="Search morphs or aliases…" />{morphOptions.map((entry) => <button key={entry.geneId} type="button" onClick={() => { setSelectedMorph(entry); setMorphMenuOpen(false); }}>{entry.name}<small>{entry.kind} · {entry.inheritance}</small></button>)}</div>}
              </div>
            </section>
            <label>What are we looking at?<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} required /></label>
            <label>Known genetic information<textarea value={observedTraits} onChange={(event) => setObservedTraits(event.target.value)} rows={2} /></label>
            <label>Evidence / proof<textarea value={proofDetails} onChange={(event) => setProofDetails(event.target.value)} rows={3} required /></label>
            <label>Proof reference<input value={proofReference} onChange={(event) => setProofReference(event.target.value)} /></label>
            <label className="morph-submit-check"><input type="checkbox" checked={photoRequirementsConfirmed} onChange={(event) => setPhotoRequirementsConfirmed(event.target.checked)} /><span>Photo is clear, full-body and unfiltered.</span></label>
            <label className="morph-submit-check"><input type="checkbox" checked={factualAccuracyConfirmed} onChange={(event) => setFactualAccuracyConfirmed(event.target.checked)} /><span>I have provided evidence supporting the identification.</span></label>
            <input ref={fileRef} className="morph-submit-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => setImage(event.target.files?.[0] ?? null)} required />
            <button type="button" className="morph-submit-photo-button" onClick={() => fileRef.current?.click()}>📷 {image ? "Change photo" : "Add photo"}</button>
            <section className="morph-detail__section"><h3>Credit</h3><div className="morph-detail__badges">{(["name", "social", "anonymous"] as MorphCreditMode[]).map((mode) => <button key={mode} type="button" className={creditMode === mode ? "is-active" : ""} onClick={() => setCreditMode(mode)}>{mode === "name" ? "Name" : mode === "social" ? "Social" : "Anonymous"}</button>)}</div>{creditMode === "name" && <input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Name" required />}{creditMode === "social" && <input value={creditSocial} onChange={(event) => setCreditSocial(event.target.value)} placeholder="@handle" required />}</section>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
          </form>
        )}
      </article>
    </div>
  );
}
