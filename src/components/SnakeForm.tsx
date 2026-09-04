import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Snake } from "../types/Snake";
import type { Het } from "../types/genetics";
import type { WeightRecord } from "../types/Weight";
import type { MorphSubmissionInputV2 } from "../services/morphSubmissionServiceV2";
import MultiSelectDropdown from "./MultiSelectDropdown";
import HetSelector from "./HetSelector";
import TinyTitansDateInput from "./TinyTitansDateInput";
import SpeciesSelector from "./SpeciesSelector";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import { getSpeciesHetGenes, getSpeciesGeneticsStatus, getSpeciesVisualMorphs } from "../data/species/speciesGenetics";
import { getDateDuration } from "../utils/dateDuration";
import { compressImage } from "../utils/imageCompression";
import { useUnits } from "../context/UnitContextValue";

type SnakeFormProps = {
  form: { name: string; species: string; photo: string; sex: Snake["sex"]; morphs: string[]; customMorph: string; hets: Het[]; customHets: string; startingWeight: number | null; startingWeightDate: string; weight: number | null; lastWeighedDate: string; weightHistory: WeightRecord[]; hatchDate: string; arrivalDate: string; notes: string };
  updateField: (field: string, value: unknown) => void;
  onSave: () => void;
  onMorphLibrarySubmit?: (input: MorphSubmissionInputV2) => Promise<void>;
  editing: boolean;
  saving?: boolean;
};

