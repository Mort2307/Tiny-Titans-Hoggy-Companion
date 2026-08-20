import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { RetainedShedArea, ShedAssistance, ShedQuality, ShedRecord, ShedStage, ShedStatus } from "../types/Shed";
import { getSnakeSheds, deleteSnakeShed, saveSnakeShed } from "../services/shedService";
import { analyseShedding } from "../services/shedIntelligenceService";
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
const today = () => new Date().toISOString().slice(0, 10);
const displayDate = (iso?: string) => iso ? new Intl.DateTimeFormat("en-GB").format(new Date(`${iso}T00:00:00Z`)) : "Not recorded";
const parseDate = (value: string) => { const parts = value.trim().replace(/[.-]/g, "/").split("/"); if (parts.length !== 3) return null; const [d, m, rawY] = parts.map(Number); const y = rawY < 100 ? rawY + 2000 : rawY; const date = new Date(Date.UTC(y, m - 1, d)); return Number.isFinite(date.getTime()) && date.getUTCDate() === d && date.getUTCMonth() === m - 1 ? `${y.toString().padStart(4,"0")}-${m.toString().padStart(2,"0")}-${d.toString().padStart(2,"0")}` : null; };
const stageTitle = (stage: ShedStage) => stage === "Blue" ? "🔵 Blue phase" : stage === "Clear" ? "⚪ Clear phase" : "🟢 Full shed";
const retainedFrom = (r: ShedRecord): RetainedShedArea[] => r.retainedAreas?.length ? r.retainedAreas : [...new Set([...(r.retainedEyeCaps ? ["Eye Cap" as const] : []), ...(r.retainedTailTip ? ["Tail Tip" as const] : []), ...(r.retainedShedArea && r.retainedShedArea !== "None" && r.retainedShedArea !== "Multiple Areas" ? [r.retainedShedArea] : [])])];

