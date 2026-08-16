import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { Snake } from "../types/Snake";
import type { ShedAssistance, ShedPhoto, ShedQuality, ShedRecord, ShedStatus, RetainedShedArea } from "../types/Shed";
import { getUserSnakes } from "../services/snakeService";
import { deleteSnakeShed, getSnakeSheds, saveSnakeShed } from "../services/shedService";
import { getLearningProgress, syncTrackerAchievementCounts } from "../services/learningEngine";
import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";
import { generateId } from "../utils/generateId";
import BackHomeButton from "../components/BackHomeButton";

const qualities: ShedQuality[] = ["Perfect", "Good", "Partial", "Difficult", "Unknown"];
const statuses: ShedStatus[] = ["Complete", "Partial", "Problematic"];
const retainedAreas: RetainedShedArea[] = ["Eye Cap", "Head", "Tail Tip", "Body", "Other"];
const assistances: ShedAssistance[] = ["None", "Monitoring Only", "Humidity Adjustment", "Keeper Intervention", "Veterinary Assistance"];
const MAX_PHOTOS = 5;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function normaliseRetainedAreas(shed: ShedRecord): RetainedShedArea[] {
  if (Array.isArray(shed.retainedAreas) && shed.retainedAreas.length) return shed.retainedAreas;
  const areas: RetainedShedArea[] = [];
  if (shed.retainedEyeCaps) areas.push("Eye Cap");
  if (shed.retainedTailTip) areas.push("Tail Tip");
  if (shed.retainedShedArea !== "None" && shed.retainedShedArea !== "Multiple Areas") areas.push(shed.retainedShedArea);
  return [...new Set(areas)];
}

function supportedImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export default function ShedTracker() {
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, lengthUnit, formatLength, formatWeight, weightUnit } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [sheds, setSheds] = useState<ShedRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadingSheds, setLoadingSheds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [bluePhaseStarted, setBluePhaseStarted] = useState(false);
  const [eyesSkinCleared, setEyesSkinCleared] = useState(false);
  const [shedStatus, setShedStatus] = useState<ShedStatus>("Complete");
  const [selectedRetainedAreas, setSelectedRetainedAreas] = useState<RetainedShedArea[]>([]);
  const [quality, setQuality] = useState<ShedQuality>("Unknown");
  const [assistance, setAssistance] = useState<ShedAssistance>("None");
  const [shedLength, setShedLength] = useState("");
  const [snakeWeight, setSnakeWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<ShedPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      setLoadingSnakes(false);
      return;
    }
    void getUserSnakes(user.uid)
      .then((loaded) => {
        const valid = loaded.filter((snake) => Boolean(snake?.id));
        setSnakes(valid);
        setSelectedSnakeId((current) => valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load your snakes."))
      .finally(() => setLoadingSnakes(false));
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !selectedSnakeId) {
      setSheds([]);
      return;
    }
    setLoadingSheds(true);
    void getSnakeSheds(user.uid, selectedSnakeId)
      .then(setSheds)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load shed history."))
      .finally(() => setLoadingSheds(false));
  }, [user, selectedSnakeId]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const measured = useMemo(() => sheds.filter((shed) => typeof shed.shedLength === "number" && Number.isFinite(shed.shedLength) && shed.shedLength > 0), [sheds]);
  const averageLength = measured.length ? measured.reduce((sum, shed) => sum + (shed.shedLength ?? 0), 0) / measured.length : 0;
  const photoCount = existingPhotos.length + newPhotos.length;

  function syncShedAchievements(count: number) {
    if (!user) return;
    const current = getLearningProgress(user.uid).trackerCounts;
    syncTrackerAchievementCounts(user.uid, { ...current, shedLogs: count });
  }

  function resetForm() {
    setEditingId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setBluePhaseStarted(false);
    setEyesSkinCleared(false);
    setShedStatus("Complete");
    setSelectedRetainedAreas([]);
    setQuality("Unknown");
    setAssistance("None");
    setShedLength("");
    setSnakeWeight("");
    setNotes("");
    setExistingPhotos([]);
    setNewPhotos([]);
    setRemovedPhotoPaths([]);
  }

  function editShed(shed: ShedRecord) {
    setEditingId(shed.id);
    setDate(shed.date);
    setBluePhaseStarted(shed.bluePhaseStarted);
    setEyesSkinCleared(shed.eyesSkinCleared);
    setShedStatus(shed.status ?? (shed.shedCompleted ? "Complete" : "Partial"));
    setSelectedRetainedAreas(normaliseRetainedAreas(shed));
    setQuality(shed.quality);
    setAssistance(shed.assistance);
    setShedLength(shed.shedLength == null ? "" : String(isImperial ? shed.shedLength / 2.54 : shed.shedLength));
    setSnakeWeight(shed.snakeWeight == null ? "" : String(isImperial ? shed.snakeWeight / 28.349523125 : shed.snakeWeight));
    setNotes(shed.notes ?? "");
    setExistingPhotos(shed.photos ?? []);
    setNewPhotos([]);
    setRemovedPhotoPaths([]);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleRetainedArea(area: RetainedShedArea) {
    setSelectedRetainedAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area]);
  }

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const invalid = selected.find((file) => !supportedImage(file) || file.size > MAX_SOURCE_BYTES);
    if (invalid) {
      setError("Shed photos must be JPEG, PNG, WebP or supported HEIC/HEIF images under 20 MB each.");
      return;
    }

    const available = MAX_PHOTOS - photoCount;
    if (available <= 0) {
      setError(`A shed log can contain up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const additions = selected.slice(0, available);
    setNewPhotos((current) => [...current, ...additions]);
    setError(selected.length > available ? `Only ${available} more photo${available === 1 ? "" : "s"} can be added to this shed.` : "");
  }

  function removeExistingPhoto(photo: ShedPhoto) {
    setExistingPhotos((current) => current.filter((item) => item.id !== photo.id));
    setRemovedPhotoPaths((current) => current.includes(photo.storagePath) ? current : [...current, photo.storagePath]);
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!user || !selectedSnakeId) {
      setError("Please select a snake and make sure you are logged in.");
      return;
    }
    if (shedLength !== "" && (!Number.isFinite(Number(shedLength)) || Number(shedLength) < 0)) {
      setError(`Please enter a valid shed length in ${lengthUnit}.`);
      return;
    }
    if (snakeWeight !== "" && (!Number.isFinite(Number(snakeWeight)) || Number(snakeWeight) < 0)) {
      setError(`Please enter a valid snake weight in ${weightUnit}.`);
      return;
    }
    if (photoCount > MAX_PHOTOS) {
      setError(`You can save up to ${MAX_PHOTOS} shed photos.`);
      return;
    }

    setSaving(true);
    try {
      const legacyRetainedArea = selectedRetainedAreas.length === 0 ? "None" : selectedRetainedAreas.length === 1 ? selectedRetainedAreas[0] : "Multiple Areas";
      const record: ShedRecord = {
        id: editingId ?? generateId(),
        snakeId: selectedSnakeId,
        date,
        bluePhaseStarted,
        eyesSkinCleared,
        shedCompleted: shedStatus === "Complete",
        retainedShedArea: legacyRetainedArea,
        retainedAreas: selectedRetainedAreas,
        retainedEyeCaps: selectedRetainedAreas.includes("Eye Cap"),
        retainedTailTip: selectedRetainedAreas.includes("Tail Tip"),
        status: shedStatus,
        quality,
        assistance,
        ...(shedLength !== "" ? { shedLength: isImperial ? Number(shedLength) * 2.54 : Number(shedLength) } : {}),
        ...(snakeWeight !== "" ? { snakeWeight: isImperial ? Number(snakeWeight) * 28.349523125 : Number(snakeWeight) } : {}),
        notes: notes.trim(),
        ...(existingPhotos.length ? { photos: existingPhotos } : { photos: [] }),
      };

      const wasEditing = Boolean(editingId);
      const saved = await saveSnakeShed(user.uid, record, newPhotos, removedPhotoPaths);
      const nextSheds = [saved, ...sheds.filter((item) => item.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date));
      setSheds(nextSheds);
      syncShedAchievements(nextSheds.length);
      setSuccess(wasEditing ? "Shed record and photo set updated successfully." : "Shed record and photos saved successfully.");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this shed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(shed: ShedRecord) {
    if (!user || !window.confirm(`Remove the shed recorded on ${shed.date} from your active history?`)) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await deleteSnakeShed(user.uid, shed.snakeId, shed.id);
      const nextSheds = sheds.filter((item) => item.id !== shed.id);
      setSheds(nextSheds);
      syncShedAchievements(nextSheds.length);
      if (editingId === shed.id) resetForm();
      setSuccess("Shed record removed from your active history. The historical record remains safely stored.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove this shed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || profileLoading || loadingSnakes) return <div className="page-container"><BackHomeButton /><h1>🐍 Shed Tracker</h1><div className="tracker-card"><p>Loading Tiny Titans...</p></div></div>;

  return <div className="page-container">
    <BackHomeButton />
    <h1>🐍 Shed Tracker</h1>
    <p>Track shed dates separately from shed condition, retained areas, measurements and keeper observations.</p>
    {error && <div className="tracker-card" role="alert">⚠️ {error}</div>}
    {success && <div className="tracker-card" role="status">✅ {success}</div>}
    {snakes.length === 0 ? <div className="tracker-card"><h3>No snakes found 🐍</h3><p>Add a snake before recording a shed.</p></div> : <>
      <div className="tracker-card">
        <h3>🐍 Snake</h3>
        <label htmlFor="shed-snake">Record shed for</label>
        <select id="shed-snake" value={selectedSnakeId} onChange={(e) => { setSelectedSnakeId(e.target.value); resetForm(); }} disabled={saving}>
          {snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}
        </select>
        {selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}
      </div>

      <div className="tracker-card">
        <h3>{editingId ? "✏️ Edit Shed" : "🐍 Record Shed"}</h3>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="shed-date">Shed Date</label>
          <input id="shed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} required />
          <label><input type="checkbox" checked={bluePhaseStarted} onChange={(e) => setBluePhaseStarted(e.target.checked)} disabled={saving} /> Blue phase occurred</label>
          <label><input type="checkbox" checked={eyesSkinCleared} onChange={(e) => setEyesSkinCleared(e.target.checked)} disabled={saving} /> Eyes/skin cleared</label>
          <label htmlFor="shed-status">Shed Status</label>
          <select id="shed-status" value={shedStatus} onChange={(e) => setShedStatus(e.target.value as ShedStatus)} disabled={saving}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <fieldset><legend>Retained Shed Areas</legend><p>Select every area that applies. Leave all unticked for no retained shed.</p>{retainedAreas.map((area) => <label key={area}><input type="checkbox" checked={selectedRetainedAreas.includes(area)} onChange={() => toggleRetainedArea(area)} disabled={saving} /> {area}</label>)}</fieldset>
          <label htmlFor="shed-quality">Shed Quality</label>
          <select id="shed-quality" value={quality} onChange={(e) => setQuality(e.target.value as ShedQuality)} disabled={saving}>{qualities.map((item) => <option key={item}>{item}</option>)}</select>
          <label htmlFor="shed-assistance">Assistance</label>
          <select id="shed-assistance" value={assistance} onChange={(e) => setAssistance(e.target.value as ShedAssistance)} disabled={saving}>{assistances.map((item) => <option key={item}>{item}</option>)}</select>
          <label htmlFor="shed-length">Shed Length ({lengthUnit})</label>
          <input id="shed-length" type="number" min="0" step="any" inputMode="decimal" value={shedLength} onChange={(e) => setShedLength(e.target.value)} placeholder={isImperial ? "e.g. 18" : "e.g. 45"} disabled={saving} />
          <label htmlFor="shed-weight">Snake Weight ({weightUnit})</label>
          <input id="shed-weight" type="number" min="0" step="any" inputMode="decimal" value={snakeWeight} onChange={(e) => setSnakeWeight(e.target.value)} placeholder={isImperial ? "e.g. 3.5" : "e.g. 100"} disabled={saving} />
          <label htmlFor="shed-notes">Detailed Observations / Notes</label>
          <textarea id="shed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Behaviour, retained areas, environment, difficulty or anything worth remembering..." disabled={saving} />

          <div className="shed-photo-panel">
            <h4>📸 Shed Photos</h4>
            <p>Add up to {MAX_PHOTOS} photos. Photos are resized, compressed and persisted to Firebase Storage.</p>
            <label htmlFor="shed-photos" className="tiny-titans-photo-button">📷 Add Photos</label>
            <input id="shed-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={handlePhotos} disabled={saving || photoCount >= MAX_PHOTOS} style={{ display: "none" }} />
            <p><small>{photoCount}/{MAX_PHOTOS} photos selected • JPEG, PNG, WebP and supported HEIC/HEIF • 20 MB source limit per photo</small></p>
            {existingPhotos.length > 0 && <div className="shed-photo-grid"><strong>Saved photos</strong>{existingPhotos.map((photo) => <div key={photo.id} className="shed-photo-item"><img src={photo.url} alt={photo.name || "Shed record"} loading="lazy" /><span>{photo.name || "Saved photo"}</span><button type="button" onClick={() => removeExistingPhoto(photo)} disabled={saving}>Remove</button></div>)}</div>}
            {newPhotos.length > 0 && <div className="shed-photo-list"><strong>New photos to upload</strong>{newPhotos.map((file, index) => <div key={`${file.name}-${index}`}><span>📷 {file.name}</span><button type="button" onClick={() => removeNewPhoto(index)} disabled={saving}>Remove</button></div>)}</div>}
          </div>

          <button type="submit" disabled={saving}>{saving ? "💾 Saving to Firebase..." : editingId ? "💾 Update Shed" : "🐍 Record Shed"}</button>
          {editingId && <button type="button" onClick={resetForm} disabled={saving}>Cancel Edit</button>}
        </form>
      </div>

      <div className="tracker-card"><h3>📊 Shed Measurements</h3><p><strong>Measured sheds:</strong> {measured.length}</p><p><strong>Average shed length:</strong> {averageLength ? formatLength(averageLength) : "No measurements"}</p></div>

      <div className="tracker-card">
        <h3>📋 Shed History</h3>
        {loadingSheds ? <p>Loading shed history...</p> : sheds.length === 0 ? <p>No shed records yet.</p> : sheds.map((shed) => {
          const areas = normaliseRetainedAreas(shed);
          const status = shed.status ?? (shed.shedCompleted ? "Complete" : "Partial");
          return <div key={shed.id} className="tracker-card">
            <h3>🐍 {shed.date}</h3>
            <p>Status: <strong>{status}</strong></p>
            <p>Quality: <strong>{shed.quality}</strong></p>
            {shed.shedLength !== undefined && <p>📏 Length: {formatLength(shed.shedLength)}</p>}
            {shed.snakeWeight !== undefined && <p>⚖️ Snake weight: {formatWeight(shed.snakeWeight)}</p>}
            <p>Retained: {areas.length ? areas.join(", ") : "None"}</p>
            {shed.assistance !== "None" && <p>Assistance: {shed.assistance}</p>}
            {shed.notes && <p>📝 {shed.notes}</p>}
            {shed.photos?.length ? <div><p>📸 {shed.photos.length} stored photo{shed.photos.length === 1 ? "" : "s"}</p><div className="shed-photo-grid">{shed.photos.map((photo) => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.name || "Shed record"} loading="lazy" /></a>)}</div></div> : null}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}><button type="button" onClick={() => editShed(shed)} disabled={saving}>✏️ Edit</button><button type="button" onClick={() => void handleDelete(shed)} disabled={saving}>🗑️ Remove</button></div>
          </div>;
        })}
      </div>
    </>}
  </div>;
}
