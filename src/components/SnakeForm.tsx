import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Snake } from "../types/Snake";
import type { Het } from "../types/genetics";
import type { WeightRecord } from "../types/Weight";
import MultiSelectDropdown from "./MultiSelectDropdown";
import HetSelector from "./HetSelector";
import TinyTitansDateInput from "./TinyTitansDateInput";
import { getMasterHetGenes, masterMorphs } from "../data/masterMorphDatabase";
import { getDateDuration } from "../utils/dateDuration";
import { compressImage } from "../utils/imageCompression";
import { useUnits } from "../context/UnitContextValue";

type SnakeFormProps = {
  form: { name: string; species: string; photo: string; sex: Snake["sex"]; morphs: string[]; customMorph: string; hets: Het[]; customHets: string; startingWeight: number | null; startingWeightDate: string; weight: number | null; lastWeighedDate: string; weightHistory: WeightRecord[]; hatchDate: string; arrivalDate: string; notes: string };
  updateField: (field: string, value: unknown) => void;
  onSave: () => void;
  editing: boolean;
  saving?: boolean;
};

const masterVisualMorphOptions = masterMorphs;
const masterHetOptions = getMasterHetGenes();

export default function SnakeForm({ form, updateField, onSave, editing, saving = false }: SnakeFormProps) {
  const { isImperial, weightUnit } = useUnits();
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const toDisplayWeight = (grams: number | null) => grams == null ? "" : String(isImperial ? grams / 28.349523125 : grams);
  const toStoredWeight = (value: string) => { if (!value) return null; const number = Number(value); return Number.isFinite(number) ? isImperial ? number * 28.349523125 : number : null; };

  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitAttempted(true); if (saving || processingPhoto || !form.name.trim()) return; onSave(); }
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose a JPEG, PNG or WebP image. Some mobile browsers cannot decode HEIC/HEIF photos reliably."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPhotoError("Please choose a JPEG, PNG or WebP image. HEIC/HEIF is not supported by the browser image processor yet."); return; }
    if (file.size > 20 * 1024 * 1024) { setPhotoError("That photo is too large. Please choose a photo under 20 MB."); return; }
    setProcessingPhoto(true);
    try { updateField("photo", await compressImage(file)); } catch (error) { setPhotoError(error instanceof Error ? error.message : "Tiny Titans could not process this photo."); } finally { setProcessingPhoto(false); }
  }

  return <form className="snake-form" onSubmit={handleSubmit} noValidate>
    <h2>{editing ? "✏️ Edit Snake" : "🐍 Add Snake"}</h2>{saving && <div className="date-duration-display" role="status">💾 Saving your snake to Tiny Titans...</div>}{submitAttempted && !saving && !form.name.trim() && <div className="date-duration-display" role="alert">⚠️ Please enter a snake name before saving.</div>}
    <h3>🐍 Basic Information</h3><label htmlFor="snake-name">Snake Name</label><input id="snake-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required disabled={saving} /><label htmlFor="snake-species">Species</label><input id="snake-species" value={form.species} onChange={(e) => updateField("species", e.target.value)} disabled={saving} />
    <label>Photo</label><label htmlFor="snake-photo" className="snake-photo-picker">{processingPhoto ? "⏳ Processing photo..." : form.photo ? "📷 Change Photo" : "📷 Add Photo"}</label><input id="snake-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={processingPhoto || saving} style={{ display: "none" }} />{photoError && <div className="date-duration-display" role="alert">⚠️ {photoError}</div>}{form.photo && !processingPhoto && <><img src={form.photo} alt={form.name || "Snake preview"} className="snake-form-photo" /><button type="button" className="snake-photo-remove" onClick={() => updateField("photo", "")} disabled={saving}>Remove Photo</button></>}
    <label htmlFor="snake-sex">Sex</label><select id="snake-sex" value={form.sex} onChange={(e) => updateField("sex", e.target.value)} disabled={saving}><option value="Unknown">Unknown</option><option value="Male">Male</option><option value="Female">Female</option></select>
    <h3>📅 Dates & Timeline</h3><TinyTitansDateInput id="hatch-date" label="Hatch Date" value={form.hatchDate} onChange={(value) => updateField("hatchDate", value)} disabled={saving} />{form.hatchDate && <div className="date-duration-display">🎂 Age: <strong>{getDateDuration(form.hatchDate)}</strong></div>}<TinyTitansDateInput id="arrival-date" label="Arrival Date" value={form.arrivalDate} onChange={(value) => updateField("arrivalDate", value)} disabled={saving} />{form.arrivalDate && <div className="date-duration-display">🏠 Time with you: <strong>{getDateDuration(form.arrivalDate)}</strong></div>}
    <h3>⚖️ Weight Tracking</h3><label htmlFor="starting-weight">Starting Weight ({weightUnit})</label><input id="starting-weight" type="number" inputMode="decimal" min="0" step="any" placeholder={isImperial ? "e.g. 2" : "e.g. 50.74"} value={toDisplayWeight(form.startingWeight)} onChange={(e) => { const value = toStoredWeight(e.target.value); updateField("startingWeight", value); if (value !== null && !form.startingWeightDate) updateField("startingWeightDate", new Date().toISOString().split("T")[0]); }} disabled={saving} />
    <TinyTitansDateInput id="starting-weight-date" label="Starting Weight Date" value={form.startingWeightDate} onChange={(value) => updateField("startingWeightDate", value)} disabled={saving} /><label htmlFor="current-weight">Current Weight ({weightUnit})</label><input id="current-weight" type="number" inputMode="decimal" min="0" step="any" placeholder={isImperial ? "e.g. 3.2" : "e.g. 90.25"} value={toDisplayWeight(form.weight)} onChange={(e) => updateField("weight", toStoredWeight(e.target.value))} disabled={saving} />
    <TinyTitansDateInput id="last-weighed-date" label="Last Weighed Date" value={form.lastWeighedDate} onChange={(value) => updateField("lastWeighedDate", value)} disabled={saving} />
    <h3>🧬 Visual Morphs</h3><MultiSelectDropdown title="Select Morphs" options={masterVisualMorphOptions} selected={form.morphs} setSelected={(value) => updateField("morphs", value)} /><label htmlFor="custom-morph">Custom Morph</label><input id="custom-morph" value={form.customMorph} onChange={(e) => updateField("customMorph", e.target.value)} disabled={saving} /><h3>🧬 Hets</h3><HetSelector options={masterHetOptions} selected={form.hets} setSelected={(value) => updateField("hets", value)} /><label htmlFor="custom-hets">Additional Genetics Notes</label><textarea id="custom-hets" value={form.customHets} onChange={(e) => updateField("customHets", e.target.value)} disabled={saving} /><label htmlFor="snake-notes">Notes</label><textarea id="snake-notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} disabled={saving} />
    <button type="submit" className="save-snake-button" disabled={saving || processingPhoto}>{processingPhoto ? "⏳ Processing Photo..." : saving ? "💾 Saving..." : "💾 Save Snake"}</button>
  </form>;
}
