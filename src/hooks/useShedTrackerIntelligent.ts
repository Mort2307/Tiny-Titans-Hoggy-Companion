import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import type { Snake } from "../types/Snake";
import type { RetainedShedArea, ShedAssistance, ShedQuality, ShedRecord, ShedStage, ShedStatus } from "../types/Shed";
import { getSnakeSheds, deleteSnakeShed, saveSnakeShed } from "../services/shedService";
import { analyseShedding } from "../services/shedIntelligenceService";
import { getUserSnakes } from "../services/snakeService";
import { generateId } from "../utils/generateId";
import {
  RETAINED_SHED_AREAS,
  SHED_ASSISTANCES,
  SHED_QUALITIES,
  SHED_STAGES,
  SHED_STATUSES,
  displayShedDate,
  parseShedDate,
  retainedAreasFromRecord,
  shedStageTitle,
  todayDateKey,
} from "../lib/shedTrackerIntelligent";

export function useShedTrackerIntelligent() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const reset = useCallback(() => {
    setEditingId(null);
    setStage("Blue");
    setDate(new Date().toLocaleDateString("en-GB"));
    setQuality("Unknown");
    setStatus("Complete");
    setRetained([]);
    setAssistance("None");
    setLength("");
    setWeight("");
    setNotes("");
  }, []);

  const loadSnakes = useCallback(async () => {
    if (!user) return;
    try {
      const items = await getUserSnakes(user.uid);
      const valid = items.filter((snake) => Boolean(snake.id));
      setSnakes(valid);
      setSnakeId((current) =>
        routeSnakeId && valid.some((snake) => snake.id === routeSnakeId)
          ? routeSnakeId
          : valid.some((snake) => snake.id === current)
            ? current
            : valid[0]?.id ?? "",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load snakes.");
    }
  }, [routeSnakeId, user]);

  const loadRecords = useCallback(async () => {
    if (!user || !snakeId) return;
    try {
      setRecords(await getSnakeSheds(user.uid, snakeId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load shedding history.");
    }
  }, [snakeId, user]);

  useEffect(() => {
    if (!loading && !profileLoading && user) void loadSnakes();
  }, [loadSnakes, loading, profileLoading, user]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const selectedSnake = snakes.find((snake) => snake.id === snakeId);
  const intelligence = useMemo(() => analyseShedding(records), [records]);
  const active = useMemo(
    () => records.find((record) => record.currentStage !== "Complete" && !record.completedAt) ?? null,
    [records],
  );
  const completed = useMemo(
    () => records.filter((record) => record.completedAt || record.currentStage === "Complete"),
    [records],
  );

  useEffect(() => {
    if (!user || !snakeId || searchParams.get("action") !== "log") return;
    queueMicrotask(() => {
      setEditingId(null);
      reset();
      setMessage("Tiny Titans opened the shedding log because this is the next supported keeper action.");
      requestAnimationFrame(() =>
        document.getElementById("shed-log")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      requestAnimationFrame(() => document.getElementById("shed-stage-date")?.focus());
      setSearchParams((current) => {
        current.delete("action");
        return current;
      }, { replace: true });
    });
  }, [reset, searchParams, setSearchParams, snakeId, user]);

  const edit = useCallback((record: ShedRecord, nextStage = record.currentStage ?? "Complete") => {
    const stageDate =
      nextStage === "Blue"
        ? record.cycleStartedAt || record.date
        : nextStage === "Clear"
          ? record.clearPhaseAt || record.date
          : record.completedAt || record.date;
    setEditingId(record.id);
    setStage(nextStage);
    setDate(displayShedDate(stageDate));
    setQuality(record.quality ?? "Unknown");
    setStatus(record.status ?? "Complete");
    setRetained(retainedAreasFromRecord(record));
    setAssistance(record.assistance ?? "None");
    setLength(record.shedLength == null ? "" : String(isImperial ? record.shedLength / 2.54 : record.shedLength));
    setWeight(record.snakeWeight == null ? "" : String(isImperial ? record.snakeWeight / 28.349523125 : record.snakeWeight));
    setNotes(record.notes ?? "");
    document.getElementById("shed-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isImperial]);

  const save = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user || !snakeId) return setError("Select a snake before recording a shed.");
    const iso = parseShedDate(date);
    if (!iso) return setError("Use DD/MM/YYYY for the shedding date.");
    if (iso > todayDateKey()) return setError("A shedding stage cannot be recorded in the future.");
    if (length !== "" && (!Number.isFinite(Number(length)) || Number(length) < 0)) {
      return setError(`Enter a valid shed length in ${lengthUnit}.`);
    }
    if (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) {
      return setError(`Enter a valid snake weight in ${weightUnit}.`);
    }

    setBusy(true);
    try {
      const old = editingId ? records.find((record) => record.id === editingId) : undefined;
      const base: ShedRecord = old ?? {
        id: generateId(),
        snakeId,
        date: iso,
        retainedShedArea: "None",
        retainedAreas: [],
        retainedEyeCaps: false,
        retainedTailTip: false,
        status: "Complete",
        quality: "Unknown",
        assistance: "None",
        notes: "",
      };
      const start = stage === "Blue" ? iso : base.cycleStartedAt || base.date;
      const clear = stage === "Clear" ? iso : base.clearPhaseAt;
      const complete = stage === "Complete" ? iso : base.completedAt;
      const duration =
        start && complete
          ? Math.max(
              0,
              Math.round(
                (Date.parse(`${complete}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000,
              ),
            )
          : undefined;

      const record: ShedRecord = {
        ...base,
        id: base.id,
        snakeId,
        date: complete || start || iso,
        cycleStartedAt: start,
        ...(clear ? { clearPhaseAt: clear } : {}),
        ...(complete ? { completedAt: complete } : {}),
        currentStage: stage,
        cycleDurationDays: duration,
        bluePhaseStarted: Boolean(start),
        eyesSkinCleared: Boolean(clear),
        shedCompleted: Boolean(complete),
        retainedShedArea:
          retained.length === 0 ? "None" : retained.length === 1 ? retained[0] : "Multiple Areas",
        retainedAreas: retained,
        retainedEyeCaps: retained.includes("Eye Cap"),
        retainedTailTip: retained.includes("Tail Tip"),
        status: stage === "Complete" ? status : "Complete",
        quality,
        assistance,
        ...(length !== "" ? { shedLength: isImperial ? Number(length) * 2.54 : Number(length) } : {}),
        ...(weight !== "" ? { snakeWeight: isImperial ? Number(weight) * 28.349523125 : Number(weight) } : {}),
        notes: notes.trim(),
      };

      const saved = await saveSnakeShed(user.uid, record);
      setRecords((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMessage(
        stage === "Complete"
          ? "Full shed recorded. The complete lifecycle remains one event."
          : `${shedStageTitle(stage)} saved. The same shedding cycle is preserved.`,
      );
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save shedding cycle.");
    } finally {
      setBusy(false);
    }
  }, [
    assistance,date,editingId,isImperial,length,lengthUnit,notes,quality,records,reset,retained,snakeId,stage,status,user,weight,weightUnit
  ]);

  const remove = useCallback(async (record: ShedRecord) => {
    if (!user || !window.confirm(`Delete this entire shedding cycle for ${selectedSnake?.name ?? "this snake"}?`)) return;
    setBusy(true);
    try {
      await deleteSnakeShed(user.uid, record.snakeId, record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setMessage("Shedding cycle deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete shedding cycle.");
    } finally {
      setBusy(false);
    }
  }, [selectedSnake?.name, user]);

  return {
    navigate, user, loading, profileLoading, snakes, snakeId, setSnakeId, records, editingId, stage, setStage, date, setDate,
    quality, setQuality, status, setStatus, retained, setRetained, assistance, setAssistance, length, setLength, weight, setWeight,
    notes, setNotes, busy, message, error, intelligence, active, completed, selectedSnake, reset, edit, save, remove, lengthUnit, weightUnit, lengthUnit, weightUnit,
    stages: SHED_STAGES, qualities: SHED_QUALITIES, statuses: SHED_STATUSES, retainedAreas: RETAINED_SHED_AREAS, assistances: SHED_ASSISTANCES,
  };
}
