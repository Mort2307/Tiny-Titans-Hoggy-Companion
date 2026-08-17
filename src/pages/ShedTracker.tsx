import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { ShedAssistance, ShedQuality, ShedRecord, ShedStatus, RetainedShedArea } from "../types/Shed";
import { getUserSnakes } from "../services/snakeService";
import { deleteSnakeShed, getSnakeSheds, saveSnakeShed } from "../services/shedService";
import { useAuth } from "../context/useAuth";
<<<<<<< HEAD
import { useUnits } from "../context/UnitContextValue";
=======
import { useUnits } from "../context/UnitContextValueValue";
>>>>>>> origin/master
import { generateId } from "../utils/generateId";
import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";

const qualities: ShedQuality[] = ["Perfect", "Good", "Partial", "Difficult", "Unknown"];
const statuses: ShedStatus[] = ["Complete", "Partial", "Problematic"];
const retainedAreas: RetainedShedArea[] = ["Eye Cap", "Head", "Tail Tip", "Body", "Other"];
const assistances: ShedAssistance[] = ["None", "Monitoring Only", "Humidity Adjustment", "Keeper Intervention", "Veterinary Assistance"];

function normaliseRetainedAreas(shed: ShedRecord): RetainedShedArea[] {
  if (Array.isArray(shed.retainedAreas) && shed.retainedAreas.length) return shed.retainedAreas;
  const areas: RetainedShedArea[] = [];
  if (shed.retainedEyeCaps) areas.push("Eye Cap");
  if (shed.retainedTailTip) areas.push("Tail Tip");
  if (shed.retainedShedArea !== "None" && shed.retainedShedArea !== "Multiple Areas") areas.push(shed.retainedShedArea);
  return [...new Set(areas)];
}

