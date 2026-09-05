import { useMemo, useRef, useState } from "react";
import { useSpeciesContext } from "../context/SpeciesContext";
import { getSpeciesGeneticsStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { submitMorphImageV2, type MorphCreditMode } from "../services/morphSubmissionServiceV2";
import type { MasterMorphDefinition } from "../data/masterMorphDatabase";

function baselineEntry(): MasterMorphDefinition {
  return { geneId: "normal", name: "Wild Type / Unclassified", aliases: ["Normal", "Wild Type", "Wildtype", "Wild", "Unclassified"], kind: "Gene", isGene: false, category: "Baseline phenotype", inheritance: "Unknown", hetPossible: false, verification: "Recognised", description: "Baseline community reference for an animal that has not been assigned a reviewed genetic morph.", educationalNotes: "A visible difference is not automatically a genetic morph. Community submissions can document unusual animals for evidence gathering and Creator review." } as MasterMorphDefinition;
}

export default function SpeciesMorphCommunityContribution() {
  const { selectedSpeciesId, selectedSpecies } = useSpeciesContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [observedTraits, setObservedTraits] = useState("");
  const [proofDetails, setProofDetails] = useState("Keeper observation; no genetic claim is being made by this submission.");
  const [proofReference, setProofReference] = useState("");
  const [photoRequirementsConfirmed, setPhotoRequirementsConfirmed] = useState(false);
  const [factualAccuracyConfirmed, setFactualAccuracyConfirmed] = useState(false);
  const [creditMode, setCreditMode] = useState<MorphCreditMode>("anonymous");
  const [creditName, setCreditName] = useState("");
  const [creditSocial, setCreditSocial] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [selectedMorphId, setSelectedMorphId] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const speciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "selected species";
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const entries = useMemo(() => {
    const mapped = selectedSpeciesId ? getSpeciesVisualMorphs(selectedSpeciesId) : [];
    const baseline = mapped.find((entry) => entry.geneId === "normal" || entry.name === "Wild Type" || entry.name === "Wild Type / Unclassified") ?? baselineEntry();
    const rest = mapped.filter((entry) => entry.geneId !== baseline.geneId && entry.name !== "Wild Type");
    return [baseline, ...rest].sort((a, b) => (a.geneId === baseline.geneId ? -1 : b.geneId === baseline.geneId ? 1 : a.name.localeCompare(b.name)));
  }, [selectedSpeciesId]);
  const selectedMorph = entries.find((entry) => entry.geneId === selectedMorphId) ?? entries[0] ?? baselineEntry();

  function reset() {
    setDescription(""); setObservedTraits(""); setProofDetails("Keeper observation; no genetic claim is being made by this submission."); setProofReference(""); setPhotoRequirementsConfirmed(false); setFactualAccuracyConfirmed(false); setCreditMode("anonymous"); setCreditName(""); setCreditSocial(""); setImage(null); setSelectedMorphId(entries[0]?.geneId ?? "normal"); setError(""); setSent(false); if (fileRef.current) fileRef.current.value = "";
  }
  function close() { if (busy) return; setOpen(false); reset(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!selectedSpeciesId || !selectedSpecies) { setError("Select a recognised species before contributing an image."); return; }
    if (!image) { setError("Please choose the snake photograph you want to contribute."); return; }
    if (!description.trim()) { setError("Tell us what you are seeing in the photograph."); return; }
    if (!proofDetails.trim()) { setError("Add the observation or evidence context for the photograph."); return; }
    if (!photoRequirementsConfirmed || !factualAccuracyConfirmed) { setError("Please confirm the photograph and observation requirements."); return; }
    setBusy(true);
    try {
      await submitMorphImageV2({ speciesId: selectedSpeciesId, morphId: selectedMorph.geneId, morphName: selectedMorph.name, description, observedTraits, proofDetails, proofReference, photoRequirementsConfirmed: true, factualAccuracyConfirmed: true, allowMorphLibraryLink: true, creditMode, creditName, creditSocial, image });
      setSent(true);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "We couldn't submit the photograph."); } finally { setBusy(false); }
  }

  return <>
    <section className="tracker-card" aria-labelledby="community-photo-title"><div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}><div style={{ flex: "1 1 320px" }}><div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.75 }}>📷 TINY TITANS COMMUNITY EVIDENCE</div><h2 id="community-photo-title" style={{ marginBottom: "0.45rem" }}>Contribute a photo of {speciesName}</h2><p style={{ marginBottom: "0.55rem" }}>Your keeper photographs can help build the visual record for this species — including ordinary wild-type animals and individuals that simply look unusual.</p><p style={{ marginBottom: 0 }}><strong>Important:</strong> a strange-looking snake is not automatically a new morph. Tiny Titans records the observation first; Creator review can investigate patterns later.</p></div><button type="button" className="primary-button" onClick={() => setOpen(true)} disabled={!selectedSpeciesId}>📷 Contribute a snake photo</button></div></section>
    {open && <div className="morph-detail-backdrop" role="presentation" onMouseDown={close}><article className="morph-detail" role="dialog" aria-modal="true" aria-labelledby="species-community-submit-title" onMouseDown={(event) => event.stopPropagation()}><button className="morph-detail__close" type="button" onClick={close} aria-label="Close">×</button>{sent ? <><div className="morph-detail__eyebrow">🐍 EVIDENCE SUBMITTED</div><h2 id="species-community-submit-title">Thanks — your photograph is in review.</h2><p className="morph-detail__description">Your {selectedMorph.name.toLowerCase()} photograph for {speciesName} has been submitted to the Tiny Titans review queue. If the animal shows an interesting pattern or colour difference, this record gives us a starting point for investigation.</p><button type="button" className="primary-button" onClick={close}>Done</button></> : <form onSubmit={(event) => void submit(event)}><div className="morph-detail__eyebrow">📷 SPECIES IMAGE CONTRIBUTION</div><h2 id="species-community-submit-title">Add a community photograph</h2><p className="morph-detail__description">Species: <strong>{speciesName}</strong>. Genetics coverage: <strong>{geneticsStatus}</strong>.</p><section className="morph-detail__section"><h3>What are we looking at?</h3><label>Reference category<select value={selectedMorphId} onChange={(event) => setSelectedMorphId(event.target.value)}>{entries.map((entry) => <option key={entry.geneId} value={entry.geneId}>{entry.name}{entry.geneId === "normal" ? " — safest choice for unusual/unconfirmed animals" : ""}</option>)}</select></label><p className="morph-detail__source-note">Use <strong>Wild Type / Unclassified</strong> when you are documenting an unusual animal but do not have a confirmed genetic identity. That is exactly the sort of evidence that can start an investigation.</p></section><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Describe the animal and the visible colour/pattern features…" required /></label><label>Observed traits<textarea value={observedTraits} onChange={(event) => setObservedTraits(event.target.value)} rows={3} placeholder="Anything unusual: striping, reduced pattern, unexpected colour, eye colour, paradoxical patches, etc." /></label><label>Evidence / keeper context<textarea value={proofDetails} onChange={(event) => setProofDetails(event.target.value)} rows={3} required /></label><label>Optional source/reference<input value={proofReference} onChange={(event) => setProofReference(event.target.value)} placeholder="Breeder record, lineage note, previous discussion, reference URL…" /></label><section className="morph-detail__section"><h3>Photograph</h3><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />{image && <p className="morph-detail__source-note">Selected: <strong>{image.name}</strong> · {(image.size / 1024 / 1024).toFixed(2)} MB</p>}</section><label className="morph-submit-check"><input type="checkbox" checked={photoRequirementsConfirmed} onChange={(event) => setPhotoRequirementsConfirmed(event.target.checked)} /> I confirm this is a clear, relevant photograph of the animal and I have permission to contribute it.</label><label className="morph-submit-check"><input type="checkbox" checked={factualAccuracyConfirmed} onChange={(event) => setFactualAccuracyConfirmed(event.target.checked)} /> I have described what I actually observed and understand that Tiny Titans will not treat this photograph alone as genetic proof.</label><section className="morph-detail__section"><h3>Credit</h3><select value={creditMode} onChange={(event) => setCreditMode(event.target.value as MorphCreditMode)}><option value="anonymous">Anonymous</option><option value="name">Show my name</option><option value="social">Show my social handle</option></select>{creditMode === "name" && <input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Display name" />}{creditMode === "social" && <input value={creditSocial} onChange={(event) => setCreditSocial(event.target.value)} placeholder="Social handle or link" />}</section>{error && <p role="alert" style={{ color: "crimson", fontWeight: 700 }}>{error}</p>}<button type="submit" className="primary-button" disabled={busy}>{busy ? "Submitting photograph…" : "Submit photograph for review"}</button></form>}</article></div>}
  </>;
}
