import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useAuth,
} from "../context/useAuth";

import type {
  Snake,
} from "../types/Snake";

import type {
  Het,
} from "../types/genetics";

import type {
  WeightRecord,
} from "../types/Weight";

import type { MorphSubmissionInputV2 } from "../services/morphSubmissionServiceV2";

import SnakeForm from "../components/SnakeForm";

import SaveProgress, {
  type SaveStage,
} from "../components/SaveProgress";

import BackHomeButton from "../components/BackHomeButton";

import {
  getUserSnake,
  saveUserSnake,
} from "../services/snakeService";

import { submitMorphImageV2 } from "../services/morphSubmissionServiceV2";

import {
  migrateSnake,
} from "../utils/snakeMigration";

const emptyForm = {
  name: "",
  species: "Western Hognose",
  photo: "",
  sex: "Unknown" as Snake["sex"],
  morphs: [] as string[],
  customMorph: "",
  hets: [] as Het[],
  customHets: "",
  geneticsProfile: undefined as Snake["geneticsProfile"],
  startingWeight: null as number | null,
  startingWeightDate: "",
  weight: null as number | null,
  lastWeighedDate: "",
  weightHistory: [] as WeightRecord[],
  hatchDate: "",
  arrivalDate: "",
  notes: "",
};

function sortWeightHistory(history: WeightRecord[]): WeightRecord[] {
  return [...history].sort((a, b) => {
    const difference = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (difference === 0) return a.id.localeCompare(b.id);
    return difference;
  });
}

function buildWeightHistory(
  snakeId: string,
  existingHistory: WeightRecord[],
  startingWeight: number | null,
  startingWeightDate: string,
  currentWeight: number | null,
  lastWeighedDate: string
): WeightRecord[] {
  const records: WeightRecord[] = [...(existingHistory ?? [])];

  if (startingWeight !== null && Number.isFinite(startingWeight) && startingWeight > 0 && startingWeightDate) {
    const startingId = `starting-${snakeId}`;
    const startingRecord: WeightRecord = { id: startingId, snakeId, weight: startingWeight, date: startingWeightDate, unit: "g" };
    const existingIndex = records.findIndex((record) => record.id === startingId);
    if (existingIndex >= 0) records[existingIndex] = startingRecord;
    else records.push(startingRecord);
  }

  if (currentWeight !== null && Number.isFinite(currentWeight) && currentWeight > 0 && lastWeighedDate) {
    const currentId = `current-${snakeId}-${lastWeighedDate}`;
    const currentRecord: WeightRecord = { id: currentId, snakeId, weight: currentWeight, date: lastWeighedDate, unit: "g" };
    const existingIndex = records.findIndex((record) => record.id === currentId);
    if (existingIndex >= 0) records[existingIndex] = currentRecord;
    else records.push(currentRecord);
  }

  const uniqueRecords = new Map<string, WeightRecord>();
  for (const record of records) {
    const key = record.id || `${record.snakeId}-${record.date}-${record.weight}`;
    uniqueRecords.set(key, { ...record, snakeId, unit: record.unit || "g" });
  }

  return sortWeightHistory(Array.from(uniqueRecords.values()));
}

function getFirebaseErrorDetails(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const firebaseError = error as { code?: unknown; message?: unknown };
    const code = typeof firebaseError.code === "string" ? firebaseError.code : "unknown";
    const message = typeof firebaseError.message === "string" ? firebaseError.message : "Unknown Firebase error.";
    return { code, message };
  }
  if (error instanceof Error) return { code: "unknown", message: error.message };
  return { code: "unknown", message: String(error) };
}