export default function ShedTracker() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, lengthUnit, formatLength, formatWeight, weightUnit } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [sheds, setSheds] = useState<ShedRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadedShedsKey, setLoadedShedsKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShedRecord | null>(null);
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

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let cancelled = false;
    void getUserSnakes(user.uid).then((loaded) => {
      if (cancelled) return;
      const valid = loaded.filter((snake) => Boolean(snake?.id));
      setSnakes(valid);
      setSelectedSnakeId((current) => routeSnakeId && valid.some((snake) => snake.id === routeSnakeId) ? routeSnakeId : valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? "");
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load your snakes.");
    }).finally(() => {
      if (!cancelled) setLoadingSnakes(false);
    });
    return () => { cancelled = true; };
  }, [user, loading, profileLoading, routeSnakeId]);

  const shedsKey = user && selectedSnakeId ? `${user.uid}:${selectedSnakeId}` : null;
  const loadingSheds = Boolean(shedsKey && loadedShedsKey !== shedsKey);

  useEffect(() => {
    if (!user || !selectedSnakeId) return;
    let cancelled = false;
    void getSnakeSheds(user.uid, selectedSnakeId).then((records) => {
      if (!cancelled) setSheds(records);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load shed history.");
    }).finally(() => {
      if (!cancelled) setLoadedShedsKey(shedsKey);
    });
    return () => { cancelled = true; };
  }, [user, selectedSnakeId, shedsKey]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const measured = useMemo(() => sheds.filter((shed) => typeof shed.shedLength === "number" && Number.isFinite(shed.shedLength) && shed.shedLength > 0), [sheds]);
  const averageLength = measured.length ? measured.reduce((sum, shed) => sum + (shed.shedLength ?? 0), 0) / measured.length : 0;

  function resetForm() {
    setEditingId(null); setDate(new Date().toISOString().split("T")[0]); setBluePhaseStarted(false); setEyesSkinCleared(false);
    setShedStatus("Complete"); setSelectedRetainedAreas([]); setQuality("Unknown"); setAssistance("None"); setShedLength(""); setSnakeWeight(""); setNotes("");
  }

  const editShed = useCallback((shed: ShedRecord) => {
    setEditingId(shed.id); setDate(shed.date); setBluePhaseStarted(shed.bluePhaseStarted); setEyesSkinCleared(shed.eyesSkinCleared);
    setShedStatus(shed.status ?? (shed.shedCompleted ? "Complete" : "Partial")); setSelectedRetainedAreas(normaliseRetainedAreas(shed));
    setQuality(shed.quality); setAssistance(shed.assistance);
    setShedLength(shed.shedLength == null ? "" : String(isImperial ? shed.shedLength / 2.54 : shed.shedLength));
    setSnakeWeight(shed.snakeWeight == null ? "" : String(isImperial ? shed.snakeWeight / 28.349523125 : shed.snakeWeight)); setNotes(shed.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isImperial]);

  useEffect(() => {
    const recordId = searchParams.get("record");
    if (!recordId || sheds.length === 0) return;
    const record = sheds.find((item) => item.id === recordId);
    if (!record) return;
    queueMicrotask(() => {
      editShed(record);
      setSuccess("📌 Opened from the Life Timeline. You are editing this exact shed record.");
      requestAnimationFrame(() => document.getElementById("shed-date")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      setSearchParams((current) => { current.delete("record"); return current; }, { replace: true });
    });
  }, [sheds, searchParams, setSearchParams, editShed]);

  function toggleRetainedArea(area: RetainedShedArea) { setSelectedRetainedAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area]); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!user || !selectedSnakeId) { setError("Please select a snake and make sure you are logged in."); return; }
    if (shedLength !== "" && (!Number.isFinite(Number(shedLength)) || Number(shedLength) < 0)) { setError(`Please enter a valid shed length in ${lengthUnit}.`); return; }
    if (snakeWeight !== "" && (!Number.isFinite(Number(snakeWeight)) || Number(snakeWeight) < 0)) { setError(`Please enter a valid snake weight in ${weightUnit}.`); return; }
    setSaving(true);
    try {
      const legacyRetainedArea = selectedRetainedAreas.length === 0 ? "None" : selectedRetainedAreas.length === 1 ? selectedRetainedAreas[0] : "Multiple Areas";
      const record: ShedRecord = {
        id: editingId ?? generateId(), snakeId: selectedSnakeId, date, bluePhaseStarted, eyesSkinCleared, shedCompleted: shedStatus === "Complete",
        retainedShedArea: legacyRetainedArea, retainedAreas: selectedRetainedAreas, retainedEyeCaps: selectedRetainedAreas.includes("Eye Cap"), retainedTailTip: selectedRetainedAreas.includes("Tail Tip"),
        status: shedStatus, quality, assistance,
        ...(shedLength !== "" ? { shedLength: isImperial ? Number(shedLength) * 2.54 : Number(shedLength) } : {}),
        ...(snakeWeight !== "" ? { snakeWeight: isImperial ? Number(snakeWeight) * 28.349523125 : Number(snakeWeight) } : {}), notes: notes.trim(),
      };
      const saved = await saveSnakeShed(user.uid, record);
      setSheds((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)));
      setLoadedShedsKey(shedsKey); setSuccess(editingId ? "Shed record updated successfully." : "Shed recorded successfully."); resetForm();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save this shed."); } finally { setSaving(false); }
  }

  async function handleDelete(shed: ShedRecord) {
    if (!user) return; setDeleteTarget(null); setSaving(true); setError("");
    try { await deleteSnakeShed(user.uid, shed.snakeId, shed.id); setSheds((current) => current.filter((item) => item.id !== shed.id)); if (editingId === shed.id) resetForm(); setSuccess("Shed record deleted."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete this shed."); } finally { setSaving(false); }
  }

  if (loading || profileLoading || (Boolean(user) && loadingSnakes)) return <div className="page-container"><BackHomeButton /><h1>🐍 Shed Tracker</h1><div className="tracker-card"><p>Loading Tiny Titans...</p></div></div>;

  return <><div className="page-container"><BackHomeButton /><h1>🐍 Shed Tracker</h1><p>Track shed dates separately from shed condition, retained areas and keeper observations.</p>{error && <div className="tracker-card" role="alert">⚠️ {error}</div>}{success && <div className="tracker-card" role="status">✅ {success}</div>}{snakes.length === 0 ? <div className="tracker-card"><h3>No snakes found 🐍</h3><p>Add a snake before recording a shed.</p><button type="button" onClick={() => navigate("/snakes")}>➕ Add a Snake</button></div> : <><div className="tracker-card"><h3>🐍 Snake</h3><label htmlFor="shed-snake">Record shed for</label><select id="shed-snake" value={selectedSnakeId} onChange={(e) => { setSelectedSnakeId(e.target.value); resetForm(); }} disabled={saving}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select>{selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}</div><div className="tracker-card"><h3>{editingId ? "✏️ Edit Shed" : "🐍 Record Shed"}</h3><form onSubmit={(e) => void handleSubmit(e)}><label htmlFor="shed-date">Shed Date</label><input id="shed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} required /><label><input type="checkbox" checked={bluePhaseStarted} onChange={(e) => setBluePhaseStarted(e.target.checked)} disabled={saving} /> Blue phase occurred</label><label><input type="checkbox" checked={eyesSkinCleared} onChange={(e) => setEyesSkinCleared(e.target.checked)} disabled={saving} /> Eyes/skin cleared</label><label htmlFor="shed-status">Shed Status</label><select id="shed-status" value={shedStatus} onChange={(e) => setShedStatus(e.target.value as ShedStatus)} disabled={saving}>{statuses.map((item) => <option key={item}>{item}</option>)}</select><fieldset><legend>Retained Shed Areas</legend><p>Select every area that applies. Leave all unticked for no retained shed.</p>{retainedAreas.map((area) => <label key={area}><input type="checkbox" checked={selectedRetainedAreas.includes(area)} onChange={() => toggleRetainedArea(area)} disabled={saving} /> {area}</label>)}</fieldset><label htmlFor="shed-quality">Shed Quality</label><select id="shed-quality" value={quality} onChange={(e) => setQuality(e.target.value as ShedQuality)} disabled={saving}>{qualities.map((item) => <option key={item}>{item}</option>)}</select><label htmlFor="shed-assistance">Assistance</label><select id="shed-assistance" value={assistance} onChange={(e) => setAssistance(e.target.value as ShedAssistance)} disabled={saving}>{assistances.map((item) => <option key={item}>{item}</option>)}</select><label htmlFor="shed-length">Shed Length ({lengthUnit})</label><input id="shed-length" type="number" min="0" step="any" inputMode="decimal" value={shedLength} onChange={(e) => setShedLength(e.target.value)} placeholder={isImperial ? "e.g. 18" : "e.g. 45"} disabled={saving} /><label htmlFor="shed-weight">Snake Weight ({weightUnit})</label><input id="shed-weight" type="number" min="0" step="any" inputMode="decimal" value={snakeWeight} onChange={(e) => setSnakeWeight(e.target.value)} placeholder={isImperial ? "e.g. 3.5" : "e.g. 100"} disabled={saving} /><p><small>Snake weight here is contextual shed information. It does not automatically create a Weight Tracker record.</small></p><label htmlFor="shed-notes">Detailed Observations / Notes</label><textarea id="shed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Anything worth recording about this shed..." disabled={saving} /><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="submit" disabled={saving}>{saving ? "💾 Saving..." : editingId ? "💾 Update Shed" : "🐍 Record Shed"}</button>{editingId && <button type="button" onClick={resetForm} disabled={saving}>Cancel Edit</button>}</div></form></div><div className="tracker-card"><h3>📊 Shed Measurements</h3><p><strong>Measured sheds:</strong> {measured.length}</p><p><strong>Average shed length:</strong> {averageLength ? formatLength(averageLength) : "No measurements"}</p></div><div className="tracker-card"><h3>📋 Shed History</h3>{loadingSheds ? <p>Loading shed history...</p> : sheds.length === 0 ? <><p>No shed records yet. Your first record will start this snake's shedding timeline.</p><button type="button" onClick={() => document.getElementById("shed-date")?.focus()}>🐍 Record First Shed</button></> : sheds.map((shed) => { const areas = normaliseRetainedAreas(shed); const status = shed.status ?? (shed.shedCompleted ? "Complete" : "Partial"); return <div key={shed.id} className="tracker-card"><h3>🐍 {shed.date}</h3><p>Status: <strong>{status}</strong></p><p>Quality: <strong>{shed.quality}</strong></p>{shed.shedLength !== undefined && <p>📏 Length: {formatLength(shed.shedLength)}</p>}{shed.snakeWeight !== undefined && <p>⚖️ Snake weight: {formatWeight(shed.snakeWeight)}</p>}<p>Retained: {areas.length ? areas.join(", ") : "None"}</p>{shed.assistance !== "None" && <p>Assistance: {shed.assistance}</p>}{shed.notes && <p>📝 {shed.notes}</p>}<div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "18px" }}><button type="button" onClick={() => editShed(shed)} disabled={saving}>✏️ Edit</button><button type="button" onClick={() => setDeleteTarget(shed)} disabled={saving}>🗑️ Delete</button></div></div>; })}</div><div className="tracker-card"><h3>🐍 Next Steps</h3><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="button" onClick={() => navigate(`/snakes/${selectedSnakeId}/master-record`)}>Open Master Record</button><button type="button" onClick={() => navigate(`/snakes/${selectedSnakeId}/weights`)}>Log Weight</button><button type="button" onClick={() => navigate(`/snakes/${selectedSnakeId}/feeding`)}>Log Feeding</button></div></div></>}</div><ConfirmActionDialog open={Boolean(deleteTarget)} title="Delete this shed record?" description={<p>The {deleteTarget?.date ?? "selected"} shed record will be permanently removed from this snake's shed history.</p>} confirmLabel="Delete Shed" busy={Boolean(deleteTarget && saving)} onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }} onCancel={() => { if (!saving) setDeleteTarget(null); }} /></>;
}
