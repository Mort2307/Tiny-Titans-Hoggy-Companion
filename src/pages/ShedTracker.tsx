import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { RetainedShedArea, ShedAssistance, ShedQuality, ShedRecord, ShedStage, ShedStatus } from "../types/Shed";
import { getActiveShedCycle, getSnakeSheds, deleteSnakeShed, saveSnakeShed } from "../services/shedService";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import { generateId } from "../utils/generateId";
import BackHomeButton from "../components/BackHomeButton";

const stages: ShedStage[] = ["Blue", "Clear", "Complete"];
const qualities: ShedQuality[] = ["Perfect", "Good", "Partial", "Difficult", "Unknown"];
const statuses: ShedStatus[] = ["Complete", "Partial", "Problematic"];
const retainedAreas: RetainedShedArea[] = ["Eye Cap", "Head", "Tail Tip", "Body", "Other"];
const assistances: ShedAssistance[] = ["None", "Monitoring Only", "Humidity Adjustment", "Keeper Intervention", "Veterinary Assistance"];

function todayIso() { return new Date().toISOString().slice(0, 10); }
function displayDate(iso: string) { if (!iso) return ""; const [year, month, day] = iso.split("-"); return `${day}/${month}/${year}`; }
function parseDate(value: string) {
  const clean = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const parts = clean.split("/");
  if (parts.length !== 3) return null;
  let day = Number(parts[0]); let month = Number(parts[1]); let year = Number(parts[2]);
  if (year < 100) year += 2000;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
function daysBetween(from?: string, to?: string) {
  if (!from || !to) return null;
  const a = Date.parse(`${from}T00:00:00Z`); const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}
function retainedFrom(record: ShedRecord) {
  if (record.retainedAreas?.length) return record.retainedAreas;
  const areas: RetainedShedArea[] = [];
  if (record.retainedEyeCaps) areas.push("Eye Cap");
  if (record.retainedTailTip) areas.push("Tail Tip");
  if (record.retainedShedArea && record.retainedShedArea !== "None" && record.retainedShedArea !== "Multiple Areas") areas.push(record.retainedShedArea);
  return [...new Set(areas)];
}
function stageLabel(stage: ShedStage) { return stage === "Blue" ? "🔵 Blue Phase" : stage === "Clear" ? "⚪ Clear Phase" : "🟢 Full Shed"; }

export default function ShedTracker() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, lengthUnit, formatLength, weightUnit } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [sheds, setSheds] = useState<ShedRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadingSheds, setLoadingSheds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stage, setStage] = useState<ShedStage>("Blue");
  const [stageDate, setStageDate] = useState(displayDate(todayIso()));
  const [quality, setQuality] = useState<ShedQuality>("Unknown");
  const [status, setStatus] = useState<ShedStatus>("Complete");
  const [retained, setRetained] = useState<RetainedShedArea[]>([]);
  const [assistance, setAssistance] = useState<ShedAssistance>("None");
  const [shedLength, setShedLength] = useState("");
  const [snakeWeight, setSnakeWeight] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let active = true;
    void getUserSnakes(user.uid).then((items) => {
      if (!active) return;
      const valid = items.filter((snake) => Boolean(snake?.id));
      setSnakes(valid);
      setSelectedSnakeId(routeSnakeId && valid.some((snake) => snake.id === routeSnakeId) ? routeSnakeId : valid[0]?.id ?? "");
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load your snakes."); }).finally(() => { if (active) setLoadingSnakes(false); });
    return () => { active = false; };
  }, [loading, profileLoading, routeSnakeId, user]);

  async function loadSheds(snakeId = selectedSnakeId) {
    if (!user || !snakeId) return;
    setLoadingSheds(true); setError("");
    try { setSheds(await getSnakeSheds(user.uid, snakeId)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load shed history."); } finally { setLoadingSheds(false); }
  }

  useEffect(() => { void loadSheds(); }, [selectedSnakeId, user]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [selectedSnakeId, snakes]);
  const activeCycle = useMemo(() => sheds.find((record) => record.currentStage !== "Complete" && !record.completedAt) ?? null, [sheds]);
  const completedCycles = useMemo(() => sheds.filter((record) => record.completedAt || record.currentStage === "Complete"), [sheds]);
  const measured = useMemo(() => sheds.filter((record) => typeof record.shedLength === "number" && Number.isFinite(record.shedLength) && record.shedLength > 0), [sheds]);
  const averageLength = measured.length ? measured.reduce((sum, record) => sum + (record.shedLength ?? 0), 0) / measured.length : 0;
  const averageInterval = useMemo(() => {
    const dates = completedCycles.map((record) => record.completedAt || record.date).filter(Boolean).sort();
    const gaps = dates.slice(1).map((date, index) => daysBetween(dates[index], date)).filter((value): value is number => value !== null && value > 0);
    return gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : null;
  }, [completedCycles]);
  const activeDuration = activeCycle ? daysBetween(activeCycle.cycleStartedAt || activeCycle.date, todayIso()) : null;

  function clearForm() { setEditingId(null); setStage("Blue"); setStageDate(displayDate(todayIso())); setQuality("Unknown"); setStatus("Complete"); setRetained([]); setAssistance("None"); setShedLength(""); setSnakeWeight(""); setNotes(""); }

  function editCycle(record: ShedRecord, preferredStage?: ShedStage) {
    const nextStage = preferredStage ?? record.currentStage ?? (record.shedCompleted ? "Complete" : record.eyesSkinCleared ? "Clear" : record.bluePhaseStarted ? "Blue" : "Complete");
    const nextDate = nextStage === "Blue" ? record.cycleStartedAt || record.date : nextStage === "Clear" ? record.clearPhaseAt || record.date : record.completedAt || record.date;
    setEditingId(record.id); setStage(nextStage); setStageDate(displayDate(nextDate)); setQuality(record.quality ?? "Unknown"); setStatus(record.status ?? "Complete"); setRetained(retainedFrom(record)); setAssistance(record.assistance ?? "None");
    setShedLength(record.shedLength == null ? "" : String(isImperial ? record.shedLength / 2.54 : record.shedLength));
    setSnakeWeight(record.snakeWeight == null ? "" : String(isImperial ? record.snakeWeight / 28.349523125 : record.snakeWeight)); setNotes(record.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const recordId = searchParams.get("record");
    if (!recordId) return;
    const record = sheds.find((item) => item.id === recordId);
    if (!record) return;
    queueMicrotask(() => { editCycle(record); setSuccess("📌 Opened from the Life Timeline. You are editing this shedding cycle."); setSearchParams((current) => { current.delete("record"); return current; }, { replace: true }); });
  }, [searchParams, setSearchParams, sheds]);

  async function continueActiveCycle() {
    if (!activeCycle) return;
    const next: ShedStage = activeCycle.currentStage === "Blue" ? "Clear" : "Complete";
    editCycle(activeCycle, next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!user || !selectedSnakeId) { setError("Please select a snake and make sure you are logged in."); return; }
    const iso = parseDate(stageDate);
    if (!iso) { setError("Please enter the date as DD/MM/YYYY."); return; }
    if (iso > todayIso()) { setError("A shedding stage cannot be recorded in the future."); return; }
    if (shedLength !== "" && (!Number.isFinite(Number(shedLength)) || Number(shedLength) < 0)) { setError(`Please enter a valid shed length in ${lengthUnit}.`); return; }
    if (snakeWeight !== "" && (!Number.isFinite(Number(snakeWeight)) || Number(snakeWeight) < 0)) { setError(`Please enter a valid snake weight in ${weightUnit}.`); return; }
    setSaving(true);
    try {
      const existing = editingId ? sheds.find((record) => record.id === editingId) : null;
      const base: ShedRecord = existing ?? { id: generateId(), snakeId: selectedSnakeId, date: iso, retainedShedArea: "None", retainedAreas: [], retainedEyeCaps: false, retainedTailTip: false, status: "Complete", quality: "Unknown", assistance: "None", notes: "" };
      const cycleStartedAt = stage === "Blue" ? iso : base.cycleStartedAt || base.date;
      const clearPhaseAt = stage === "Clear" ? iso : base.clearPhaseAt;
      const completedAt = stage === "Complete" ? iso : base.completedAt;
      const finalDate = completedAt || cycleStartedAt || iso;
      const cycleDurationDays = daysBetween(cycleStartedAt, completedAt) ?? undefined;
      const record: ShedRecord = {
        ...base, id: base.id, snakeId: selectedSnakeId, date: finalDate, cycleStartedAt, clearPhaseAt, completedAt,
        currentStage: stage, cycleDurationDays, bluePhaseStarted: Boolean(cycleStartedAt), eyesSkinCleared: Boolean(clearPhaseAt), shedCompleted: Boolean(completedAt),
        retainedShedArea: retained.length === 0 ? "None" : retained.length === 1 ? retained[0] : "Multiple Areas", retainedAreas: retained,
        retainedEyeCaps: retained.includes("Eye Cap"), retainedTailTip: retained.includes("Tail Tip"), status: stage === "Complete" ? status : "Complete", quality, assistance,
        ...(shedLength !== "" ? { shedLength: isImperial ? Number(shedLength) * 2.54 : Number(shedLength) } : {}),
        ...(snakeWeight !== "" ? { snakeWeight: isImperial ? Number(snakeWeight) * 28.349523125 : Number(snakeWeight) } : {}), notes: notes.trim(),
      };
      const saved = await saveSnakeShed(user.uid, record);
      setSheds((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => (b.completedAt || b.cycleStartedAt || b.date).localeCompare(a.completedAt || a.cycleStartedAt || a.date)));
      setSuccess(stage === "Complete" ? "🟢 Full shed recorded. Tiny Titans kept the entire cycle as one event." : `${stageLabel(stage)} recorded. This remains the same shedding cycle.`);
      clearForm();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save this shedding cycle."); } finally { setSaving(false); }
  }

  async function handleDelete(record: ShedRecord) {
    if (!user || !window.confirm(`Delete the entire shedding cycle for ${selectedSnake?.name ?? "this snake"}?`)) return;
    setSaving(true); setError("");
    try { await deleteSnakeShed(user.uid, record.snakeId, record.id); setSheds((current) => current.filter((item) => item.id !== record.id)); if (editingId === record.id) clearForm(); setSuccess("Shedding cycle deleted."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete this shedding cycle."); } finally { setSaving(false); }
  }

  if (loading || profileLoading || (user && loadingSnakes)) return <div className="page-container"><BackHomeButton /><h1>🐍 Shed Tracker</h1><div className="tracker-card"><p>Loading Tiny Titans...</p></div></div>;

  return <div className="page-container">
    <BackHomeButton />
    <h1>🐍 Shed Tracker</h1>
    <p>One physical shed cycle. Blue → Clear → Full Shed are stages of the same event.</p>
    {error && <div className="tracker-card" role="alert">⚠️ {error}</div>}
    {success && <div className="tracker-card" role="status">✅ {success}</div>}
    {snakes.length === 0 ? <div className="tracker-card"><h3>No snakes found 🐍</h3><p>Add a snake before recording a shedding cycle.</p><button type="button" onClick={() => navigate("/snakes")}>➕ Add a Snake</button></div> : <>
      <div className="tracker-card"><h3>🐍 Snake</h3><label htmlFor="shed-snake">Track shedding for</label><select id="shed-snake" value={selectedSnakeId} onChange={(event) => { setSelectedSnakeId(event.target.value); clearForm(); }} disabled={saving}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select>{selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}</div>
      {activeCycle && <div className="tracker-card"><h3>🧠 Active shedding cycle</h3><p><strong>{selectedSnake?.name}</strong> is currently in <strong>{stageLabel(activeCycle.currentStage ?? "Blue")}</strong>.</p><p>Started: {displayDate(activeCycle.cycleStartedAt || activeCycle.date)}{activeDuration !== null ? ` · ${activeDuration} day${activeDuration === 1 ? "" : "s"} so far` : ""}</p><p>💡 Tiny Titans will keep this as <strong>one shed cycle</strong>. Do not create another record for the Clear or Full Shed stage.</p><button type="button" onClick={() => void continueActiveCycle()} disabled={saving}>➡️ Record Next Stage</button></div>}
      <div className="tracker-card"><h3>{editingId ? "✏️ Update Shedding Cycle" : "🐍 Start / Update Shed Cycle"}</h3><form onSubmit={(event) => void handleSubmit(event)}>
        <fieldset><legend>Stage</legend>{stages.map((item) => <label key={item}><input type="radio" name="shed-stage" value={item} checked={stage === item} onChange={() => setStage(item)} disabled={saving} /> {stageLabel(item)}</label>)}</fieldset>
        <label htmlFor="shed-stage-date">Stage date <small>(type DD/MM/YYYY on mobile)</small></label><input id="shed-stage-date" type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/YYYY" value={stageDate} onChange={(event) => setStageDate(event.target.value)} disabled={saving} required />
        {stage === "Complete" && <>
          <label htmlFor="shed-status">Final outcome</label><select id="shed-status" value={status} onChange={(event) => setStatus(event.target.value as ShedStatus)} disabled={saving}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <fieldset><legend>Retained Shed Areas</legend><p>Leave unticked if no retained shed was observed.</p>{retainedAreas.map((area) => <label key={area}><input type="checkbox" checked={retained.includes(area)} onChange={() => setRetained((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area])} disabled={saving} /> {area}</label>)}</fieldset>
          <label htmlFor="shed-quality">Shed quality</label><select id="shed-quality" value={quality} onChange={(event) => setQuality(event.target.value as ShedQuality)} disabled={saving}>{qualities.map((item) => <option key={item}>{item}</option>)}</select>
          <label htmlFor="shed-assistance">Assistance</label><select id="shed-assistance" value={assistance} onChange={(event) => setAssistance(event.target.value as ShedAssistance)} disabled={saving}>{assistances.map((item) => <option key={item}>{item}</option>)}</select>
          <label htmlFor="shed-length">Shed length ({lengthUnit})</label><input id="shed-length" type="number" min="0" step="any" inputMode="decimal" value={shedLength} onChange={(event) => setShedLength(event.target.value)} disabled={saving} />
          <label htmlFor="shed-weight">Snake weight ({weightUnit})</label><input id="shed-weight" type="number" min="0" step="any" inputMode="decimal" value={snakeWeight} onChange={(event) => setSnakeWeight(event.target.value)} disabled={saving} />
        </>}
        <label htmlFor="shed-notes">Observations / notes</label><textarea id="shed-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything useful about this cycle..." disabled={saving} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="submit" disabled={saving}>{saving ? "💾 Saving..." : editingId ? "💾 Update Cycle" : stage === "Blue" ? "🔵 Start Cycle" : "💾 Record Stage"}</button>{editingId && <button type="button" onClick={clearForm} disabled={saving}>Cancel</button>}</div>
      </form></div>
      <div className="tracker-card"><h3>🧠 Shedding intelligence</h3>{completedCycles.length ? <><p><strong>Completed cycles:</strong> {completedCycles.length}</p>{averageInterval !== null && <p><strong>Typical cycle-to-cycle interval:</strong> {Math.round(averageInterval)} days</p>}<p><strong>Stage model:</strong> Blue → Clear → Full Shed is counted as one cycle.</p></> : <p>Once you complete more cycles, Tiny Titans will calculate this snake's own shedding pattern rather than relying on generic assumptions.</p>}{activeCycle && <p>🔵 Current cycle is active. Tiny Titans is waiting for the next stage instead of counting another shed.</p>}</div>
      <div className="tracker-card"><h3>📏 Measurements</h3><p><strong>Measured cycles:</strong> {measured.length}</p><p><strong>Average shed length:</strong> {averageLength ? formatLength(averageLength) : "No measurements yet"}</p></div>
      <div className="tracker-card"><h3>📋 Shed Cycle History</h3>{loadingSheds ? <p>Loading shed history...</p> : sheds.length === 0 ? <p>No shedding cycles recorded yet.</p> : sheds.map((record) => { const start = record.cycleStartedAt || record.date; const clear = record.clearPhaseAt; const complete = record.completedAt; const duration = daysBetween(start, complete); const current = record.currentStage ?? (record.shedCompleted ? "Complete" : record.eyesSkinCleared ? "Clear" : record.bluePhaseStarted ? "Blue" : "Complete"); return <article className="tracker-card" key={record.id}><h3>🐍 {selectedSnake?.name ?? "Snake"} · Cycle</h3><p><strong>{stageLabel(current)}</strong>{duration !== null ? ` · ${duration} day${duration === 1 ? "" : "s"}` : " · In progress"}</p><p>🔵 Blue: {start ? displayDate(start) : "Not recorded"} · ⚪ Clear: {clear ? displayDate(clear) : "Not recorded"} · 🟢 Full Shed: {complete ? displayDate(complete) : "Not recorded"}</p>{complete && <><p>Outcome: <strong>{record.status}</strong> · Quality: <strong>{record.quality}</strong></p>{record.retainedAreas?.length ? <p>Retained: {record.retainedAreas.join(", ")}</p> : null}{record.shedLength ? <p>Shed length: {formatLength(record.shedLength)}</p> : null}</>}<p>{record.notes || "No notes recorded."}</p><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="button" onClick={() => editCycle(record)} disabled={saving}>✏️ Edit Cycle</button>{current !== "Complete" && <button type="button" onClick={() => editCycle(record, current === "Blue" ? "Clear" : "Complete")} disabled={saving}>➡️ Update Stage</button>}<button type="button" onClick={() => void handleDelete(record)} disabled={saving}>🗑️ Delete Cycle</button></div></article>; })}</div>
    </>}
  </div>;
}