export default function ShedTrackerIntelligent() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, lengthUnit, weightUnit } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [snakeId, setSnakeId] = useState(routeSnakeId ?? "");
  const [records, setRecords] = useState<ShedRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stage, setStage] = useState<ShedStage>("Blue");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [quality, setQuality] = useState<ShedQuality>("Unknown");
  const [status, setStatus] = useState<ShedStatus>("Complete");
  const [retained, setRetained] = useState<RetainedShedArea[]>([]);
  const [assistance, setAssistance] = useState<ShedAssistance>("None");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (loading || profileLoading || !user) return; void getUserSnakes(user.uid).then((items) => { const valid = items.filter((s) => Boolean(s.id)); setSnakes(valid); if (!snakeId) setSnakeId(routeSnakeId && valid.some((s) => s.id === routeSnakeId) ? routeSnakeId : valid[0]?.id ?? ""); }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load snakes.")); }, [loading, profileLoading, routeSnakeId, snakeId, user]);
  useEffect(() => { if (!user || !snakeId) return; void getSnakeSheds(user.uid, snakeId).then(setRecords).catch((e) => setError(e instanceof Error ? e.message : "Unable to load shedding history.")); }, [snakeId, user]);

  const selectedSnake = snakes.find((s) => s.id === snakeId);
  const intelligence = useMemo(() => analyseShedding(records), [records]);
  const active = useMemo(() => records.find((r) => r.currentStage !== "Complete" && !r.completedAt) ?? null, [records]);
  const completed = useMemo(() => records.filter((r) => r.completedAt || r.currentStage === "Complete"), [records]);

  const reset = () => { setEditingId(null); setStage("Blue"); setDate(new Date().toLocaleDateString("en-GB")); setQuality("Unknown"); setStatus("Complete"); setRetained([]); setAssistance("None"); setLength(""); setWeight(""); setNotes(""); };
  const edit = (record: ShedRecord, nextStage = record.currentStage ?? "Complete") => { const d = nextStage === "Blue" ? record.cycleStartedAt || record.date : nextStage === "Clear" ? record.clearPhaseAt || record.date : record.completedAt || record.date; setEditingId(record.id); setStage(nextStage); setDate(displayDate(d)); setQuality(record.quality ?? "Unknown"); setStatus(record.status ?? "Complete"); setRetained(retainedFrom(record)); setAssistance(record.assistance ?? "None"); setLength(record.shedLength == null ? "" : String(isImperial ? record.shedLength / 2.54 : record.shedLength)); setWeight(record.snakeWeight == null ? "" : String(isImperial ? record.snakeWeight / 28.349523125 : record.snakeWeight)); setNotes(record.notes ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); if (!user || !snakeId) return setError("Select a snake before recording a shed.");
    const iso = parseDate(date); if (!iso) return setError("Use DD/MM/YYYY for the shedding date."); if (iso > today()) return setError("A shedding stage cannot be recorded in the future.");
    if (length !== "" && (!Number.isFinite(Number(length)) || Number(length) < 0)) return setError(`Enter a valid shed length in ${lengthUnit}.`);
    if (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) return setError(`Enter a valid snake weight in ${weightUnit}.`);
    setBusy(true);
    try {
      const old = editingId ? records.find((r) => r.id === editingId) : undefined;
      const base = old ?? { id: generateId(), snakeId, date: iso, retainedShedArea: "None" as const, retainedAreas: [], retainedEyeCaps: false, retainedTailTip: false, status: "Complete" as const, quality: "Unknown" as const, assistance: "None" as const, notes: "" };
      const start = stage === "Blue" ? iso : base.cycleStartedAt || base.date;
      const clear = stage === "Clear" ? iso : base.clearPhaseAt;
      const complete = stage === "Complete" ? iso : base.completedAt;
      const duration = start && complete ? Math.max(0, Math.round((Date.parse(`${complete}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000)) : undefined;
      const record: ShedRecord = { ...base, id: base.id, snakeId, date: complete || start || iso, cycleStartedAt: start, ...(clear ? { clearPhaseAt: clear } : {}), ...(complete ? { completedAt: complete } : {}), currentStage: stage, cycleDurationDays: duration, bluePhaseStarted: Boolean(start), eyesSkinCleared: Boolean(clear), shedCompleted: Boolean(complete), retainedShedArea: retained.length === 0 ? "None" : retained.length === 1 ? retained[0] : "Multiple Areas", retainedAreas: retained, retainedEyeCaps: retained.includes("Eye Cap"), retainedTailTip: retained.includes("Tail Tip"), status: stage === "Complete" ? status : "Complete", quality, assistance, ...(length !== "" ? { shedLength: isImperial ? Number(length) * 2.54 : Number(length) } : {}), ...(weight !== "" ? { snakeWeight: isImperial ? Number(weight) * 28.349523125 : Number(weight) } : {}), notes: notes.trim() };
      const saved = await saveSnakeShed(user.uid, record); setRecords((current) => [saved, ...current.filter((r) => r.id !== saved.id)]); setMessage(stage === "Complete" ? "🟢 Full shed recorded. The complete lifecycle remains one event." : `${stageTitle(stage)} saved. The same shedding cycle is preserved.`); reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save shedding cycle."); } finally { setBusy(false); }
  }
  async function remove(record: ShedRecord) { if (!user || !window.confirm(`Delete this entire shedding cycle for ${selectedSnake?.name ?? "this snake"}?`)) return; setBusy(true); try { await deleteSnakeShed(user.uid, record.snakeId, record.id); setRecords((r) => r.filter((x) => x.id !== record.id)); setMessage("Shedding cycle deleted."); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete shedding cycle."); } finally { setBusy(false); } }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h1>🐍 Shed Intelligence</h1><div className="tracker-card">Loading Tiny Titans…</div></div>;
  if (!user) return null;
  return <div className="page-container">
    <BackHomeButton />
    <h1>🐍 Shed Intelligence</h1>
    <p>One physical shed cycle, interpreted from this snake's own history. Blue → Clear → Full Shed is one event.</p>
    {error && <div className="tracker-card" role="alert">⚠️ {error}</div>}
    {message && <div className="tracker-card" role="status">✅ {message}</div>}
    {snakes.length === 0 ? <div className="tracker-card"><h2>No snakes yet</h2><p>Add a snake before recording shedding.</p><button onClick={() => navigate("/snakes")}>➕ Add Snake</button></div> : <>
      <div className="tracker-card"><label htmlFor="shed-snake"><strong>Snake</strong></label><select id="shed-snake" value={snakeId} onChange={(e) => { setSnakeId(e.target.value); reset(); }} disabled={busy}>{snakes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{selectedSnake && <p>🧬 {selectedSnake.morphs?.join(", ") || "Morph not recorded"}</p>}</div>
      <div className="tracker-card"><h2>🧠 Tiny Titans interpretation</h2><p><strong>{intelligence.headline}</strong></p><p>{intelligence.summary}</p><div><strong>Record completeness:</strong> {intelligence.completeness}%</div><ul>{intelligence.insights.map((i) => <li key={i}>{i}</li>)}</ul><div><strong>History:</strong> {completed.length} completed · {intelligence.averageIntervalDays ?? "—"} day average interval · {intelligence.averageDurationDays ?? "—"} day average cycle duration · {intelligence.retainedAreaFrequency}% with retained areas · {intelligence.problematicCycleCount} problematic</div></div>
      {active && <div className="tracker-card"><h2>🔄 Active cycle</h2><p><strong>{stageTitle(active.currentStage ?? "Blue")}</strong> started {displayDate(active.cycleStartedAt || active.date)}.</p><p>Do not create a second shed. Continue this same record.</p><button type="button" onClick={() => edit(active, active.currentStage === "Blue" ? "Clear" : "Complete")} disabled={busy}>{active.currentStage === "Blue" ? "Continue to Clear" : "Record Full Shed"}</button></div>}
      <form className="tracker-card" onSubmit={save}><h2>{editingId ? "✏️ Update shedding cycle" : "➕ Record shedding"}</h2><label>Stage<select value={stage} onChange={(e) => setStage(e.target.value as ShedStage)} disabled={busy}>{stages.map((s) => <option key={s} value={s}>{stageTitle(s)}</option>)}</select></label><label>Stage date<input value={date} onChange={(e) => setDate(e.target.value)} placeholder="DD/MM/YYYY" disabled={busy} /></label><label>Outcome quality<select value={quality} onChange={(e) => setQuality(e.target.value as ShedQuality)}>{qualities.map((q) => <option key={q}>{q}</option>)}</select></label>{stage === "Complete" && <label>Outcome status<select value={status} onChange={(e) => setStatus(e.target.value as ShedStatus)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>}<fieldset><legend>Retained shed areas</legend>{retainedAreas.map((area) => <label key={area}><input type="checkbox" checked={retained.includes(area)} onChange={() => setRetained((current) => current.includes(area) ? current.filter((x) => x !== area) : [...current, area])} /> {area}</label>)}</fieldset><label>Assistance<select value={assistance} onChange={(e) => setAssistance(e.target.value as ShedAssistance)}>{assistances.map((a) => <option key={a}>{a}</option>)}</select></label><label>Shed length ({lengthUnit})<input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} /></label><label>Snake weight ({weightUnit})<input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label><label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you observe?" /></label><button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : stage === "Complete" ? "Record full shed" : `Record ${stage} phase`}</button>{editingId && <button type="button" onClick={reset} disabled={busy}>Cancel edit</button>}</form>
      <div className="tracker-card"><h2>📚 Shed history</h2>{records.length === 0 ? <p>No shedding cycles recorded yet.</p> : records.map((record) => <article key={record.id} style={{ marginBottom: "1rem" }}><strong>{stageTitle(record.currentStage ?? "Complete")}</strong><p>{displayDate(record.completedAt || record.cycleStartedAt || record.date)} · {record.status} · {record.quality}</p><p>{record.retainedAreas?.length ? `Retained: ${record.retainedAreas.join(", ")}` : "No retained areas recorded"}{record.cycleDurationDays != null ? ` · ${record.cycleDurationDays} day cycle` : ""}</p><button type="button" onClick={() => edit(record)} disabled={busy}>Edit</button> <button type="button" onClick={() => void remove(record)} disabled={busy}>Delete</button></article>)}</div>
    </>}
  </div>;
}
