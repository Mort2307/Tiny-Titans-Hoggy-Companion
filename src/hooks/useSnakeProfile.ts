import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { useAuth } from "../context/useAuth";
import { getUserSnake, deleteUserSnake } from "../services/snakeService";
import { getSnakeIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { getCommunityBenchmarkDataset, getAgeBand, type CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { buildIntelligenceSummary, type IntelligenceSummary } from "../services/intelligenceSummaryService";
import { migrateSnake } from "../utils/snakeMigration";
import { getWeightReminder } from "../utils/weightReminder";
import { ageLabel, timeWithKeeperLabel } from "../lib/dateCalculations";

export function useSnakeProfile() {
  const { id } = useParams<{ id:string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snake,setSnake] = useState<Snake|null>(null);
  const [loadingSnake,setLoadingSnake] = useState(true);
  const [intelligence,setIntelligence] = useState<SnakeIntelligence|null>(null);
  const [intelligenceLoading,setIntelligenceLoading] = useState(false);
  const [intelligenceAccess,setIntelligenceAccess] = useState<boolean|null>(null);
  const [benchmark,setBenchmark] = useState<CommunityBenchmarkDataset|null>(null);
  const [benchmarkLoading,setBenchmarkLoading] = useState(false);
  const [benchmarkError,setBenchmarkError] = useState("");
  const [deleting,setDeleting] = useState(false);
  const [confirmDelete,setConfirmDelete] = useState(false);
  const [error,setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (loading || profileLoading) return;
      if (!user) { setError("You must be logged in to view this snake."); setLoadingSnake(false); return; }
      if (!id) { setError("No snake ID was supplied."); setLoadingSnake(false); return; }
      try {
        const loaded = await getUserSnake(user.uid, id);
        if (cancelled) return;
        if (!loaded) { setError("This snake could not be found in your Tiny Titans account."); setLoadingSnake(false); return; }
        const migrated = migrateSnake({ ...loaded, id: loaded.id || id });
        setSnake(migrated); setError(null); setLoadingSnake(false);
        const allowed = await hasFullIntelligenceAccess(user.uid).catch(() => false);
        if (cancelled) return;
        setIntelligenceAccess(allowed);
        if (!allowed) return;
        setIntelligenceLoading(true);
        const learned = await getSnakeIntelligence(user.uid, id).catch(() => null);
        if (cancelled) return;
        setIntelligence(learned);
        setIntelligenceLoading(false);
        setBenchmarkLoading(true); setBenchmarkError("");
        const cohort = await getCommunityBenchmarkDataset({ species: migrated.species, sex: migrated.sex, morph: migrated.morphs?.[0], ageBand: getAgeBand(migrated.hatchDate) }).catch((loadError) => {
          if (!cancelled) setBenchmarkError(loadError instanceof Error ? loadError.message : "Community benchmark could not be loaded.");
          return null;
        });
        if (!cancelled) setBenchmark(cohort);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this snake. Please try again.");
          setLoadingSnake(false);
        }
      } finally {
        if (!cancelled) { setIntelligenceLoading(false); setBenchmarkLoading(false); }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, user, loading, profileLoading]);

  async function deleteSnake() {
    if (!snake || !user || !snake.id || deleting) return;
    setDeleting(true); setError(null);
    try {
      await deleteUserSnake(user.uid, snake.id);
      navigate("/snakes", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this snake. Please try again.");
      setDeleting(false); setConfirmDelete(false);
    }
  }

  const reminder = useMemo(() => snake ? getWeightReminder(snake) : null, [snake]);
  const summary: IntelligenceSummary|null = useMemo(() => snake && intelligenceAccess && benchmark ? buildIntelligenceSummary(snake, benchmark) : null, [snake, intelligenceAccess, benchmark]);
  const morphText = snake?.morphs?.length ? snake.morphs.join(", ") : "No morphs listed";
  const hetText = snake?.hets?.length ? snake.hets.join(", ") : "No hets recorded";
  const reminderWeightRoute = snake ? "/reminders/weight?snakeId=" + encodeURIComponent(snake.id) : "";
  const waterChangeRoute = snake ? "/reminders/water-change?snakeId=" + encodeURIComponent(snake.id) : "";

  return { id, user, loading, profileLoading, snake, loadingSnake, intelligence, intelligenceLoading, intelligenceAccess, benchmark, benchmarkLoading, benchmarkError, deleting, confirmDelete, setConfirmDelete, error, reminder, summary, morphText, hetText, reminderWeightRoute, waterChangeRoute, ageLabel, timeWithKeeperLabel, navigate, deleteSnake };
}