function SnakeEdit() {
  const { id: parameterId } = useParams<{ id: string }>();
  const location = useLocation();
  const routeId = location.pathname.match(/^\/snakes\/([^/]+)(?:\/edit)?\/?$/)?.[1];
  const id = parameterId ?? routeId;
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const isNew = id === "new";

  const [form, setForm] = useState(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<SaveStage>("idle");
  const [saveError, setSaveError] = useState("");
  const saveLock = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSnake() {
      if (loading || profileLoading) return;
      if (!user) { console.error("Tiny Titans: no authenticated user"); if (!cancelled) setLoaded(true); return; }
      if (isNew) { if (!cancelled) { setForm({ ...emptyForm, morphs: [], hets: [], weightHistory: [] }); setLoaded(true); } return; }
      if (!id) {
        console.error("Tiny Titans: no snake ID supplied", { pathname: location.pathname, parameterId, resolvedId: id });
        if (!cancelled) { setSaveError("This edit page does not contain a valid snake ID. Please return to My Hoggies and open Edit Snake again."); setSaveStage("error"); setLoaded(true); }
        return;
      }

      try {
        const snake = await getUserSnake(user.uid, id);
        if (!snake) { if (!cancelled) { alert("This snake could not be found."); navigate("/snakes", { replace: true }); } return; }
        const migratedSnake = migrateSnake(snake);
        const weightHistory = sortWeightHistory(migratedSnake.weightHistory ?? []);
        if (cancelled) return;
        setForm({
          name: migratedSnake.name ?? "",
          species: migratedSnake.species ?? "Western Hognose",
          photo: migratedSnake.photo ?? "",
          sex: migratedSnake.sex ?? "Unknown",
          morphs: migratedSnake.morphs ?? [],
          customMorph: migratedSnake.customMorph ?? "",
          hets: migratedSnake.hets ?? [],
          customHets: migratedSnake.customHets ?? "",
          geneticsProfile: migratedSnake.geneticsProfile,
          startingWeight: migratedSnake.startingWeight ?? null,
          startingWeightDate: migratedSnake.startingWeightDate ?? "",
          weight: migratedSnake.weight ?? null,
          lastWeighedDate: migratedSnake.lastWeighedDate ?? "",
          weightHistory,
          hatchDate: migratedSnake.hatchDate ?? "",
          arrivalDate: migratedSnake.arrivalDate ?? "",
          notes: migratedSnake.notes ?? "",
        });
        setLoaded(true);
      } catch (error) {
        const details = getFirebaseErrorDetails(error);
        console.error("Tiny Titans: unable to load snake", { error, code: details.code, message: details.message, uid: user.uid, snakeId: id, pathname: location.pathname });
        if (!cancelled) { alert(`Unable to load this snake.\n\n${details.code}: ${details.message}`); setLoaded(true); }
      }
    }

    void loadSnake();
    return () => { cancelled = true; };
  }, [id, isNew, navigate, user, loading, profileLoading, location.pathname, parameterId]);

  function updateField(field: string, value: unknown) { setForm((previous) => ({ ...previous, [field]: value })); }

  async function saveSnake(morphLibrarySubmission?: MorphSubmissionInputV2) {
    if (saveLock.current) return;
    if (!user) { setSaveStage("error"); setSaveError("You must be logged in to save a snake."); return; }
    if (!form.name.trim()) { setSaveStage("error"); setSaveError("Please enter a name for your snake."); return; }

    saveLock.current = true;
    setSaving(true);
    setSaveError("");
    setSaveStage("preparing");

    try {
      if (morphLibrarySubmission) {
        setSaveStage("preparing");
        await submitMorphImageV2(morphLibrarySubmission);
      }

      if (isNew) {
        const weightHistory = buildWeightHistory("new", form.weightHistory, form.startingWeight, form.startingWeightDate, form.weight, form.lastWeighedDate);
        const newestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
        const newSnake = migrateSnake({
          ...form,
          weightHistory,
          weight: newestWeight?.weight ?? form.weight ?? null,
          lastWeighedDate: newestWeight?.date ?? form.lastWeighedDate ?? "",
          weightTracking: { enabled: true, frequency: "Monthly" },
        });
        delete (newSnake as Partial<Snake>).id;
        setSaveStage("saving-profile");
        const savedSnake = await saveUserSnake(user.uid, newSnake);
        if (!savedSnake?.id) throw new Error("Firebase saved the snake but did not return a valid snake ID.");
        setSaveStage("syncing");
        await new Promise((resolve) => setTimeout(resolve, 350));
        setSaveStage("complete");
        await new Promise((resolve) => setTimeout(resolve, 700));
        navigate(`/snakes/${savedSnake.id}`, { replace: true });
        return;
      }

      if (!id) throw new Error("Cannot update this snake because its ID is missing. Tiny Titans could not resolve an ID from the route.");
      const existingSnake = await getUserSnake(user.uid, id);
      if (!existingSnake) throw new Error(`Snake with ID ${id} could not be found.`);
      const combinedHistory = [...(existingSnake.weightHistory ?? []), ...(form.weightHistory ?? [])];
      const weightHistory = buildWeightHistory(id, combinedHistory, form.startingWeight, form.startingWeightDate, form.weight, form.lastWeighedDate);
      const newestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
      const updatedSnake = migrateSnake({
        ...existingSnake,
        ...form,
        id,
        geneticsProfile: form.geneticsProfile ?? existingSnake.geneticsProfile,
        weightHistory,
        weight: newestWeight?.weight ?? form.weight ?? existingSnake.weight ?? null,
        lastWeighedDate: newestWeight?.date ?? form.lastWeighedDate ?? existingSnake.lastWeighedDate ?? "",
        weightTracking: existingSnake.weightTracking,
      });
      setSaveStage("saving-profile");
      const savedSnake = await saveUserSnake(user.uid, updatedSnake);
      if (!savedSnake?.id) throw new Error("Firebase updated the snake but did not return a valid snake ID.");
      setSaveStage("syncing");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSaveStage("complete");
      await new Promise((resolve) => setTimeout(resolve, 700));
      navigate(`/snakes/${savedSnake.id}`, { replace: true });
    } catch (error) {
      const details = getFirebaseErrorDetails(error);
      setSaveError(details.code !== "unknown" ? `${details.code}: ${details.message}` : details.message);
      setSaveStage("error");
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  }

  if (!loaded) return <main className="page-container"><BackHomeButton /><p>Loading snake…</p></main>;

  return <main className="page-container"><BackHomeButton /><SnakeForm form={form} updateField={updateField} onSave={() => void saveSnake()} onMorphLibrarySubmit={(input) => saveSnake(input)} editing={!isNew} saving={saving} /><SaveProgress stage={saveStage} error={saveError} /></main>;
}

export default SnakeEdit;