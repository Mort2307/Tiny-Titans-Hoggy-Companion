import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { Snake } from "../types/Snake";
import type { Het } from "../types/genetics";
import type { WeightRecord } from "../types/Weight";
import type { MorphSubmissionInputV2 } from "../services/morphSubmissionServiceV2";
import type { SaveStage } from "../types/save";
import { getUserSnake, saveUserSnake } from "../services/snakeService";
import { submitMorphImageV2 } from "../services/morphSubmissionServiceV2";
import { migrateSnake } from "../utils/snakeMigration";
import { buildWeightHistory, sortWeightHistory } from "../lib/snakeWeightHistory";
import { getFirebaseErrorDetails } from "../utils/firebaseError";

export type SnakeEditFormState = {
  name: string; species: string; photo: string; sex: Snake["sex"]; morphs: string[]; customMorph: string; hets: Het[]; customHets: string;
  startingWeight: number | null; startingWeightDate: string; weight: number | null; lastWeighedDate: string; weightHistory: WeightRecord[];
  hatchDate: string; arrivalDate: string; notes: string;
};

const emptyForm: SnakeEditFormState = {
  name: "", species: "Western Hognose", photo: "", sex: "Unknown", morphs: [], customMorph: "", hets: [], customHets: "",
  startingWeight: null, startingWeightDate: "", weight: null, lastWeighedDate: "", weightHistory: [], hatchDate: "", arrivalDate: "", notes: "",
};

export function useSnakeEdit() {
  const { id: parameterId } = useParams<{ id: string }>();
  const location = useLocation();
  const routeId = location.pathname.match(/^\/snakes\/([^/]+)(?:\/edit)?\/?$/)?.[1];
  const id = parameterId ?? routeId;
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const isNew = id === "new";
  const [form, setForm] = useState<SnakeEditFormState>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<SaveStage>("idle");
  const [saveError, setSaveError] = useState("");
  const saveLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSnake() {
      if (loading || profileLoading) return;
      if (!user) {
        console.error("Tiny Titans: no authenticated user");
        if (!cancelled) setLoaded(true);
        return;
      }
      if (isNew) {
        if (!cancelled) { setForm({ ...emptyForm, morphs: [], hets: [], weightHistory: [] }); setLoaded(true); }
        return;
      }
      if (!id) {
        console.error("Tiny Titans: no snake ID supplied", { pathname: location.pathname, parameterId, resolvedId: id });
        if (!cancelled) {
          setSaveError("This edit page does not contain a valid snake ID. Please return to My Hoggies and open Edit Snake again.");
          setSaveStage("error"); setLoaded(true);
        }
        return;
      }
      try {
        const snake = await getUserSnake(user.uid, id);
        if (!snake) {
          console.error("Tiny Titans: snake not found", { uid: user.uid, snakeId: id });
          if (!cancelled) { alert("This snake could not be found."); navigate("/snakes", { replace: true }); }
          return;
        }
        const migratedSnake = migrateSnake(snake);
        const weightHistory = sortWeightHistory(migratedSnake.weightHistory ?? []);
        if (cancelled) return;
        setForm({
          name: migratedSnake.name ?? "", species: migratedSnake.species ?? "Western Hognose", photo: migratedSnake.photo ?? "",
          sex: migratedSnake.sex ?? "Unknown", morphs: migratedSnake.morphs ?? [], customMorph: migratedSnake.customMorph ?? "", hets: migratedSnake.hets ?? [],
          customHets: migratedSnake.customHets ?? "", startingWeight: migratedSnake.startingWeight ?? null, startingWeightDate: migratedSnake.startingWeightDate ?? "",
          weight: migratedSnake.weight ?? null, lastWeighedDate: migratedSnake.lastWeighedDate ?? "", weightHistory, hatchDate: migratedSnake.hatchDate ?? "",
          arrivalDate: migratedSnake.arrivalDate ?? "", notes: migratedSnake.notes ?? "",
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

  function updateField(field: string, value: unknown) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function saveSnake(morphLibrarySubmission?: MorphSubmissionInputV2) {
    if (saveLock.current) { console.log("Tiny Titans: save already locked"); return; }
    if (!user) { setSaveStage("error"); setSaveError("You must be logged in to save a snake."); return; }
    if (!form.name.trim()) { setSaveStage("error"); setSaveError("Please enter a name for your snake."); return; }
    saveLock.current = true; setSaving(true); setSaveError(""); setSaveStage("preparing");
    try {
      if (morphLibrarySubmission) { setSaveStage("preparing"); await submitMorphImageV2(morphLibrarySubmission); }
      if (isNew) {
        const weightHistory = buildWeightHistory("new", form.weightHistory, form.startingWeight, form.startingWeightDate, form.weight, form.lastWeighedDate);
        const newestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
        const newSnake = migrateSnake({ ...form, weightHistory, weight: newestWeight?.weight ?? form.weight ?? null, lastWeighedDate: newestWeight?.date ?? form.lastWeighedDate ?? "", weightTracking: { enabled: true, frequency: "Monthly" } });
        delete (newSnake as Partial<Snake>).id;
        setSaveStage("saving-profile");
        const savedSnake = await saveUserSnake(user.uid, newSnake);
        if (!savedSnake?.id) throw new Error("Firebase saved the snake but did not return a valid snake ID.");
        setSaveStage("syncing"); await new Promise((resolve) => setTimeout(resolve, 350)); setSaveStage("complete"); await new Promise((resolve) => setTimeout(resolve, 700));
        navigate(`/snakes/${savedSnake.id}`, { replace: true }); return;
      }
      if (!id) throw new Error("Cannot update this snake because its ID is missing. Tiny Titans could not resolve an ID from the route.");
      setSaveStage("preparing");
      const existingSnake = await getUserSnake(user.uid, id);
      if (!existingSnake) throw new Error(`Snake with ID ${id} could not be found.`);
      const combinedHistory = [...(existingSnake.weightHistory ?? []), ...(form.weightHistory ?? [])];
      const weightHistory = buildWeightHistory(id, combinedHistory, form.startingWeight, form.startingWeightDate, form.weight, form.lastWeighedDate);
      const newestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
      const updatedSnake = migrateSnake({ ...existingSnake, ...form, id, weightHistory, weight: newestWeight?.weight ?? form.weight ?? existingSnake.weight ?? null, lastWeighedDate: newestWeight?.date ?? form.lastWeighedDate ?? existingSnake.lastWeighedDate ?? "", weightTracking: existingSnake.weightTracking });
      setSaveStage("saving-profile");
      const savedSnake = await saveUserSnake(user.uid, updatedSnake);
      if (!savedSnake?.id) throw new Error("Firebase updated the snake but did not return a valid snake ID.");
      setSaveStage("syncing"); await new Promise((resolve) => setTimeout(resolve, 350)); setSaveStage("complete"); await new Promise((resolve) => setTimeout(resolve, 700));
      navigate(`/snakes/${savedSnake.id}`, { replace: true });
    } catch (error) {
      const details = getFirebaseErrorDetails(error);
      setSaveError(details.code !== "unknown" ? `${details.code}: ${details.message}` : details.message); setSaveStage("error");
    } finally { setSaving(false); saveLock.current = false; }
  }

  return { id, isNew, form, loaded, saving, saveStage, saveError, loading, profileLoading, navigate, updateField, saveSnake };
}