export default function SnakeForm({ form, updateField, onSave, onMorphLibrarySubmit, editing, saving = false }: SnakeFormProps) {
  const { isImperial, weightUnit } = useUnits();
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitToMorphLibrary, setSubmitToMorphLibrary] = useState(false);
  const [morphLibraryMorphId, setMorphLibraryMorphId] = useState("");
  const [morphLibraryDescription, setMorphLibraryDescription] = useState("");
  const [morphLibraryProof, setMorphLibraryProof] = useState("");
  const [morphLibraryConfirmed, setMorphLibraryConfirmed] = useState(false);
  const [morphLibraryPhotoConfirmed, setMorphLibraryPhotoConfirmed] = useState(false);
  const [creditMode, setCreditMode] = useState<"name" | "social" | "anonymous">("anonymous");
  const [creditName, setCreditName] = useState("");
  const [creditSocial, setCreditSocial] = useState("");
  const [morphSubmissionStatus, setMorphSubmissionStatus] = useState("");
  const speciesRecord = findSnakeSpecies(form.species);
  const selectedSpeciesId = speciesRecord?.id ?? "heterodon-nasicus";
  const speciesDisplayName = speciesRecord?.commonNames[0] ?? speciesRecord?.acceptedScientificName ?? "this species";
  const visualMorphOptions = getSpeciesVisualMorphs(selectedSpeciesId);
  const morphLibraryOptions = visualMorphOptions.filter((option) => !/normal|wild type/i.test(option.name));
  const hetOptions = getSpeciesHetGenes(selectedSpeciesId);
  const geneticsStatus = getSpeciesGeneticsStatus(selectedSpeciesId);
  const toDisplayWeight = (grams: number | null) => grams == null ? "" : String(isImperial ? grams / 28.349523125 : grams);
  const toStoredWeight = (value: string) => { if (!value) return null; const number = Number(value); return Number.isFinite(number) ? isImperial ? number * 28.349523125 : number : null; };

  function handleSpeciesChange(speciesId: string) {
    const species = findSnakeSpecies(speciesId);
    if (!species) return;
    updateField("species", species.commonNames[0] ?? species.acceptedScientificName);
    updateField("morphs", []);
    updateField("hets", []);
    setMorphLibraryMorphId("");
  }

  function handleMorphLibraryToggle(checked: boolean) {
    setSubmitToMorphLibrary(checked);
    setMorphSubmissionStatus("");
    if (!checked) {
      setMorphLibraryConfirmed(false);
      setMorphLibraryPhotoConfirmed(false);
    }
  }

  function handleMorphSelection(value: string) {
    setMorphLibraryMorphId(value);
    const option = morphLibraryOptions.find((item) => item.geneId === value);
    if (option && !morphLibraryDescription) {
      setMorphLibraryDescription(`${form.name || "This animal"} — community photo submitted for ${option.name} review.`);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setMorphSubmissionStatus("");
    if (saving || processingPhoto || !form.name.trim()) return;

    if (submitToMorphLibrary) {
      const selectedMorph = morphLibraryOptions.find((option) => option.geneId === morphLibraryMorphId);
      if (!onMorphLibrarySubmit) {
        setMorphSubmissionStatus("Morph Library submission is temporarily unavailable.");
        return;
      }
      if (!photoFile) {
        setMorphSubmissionStatus("Add a new photo before sending it to the Morph Library review queue.");
        return;
      }
      if (!selectedMorph) {
        setMorphSubmissionStatus(`Choose the exact ${speciesDisplayName} Morph Library entry this photo belongs to.`);
        return;
      }
      if (!morphLibraryDescription.trim()) {
        setMorphSubmissionStatus("Add a short description for the Morph Library reviewer.");
        return;
      }
      if (!morphLibraryProof.trim()) {
        setMorphSubmissionStatus("Add the lineage, breeder, pairing or other evidence notes supporting this morph identification.");
        return;
      }
      if (!morphLibraryConfirmed || !morphLibraryPhotoConfirmed) {
        setMorphSubmissionStatus("Confirm the morph identification and that you have permission to submit the photograph.");
        return;
      }
      if (creditMode === "name" && !creditName.trim()) {
        setMorphSubmissionStatus("Enter the keeper name to display with the approved photo, or choose another credit option.");
        return;
      }
      if (creditMode === "social" && !creditSocial.trim()) {
        setMorphSubmissionStatus("Enter the social handle/link to display with the approved photo, or choose another credit option.");
        return;
      }

      setMorphSubmissionStatus("📤 Sending this photo to Tiny Titans for Morph Library review…");
      void onMorphLibrarySubmit({
        speciesId: selectedSpeciesId,
        morphId: selectedMorph.geneId,
        morphName: selectedMorph.name,
        description: morphLibraryDescription.trim(),
        observedTraits: form.customMorph.trim() || form.morphs.join(", "),
        proofDetails: morphLibraryProof.trim(),
        image: photoFile,
        factualAccuracyConfirmed: true,
        photoRequirementsConfirmed: true,
        allowMorphLibraryLink: true,
        creditMode,
        creditName: creditMode === "name" ? creditName.trim() : undefined,
        creditSocial: creditMode === "social" ? creditSocial.trim() : undefined,
      }).then(() => {
        setMorphSubmissionStatus("✅ Photo sent to Tiny Titans. It will stay private until it is reviewed and approved.");
        onSave();
      }).catch((error) => {
        setMorphSubmissionStatus(error instanceof Error ? `⚠️ Morph Library submission failed: ${error.message}` : "⚠️ Morph Library submission failed. Your snake was not saved yet.");
      });
      return;
    }

    onSave();
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    setMorphSubmissionStatus("");
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose a JPEG, PNG or WebP image. Some mobile browsers cannot decode HEIC/HEIF photos reliably."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPhotoError("Please choose a JPEG, PNG or WebP image. HEIC/HEIF is not supported by the browser image processor yet."); return; }
    if (file.size > 20 * 1024 * 1024) { setPhotoError("That photo is too large. Please choose a photo under 20 MB."); return; }
    setProcessingPhoto(true);
    try {
      updateField("photo", await compressImage(file));
      setPhotoFile(file);
    } catch (error) {
      setPhotoFile(null);
      setPhotoError(error instanceof Error ? error.message : "Tiny Titans could not process this photo.");
    } finally {
      setProcessingPhoto(false);
    }
  }

  return <form className="snake-form" onSubmit={handleSubmit} noValidate>
    <h2>{editing ? "✏️ Edit Snake" : "🐍 Add Snake"}</h2>{saving && <div className="date-duration-display" role="status">💾 Saving your snake to Tiny Titans...</div>}{submitAttempted && !saving && !form.name.trim() && <div className="date-duration-display" role="alert">⚠️ Please enter a snake name before saving.</div>}
    <h3>🐍 Basic Information</h3><label htmlFor="snake-name">Snake Name</label><input id="snake-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required disabled={saving} /><SpeciesSelector id="snake-species" value={selectedSpeciesId} onChange={handleSpeciesChange} label="Species" disabled={saving} />
    <label>Photo</label><label htmlFor="snake-photo" className="snake-photo-picker">{processingPhoto ? "⏳ Processing photo..." : form.photo ? "📷 Change Photo" : "📷 Add Photo"}</label><input id="snake-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={processingPhoto || saving} style={{ display: "none" }} />{photoError && <div className="date-duration-display" role="alert">⚠️ {photoError}</div>}{form.photo && !processingPhoto && <><img src={form.photo} alt={form.name || "Snake preview"} className="snake-form-photo" /><button type="button" className="snake-photo-remove" onClick={() => { updateField("photo", ""); setPhotoFile(null); }} disabled={saving}>Remove Photo</button></>}
    {onMorphLibrarySubmit && <div className="tracker-card" style={{ marginTop: "0.75rem" }}><h3>🧬 Add to Morph Library</h3><p>Submit this keeper photograph directly to Tiny Titans for review. It is <strong>not published automatically</strong>. After approval, it is linked only to the exact species and Morph Library entry selected below.</p><label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}><input type="checkbox" checked={submitToMorphLibrary} onChange={(event) => handleMorphLibraryToggle(event.target.checked)} disabled={saving || processingPhoto} /><span><strong>Send this photo to the Morph Library review queue</strong><br /><small>Use this when the photo clearly represents a known Morph Library entry.</small></span></label>{submitToMorphLibrary && <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.75rem" }}><label htmlFor="morph-library-target">Correct {speciesDisplayName} Morph Library entry</label><select id="morph-library-target" value={morphLibraryMorphId} onChange={(event) => handleMorphSelection(event.target.value)} disabled={saving || processingPhoto}><option value="">Select the exact morph…</option>{morphLibraryOptions.map((option) => <option key={option.geneId} value={option.geneId}>{option.name}</option>)}</select><label htmlFor="morph-library-description">Photo description</label><textarea id="morph-library-description" value={morphLibraryDescription} onChange={(event) => setMorphLibraryDescription(event.target.value)} placeholder="What does this photo show?" disabled={saving} /><label htmlFor="morph-library-proof">Evidence / lineage / breeder notes</label><textarea id="morph-library-proof" value={morphLibraryProof} onChange={(event) => setMorphLibraryProof(event.target.value)} placeholder="e.g. breeder record, pairing, lineage or other identification evidence" disabled={saving} /><label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}><input type="checkbox" checked={morphLibraryConfirmed} onChange={(event) => setMorphLibraryConfirmed(event.target.checked)} disabled={saving} /><span>I confirm this is my best-supported morph identification and I understand Tiny Titans will review it before publication.</span></label><label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}><input type="checkbox" checked={morphLibraryPhotoConfirmed} onChange={(event) => setMorphLibraryPhotoConfirmed(event.target.checked)} disabled={saving} /><span>I took this photograph or have permission to submit it to Tiny Titans.</span></label><label htmlFor="morph-credit-mode">Photo credit</label><select id="morph-credit-mode" value={creditMode} onChange={(event) => setCreditMode(event.target.value as "name" | "social" | "anonymous")} disabled={saving}><option value="anonymous">Anonymous</option><option value="name">Display my name</option><option value="social">Display my social handle/link</option></select>{creditMode === "name" && <input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Name to display" disabled={saving} />}{creditMode === "social" && <input value={creditSocial} onChange={(event) => setCreditSocial(event.target.value)} placeholder="Social handle or link" disabled={saving} />}{morphSubmissionStatus && <div className="date-duration-display" role="status">{morphSubmissionStatus}</div>}</div>}</div>}
    <label htmlFor="snake-sex">Sex</label><select id="snake-sex" value={form.sex} onChange={(e) => updateField("sex", e.target.value)} disabled={saving}><option value="Unknown">Unknown</option><option value="Male">Male</option><option value="Female">Female</option></select>
    <h3>📅 Dates & Timeline</h3><TinyTitansDateInput id="hatch-date" label="Hatch Date" value={form.hatchDate} onChange={(value) => updateField("hatchDate", value)} disabled={saving} />{form.hatchDate && <div className="date-duration-display">🎂 Age: <strong>{getDateDuration(form.hatchDate)}</strong></div>}<TinyTitansDateInput id="arrival-date" label="Arrival Date" value={form.arrivalDate} onChange={(value) => updateField("arrivalDate", value)} disabled={saving} />{form.arrivalDate && <div className="date-duration-display">🏠 Time with you: <strong>{getDateDuration(form.arrivalDate)}</strong></div>}
    <h3>⚖️ Weight Tracking</h3><label htmlFor="starting-weight">Starting Weight ({weightUnit})</label><input id="starting-weight" type="number" inputMode="decimal" min="0" step="any" placeholder={isImperial ? "e.g. 2" : "e.g. 50.74"} value={toDisplayWeight(form.startingWeight)} onChange={(e) => { const value = toStoredWeight(e.target.value); updateField("startingWeight", value); if (value !== null && !form.startingWeightDate) updateField("startingWeightDate", new Date().toISOString().split("T")[0]); }} disabled={saving} />
    <TinyTitansDateInput id="starting-weight-date" label="Starting Weight Date" value={form.startingWeightDate} onChange={(value) => updateField("startingWeightDate", value)} disabled={saving} /><label htmlFor="current-weight">Current Weight ({weightUnit})</label><input id="current-weight" type="number" inputMode="decimal" min="0" step="any" placeholder={isImperial ? "e.g. 3.2" : "e.g. 90.25"} value={toDisplayWeight(form.weight)} onChange={(e) => updateField("weight", toStoredWeight(e.target.value))} disabled={saving} />
    <TinyTitansDateInput id="last-weighed-date" label="Last Weighed Date" value={form.lastWeighedDate} onChange={(value) => updateField("lastWeighedDate", value)} disabled={saving} />
    <h3>🧬 Visual Morphs</h3><MultiSelectDropdown title={`Select ${speciesDisplayName} morphs`} options={visualMorphOptions} selected={form.morphs} setSelected={(value) => updateField("morphs", value)} />{geneticsStatus === "baseline-only" && <div className="date-duration-display">🧬 {speciesDisplayName} currently has a species-scoped baseline phenotype entry. No Hognose genes are substituted. Add verified species genetics through Custom Morph / Genetics until the species catalogue is expanded.</div>}<label htmlFor="custom-morph">Custom Morph / Genetics</label><input id="custom-morph" value={form.customMorph} onChange={(e) => updateField("customMorph", e.target.value)} disabled={saving} />
    <h3>🧬 Hets</h3>{hetOptions.length > 0 ? <HetSelector options={hetOptions} selected={form.hets} setSelected={(value) => updateField("hets", value)} /> : <div className="date-duration-display">🧬 No recognised recessive carrier genes are currently catalogued for {speciesDisplayName}. Do not invent a het from appearance alone; use Additional Genetics Notes for verified lineage information.</div>}<label htmlFor="custom-hets">Additional Genetics Notes</label><textarea id="custom-hets" value={form.customHets} onChange={(e) => updateField("customHets", e.target.value)} disabled={saving} /><label htmlFor="snake-notes">Notes</label><textarea id="snake-notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} disabled={saving} />
    <button type="submit" className="save-snake-button" disabled={saving || processingPhoto}>{processingPhoto ? "⏳ Processing Photo..." : saving ? "💾 Saving..." : submitToMorphLibrary ? "📤 Send Photo for Review & Save Snake" : "💾 Save Snake"}</button>
  </form>;
}
