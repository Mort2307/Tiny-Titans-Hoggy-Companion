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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === snakeId), [snakes, snakeId]);
  const intelligence = useMemo(() => selectedSnake ? analyseShedding(selectedSnake, records) : null, [selectedSnake, records]);

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    void getUserSnakes(user.uid).then((loaded) => setSnakes(loaded)).catch(() => setError("Unable to load snakes."));
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!snakeId) return;
    void getSnakeSheds(snakeId).then(setRecords).catch(() => setError("Unable to load shed records."));
  }, [snakeId]);

  const resetForm = () => {
    setEditingId(null);
    setStage("Blue");
    setDate(new Date().toLocaleDateString("en-GB"));
    setQuality("Unknown");
    setStatus("Complete");
    setRetained([]);
    setAssistance("None");
    setNotes("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !snakeId) return;
    const shedDate = parseDate(date);
    if (!shedDate) { setError("Enter a valid date (DD/MM/YYYY)."); return; }
    setSaving(true);
    setError(null);
    try {
      const record: ShedRecord = { id: editingId ?? generateId(), snakeId, date: shedDate, stage, quality, status, retainedAreas: retained, assistance, notes };
      await saveSnakeShed(user.uid, record);
      setRecords(await getSnakeSheds(snakeId));
      resetForm();
    } catch {
      setError("Unable to save shed record.");
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record: ShedRecord) => {
    setEditingId(record.id);
    setStage(record.stage);
    setDate(displayDate(record.date));
    setQuality(record.quality);
    setStatus(record.status);
    setRetained(retainedFrom(record));
    setAssistance(record.assistance ?? "None");
    setNotes(record.notes ?? "");
  };

  const removeRecord = async (recordId: string) => {
    if (!user || !snakeId) return;
    await deleteSnakeShed(user.uid, snakeId, recordId);
    setRecords(await getSnakeSheds(snakeId));
    if (editingId === recordId) resetForm();
  };

  return null;
}
