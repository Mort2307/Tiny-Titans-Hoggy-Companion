import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { migrateSnake } from "../utils/snakeMigration";
import { getWeightReminder } from "../utils/weightReminder";
import { getUserSnake, saveUserSnake } from "../services/snakeService";
import {
  deleteSnakeWeight,
  getSnakeWeights,
  migrateEmbeddedWeights,
  saveSnakeWeight,
} from "../services/weightService";
import {
  daysSinceDate,
  makeWeightRecordId,
  parseWeightDate,
  sortWeightHistory,
} from "../lib/weightRecords";

export function useWeightRecords() {
  const { id: snakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, formatWeight, weightUnit } = useUnits();

  const [snake, setSnake] = useState<Snake | null>(null);
  const [history, setHistory] = useState<WeightRecord[]>([]);
  const [loadedRecordKey, setLoadedRecordKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [typedDate, setTypedDate] = useState(today);
  const [dateError, setDateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveState, setSaveState] = useState<"success" | "error" | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WeightRecord | null>(null);

  const recordKey = user && snakeId ? `${user.uid}:${snakeId}` : null;
  const loadingSnake = Boolean(recordKey && loadedRecordKey !== recordKey);

  useEffect(() => {
    if (loading || profileLoading || !user || !snakeId) return;
    let cancelled = false;

    void getUserSnake(user.uid, snakeId)
      .then(async (loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setError("This snake could not be found.");
          return;
        }

        const migrated = migrateSnake(loaded);
        const canonical = await migrateEmbeddedWeights(
          user.uid,
          snakeId,
          migrated.weightHistory ?? [],
        );
        if (cancelled) return;

        const refreshed = await getUserSnake(user.uid, snakeId);
        if (cancelled) return;

        setSnake(migrateSnake(refreshed ?? migrated));
        setHistory(sortWeightHistory(canonical));
        setError(null);
      })
      .catch((reason) => {
        if (!cancelled) {
          console.error("Tiny Titans: unable to load weight records", reason);
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load this snake. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedRecordKey(recordKey);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, profileLoading, recordKey, snakeId, user]);

  useEffect(() => {
    const recordId = searchParams.get("record");
    const action = searchParams.get("action");

    if (recordId && history.length > 0) {
      const record = history.find((item) => item.id === recordId);
      if (record) {
        queueMicrotask(() => {
          setEditingId(record.id);
          setWeightInput(
            isImperial
              ? String((record.weight / 28.349523125).toFixed(2))
              : String(record.weight),
          );
          setTypedDate(record.date);
          setDateError("");
          setSaveMessage("Opened from the Life Timeline. You are editing this exact weight record.");
          setSaveState("");
          requestAnimationFrame(() =>
            document
              .getElementById("weight-record")
              ?.scrollIntoView({ behavior: "smooth", block: "center" }),
          );
          setSearchParams((current) => {
            current.delete("record");
            return current;
          }, { replace: true });
        });
      }
      return;
    }

    if (action === "log" && snake) {
      queueMicrotask(() => {
        setEditingId(null);
        setSaveMessage("Tiny Titans opened the weight log because this is the next supported keeper action.");
        setSaveState("");
        requestAnimationFrame(() =>
          document.getElementById("weight-record")?.focus(),
        );
        setSearchParams((current) => {
          current.delete("action");
          return current;
        }, { replace: true });
      });
    }
  }, [history, isImperial, searchParams, setSearchParams, snake]);

  const firstWeight = snake?.startingWeight ?? history[0]?.weight ?? 0;
  const currentWeight =
    history[history.length - 1]?.weight ?? snake?.weight ?? 0;
  const totalGain = currentWeight - firstWeight;
  const percentageGain =
    firstWeight > 0 ? Math.round((totalGain / firstWeight) * 100) : 0;
  const reminder = snake ? getWeightReminder(snake) : null;
  const daysSinceWeigh = daysSinceDate(today, snake?.lastWeighedDate);

  const chartHistory = useMemo(() => {
    if (!snake) return [];
    const records: WeightRecord[] = [];

    if (snake.startingWeight != null && snake.startingWeight > 0) {
      records.push({
        id: `starting-${snake.id}`,
        snakeId: snake.id,
        weight: snake.startingWeight,
        date:
          snake.startingWeightDate ||
          snake.hatchDate ||
          snake.arrivalDate ||
          today,
        unit: "g",
      });
    }

    records.push(...history);
    return sortWeightHistory(records);
  }, [history, snake, today]);

  async function saveWeight() {
    if (!snake || !user) return;
    setSaveMessage("");
    setSaveState("");

    const entered = Number(weightInput);
    if (!Number.isFinite(entered) || entered <= 0) {
      setSaveMessage(`Please enter a valid weight in ${weightUnit}.`);
      setSaveState("error");
      return;
    }

    const finalDate = parseWeightDate(typedDate);
    if (!finalDate) {
      setDateError("Please choose a valid weighing date.");
      setSaveState("error");
      return;
    }

    const grams = isImperial ? entered * 28.349523125 : entered;
    const duplicate = history.find(
      (record) => record.date === finalDate && record.id !== editingId,
    );

    if (duplicate) {
      setSaveMessage(
        "A weight record already exists for this date. Edit that record instead of creating a duplicate.",
      );
      setSaveState("error");
      return;
    }

    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      const record: WeightRecord = {
        id: editingId ?? makeWeightRecordId(),
        snakeId: snake.id,
        weight: grams,
        date: finalDate,
        unit: "g",
      };

      await saveSnakeWeight(user.uid, record);
      const canonical = sortWeightHistory(
        await getSnakeWeights(user.uid, snake.id),
      );
      const newest = canonical[canonical.length - 1];
      const updatedSnake = migrateSnake({
        ...snake,
        weight: newest?.weight ?? snake.weight,
        lastWeighedDate: newest?.date ?? snake.lastWeighedDate,
        weightHistory: canonical,
      });

      await saveUserSnake(user.uid, updatedSnake);
      const refreshed = await getUserSnake(user.uid, snake.id);

      setSnake(migrateSnake(refreshed ?? updatedSnake));
      setHistory(canonical);
      setLoadedRecordKey(recordKey);
      setWeightInput("");
      setTypedDate(today);
      setDateError("");
      setEditingId(null);
      setSaveMessage(wasEditing ? "Weight record updated and confirmed in Firebase." : "Weight saved and confirmed in Firebase.");
      setSaveState("success");
    } catch (reason) {
      console.error("Tiny Titans: unable to save weight record", reason);
      setSaveMessage(
        `Unable to save this weight record. ${reason instanceof Error ? reason.message : "Unknown error"}`,
      );
      setSaveState("error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(record: WeightRecord) {
    setEditingId(record.id);
    setWeightInput(
      isImperial
        ? String((record.weight / 28.349523125).toFixed(2))
        : String(record.weight),
    );
    setTypedDate(record.date);
    setDateError("");
    setSaveMessage("");
    setSaveState("");
    document.getElementById("weight-log")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function removeWeight(record: WeightRecord) {
    if (!user || !snake) return;
    setDeleteTarget(null);
    setDeletingId(record.id);
    setSaveMessage("");
    setSaveState("");

    try {
      await deleteSnakeWeight(user.uid, snake.id, record.id);
      const canonical = sortWeightHistory(
        await getSnakeWeights(user.uid, snake.id),
      );
      const newest = canonical[canonical.length - 1];
      const updatedSnake = migrateSnake({
        ...snake,
        weight: newest?.weight ?? snake.startingWeight,
        lastWeighedDate: newest?.date ?? undefined,
        weightHistory: canonical,
      });

      await saveUserSnake(user.uid, updatedSnake);
      const refreshed = await getUserSnake(user.uid, snake.id);

      setSnake(migrateSnake(refreshed ?? updatedSnake));
      setHistory(canonical);
      setLoadedRecordKey(recordKey);

      if (editingId === record.id) {
        setEditingId(null);
        setWeightInput("");
        setTypedDate(today);
      }

      setSaveMessage("Weight record deleted and Firebase synchronised.");
      setSaveState("success");
    } catch (reason) {
      setSaveMessage(
        `Unable to delete this weight record. ${reason instanceof Error ? reason.message : "Unknown error"}`,
      );
      setSaveState("error");
    } finally {
      setDeletingId(null);
    }
  }

  return {
    navigate,user,loading,profileLoading,snake,history,weightInput,setWeightInput,today,typedDate,setTypedDate,dateError,setDateError,
    saving,saveMessage,setSaveMessage,saveState,editingId,setEditingId,deletingId,deleteTarget,setDeleteTarget,isImperial,formatWeight,weightUnit,reminder,
    currentWeight,totalGain,percentageGain,daysSinceWeigh,chartHistory,firstWeight,saveWeight,startEdit,removeWeight,loadingSnake,
  };
}
