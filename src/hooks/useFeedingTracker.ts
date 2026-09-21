import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { FoodType, FeedingMethod, FeedingRecord, FeedingResponse } from "../types/Feeding";
import { getUserSnakes } from "../services/snakeService";
import { deleteSnakeFeeding, getSnakeFeedings, saveSnakeFeeding } from "../services/feedingService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import { generateId } from "../utils/generateId";
import { getSpeciesDiet, type SpeciesDiet } from "../data/feeding/speciesDiet";
import { categoryByFood } from "../data/feeding/feedingOptions";
import { latestFeedingAttempt, latestSuccessfulFeed } from "../utils/feedingSummary";
import { toDisplayWeight, today } from "../lib/feedingTracker";

export default function useFeedingTracker() {
  const { id: routeSnakeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, profileLoading } = useAuth();
  const { isImperial, weightUnit, formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [feedings, setFeedings] = useState<FeedingRecord[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [loadedFeedingsKey, setLoadedFeedingsKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedingRecord | null>(null);
  const [date, setDate] = useState(today());
  const [foodType, setFoodType] = useState<FoodType>("Pinkie Mouse");
  const [customFood, setCustomFood] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("");
  const [feedingMethod, setFeedingMethod] = useState<FeedingMethod>("Tongs");
  const [response, setResponse] = useState<FeedingResponse>("Accepted");
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

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);
  const diet = useMemo(() => getSpeciesDiet(selectedSnake), [selectedSnake]);
  const feedingFoodTypes = useMemo(() => {
    const recommended = diet.recommended.length ? diet.recommended : ["Other" as FoodType];
    const additional = diet.additional.filter((food) => !recommended.includes(food));
    return { recommended, additional };
  }, [diet]);
  const feedingsKey = user && selectedSnakeId ? `${user.uid}:${selectedSnakeId}` : null;
  const loadingFeedings = Boolean(feedingsKey && loadedFeedingsKey !== feedingsKey);

  useEffect(() => {
    if (!user || !selectedSnakeId) return;
    let cancelled = false;
    void getSnakeFeedings(user.uid, selectedSnakeId).then((records) => {
      if (cancelled) return;
      setFeedings(records);
      setLoadedFeedingsKey(feedingsKey);
      const recordId = searchParams.get("record");
      const record = recordId ? records.find((item) => item.id === recordId) : undefined;
      if (record) {
        queueMicrotask(() => {
          if (cancelled) return;
          setEditingId(record.id); setDate(record.date); setFoodType(record.foodType); setCustomFood(record.customFood ?? ""); setSize(record.size ?? "");
          setQuantity(String(record.quantity ?? 1)); setWeight(toDisplayWeight(record.weight, isImperial)); setFeedingMethod(record.feedingMethod ?? "Tongs");
          setResponse(record.response); setNotes(record.notes ?? "");
          setSuccess("📌 Opened from the Life Timeline. You are editing this exact feeding record.");
          requestAnimationFrame(() => document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth", block: "center" }));
          setSearchParams((current) => { current.delete("record"); return current; }, { replace: true });
        });
      }
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load feeding history.");
    });
    return () => { cancelled = true; };
  }, [user, selectedSnakeId, feedingsKey, searchParams, setSearchParams, isImperial]);

  const counts = useMemo(() => ({ Accepted: feedings.filter((f) => f.response === "Accepted").length, Refused: feedings.filter((f) => f.response === "Refused").length, Partial: feedings.filter((f) => f.response === "Partial").length, Regurgitated: feedings.filter((f) => f.response === "Regurgitated").length }), [feedings]);
  const acceptanceRate = feedings.length ? Math.round((counts.Accepted / feedings.length) * 100) : 0;
  const lastFeeding = latestFeedingAttempt(feedings);
  const lastSuccessfulFeeding = latestSuccessfulFeed(feedings);

  const resetForm = useCallback((nextDiet: SpeciesDiet = diet) => {
    const defaultFood = nextDiet.recommended[0] ?? "Other";
    setEditingId(null); setDate(today()); setFoodType(defaultFood); setCustomFood(""); setSize(""); setQuantity("1"); setWeight(""); setFeedingMethod("Tongs"); setResponse("Accepted"); setNotes("");
  }, [diet]);

  function selectSnake(nextSnakeId: string) {
    const nextSnake = snakes.find((snake) => snake.id === nextSnakeId);
    setSelectedSnakeId(nextSnakeId);
    resetForm(nextSnake ? getSpeciesDiet(nextSnake) : diet);
  }

  useEffect(() => {
    if (!user || !selectedSnakeId || loadingFeedings || searchParams.get("action") !== "log") return;
    queueMicrotask(() => {
      resetForm(diet);
      setSuccess("🧠 Tiny Titans opened the feeding log because this is the next supported keeper action.");
      requestAnimationFrame(() => document.getElementById("feeding-date")?.focus());
      requestAnimationFrame(() => document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      setSearchParams((current) => { current.delete("action"); return current; }, { replace: true });
    });
  }, [user, selectedSnakeId, loadingFeedings, searchParams, setSearchParams, diet, resetForm]);

  function editFeeding(feeding: FeedingRecord) {
    setEditingId(feeding.id); setDate(feeding.date); setFoodType(feeding.foodType); setCustomFood(feeding.customFood ?? ""); setSize(feeding.size ?? "");
    setQuantity(String(feeding.quantity ?? 1)); setWeight(toDisplayWeight(feeding.weight, isImperial)); setFeedingMethod(feeding.feedingMethod ?? "Tongs");
    setResponse(feeding.response); setNotes(feeding.notes ?? "");
    document.getElementById("feeding-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!user || !selectedSnakeId) { setError("Please select a snake and make sure you are logged in."); return; }
    if (foodType === "Other" && !customFood.trim()) { setError("Please enter the food type."); return; }
    const numericQuantity = quantity === "" ? 1 : Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || !Number.isInteger(numericQuantity)) { setError("Prey quantity must be a whole number of 1 or more."); return; }
    if (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) { setError(`Please enter a valid prey weight in ${weightUnit}.`); return; }
    setSaving(true);
    try {
      const preyWeightG = weight === "" ? undefined : isImperial ? Number(weight) * 28.349523125 : Number(weight);
      const record: FeedingRecord = { id: editingId ?? generateId(), snakeId: selectedSnakeId, date, foodType, ...(foodType === "Other" ? { customFood: customFood.trim() } : {}), ...(size ? { size } : {}), ...(numericQuantity !== 1 ? { quantity: numericQuantity } : {}), ...(preyWeightG !== undefined ? { weight: preyWeightG } : {}), preyCategory: categoryByFood[foodType], ...(feedingMethod ? { feedingMethod } : {}), response, ...(notes.trim() ? { notes: notes.trim() } : {}) };
      const saved = await saveSnakeFeeding(user.uid, record);
      setFeedings((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)));
      setLoadedFeedingsKey(feedingsKey);
      setSuccess(editingId ? "Feeding record updated successfully." : "Feeding recorded successfully.");
      resetForm();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save this feeding."); }
    finally { setSaving(false); }
  }

  async function handleDelete(feeding: FeedingRecord) {
    if (!user || saving) return;
    setDeleteTarget(null); setSaving(true); setError("");
    try {
      await deleteSnakeFeeding(user.uid, feeding.snakeId, feeding.id);
      setFeedings((current) => current.filter((item) => item.id !== feeding.id));
      setSuccess("Feeding record deleted.");
      if (editingId === feeding.id) resetForm();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete this feeding."); }
    finally { setSaving(false); }
  }

  return {
    routeSnakeId, user, loading, profileLoading, navigate, searchParams, setSearchParams, isImperial, weightUnit, formatWeight, snakes, selectedSnakeId, setSelectedSnakeId, feedings, loadingSnakes, loadingFeedings, saving, error, success, editingId, deleteTarget, setDeleteTarget,
    date, setDate, foodType, setFoodType, customFood, setCustomFood, size, setSize, quantity, setQuantity, weight, setWeight, feedingMethod, setFeedingMethod, response, setResponse, notes, setNotes, diet, feedingFoodTypes, counts, acceptanceRate, lastFeeding, lastSuccessfulFeeding, resetForm, selectSnake, editFeeding, handleSubmit, handleDelete
  };
}