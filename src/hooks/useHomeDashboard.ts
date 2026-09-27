import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useWorldTime } from "../context/WorldTimeContext";
import { getUserSnakes } from "../services/snakeService";
import { getUserAnimals } from "../services/universalAnimalService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { getDashboardIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import { getTitanDecisionState, refreshTitanDecisionStateForAnimals, type TitanDecision } from "../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../services/titanReactiveIntelligenceService";
import { listReminders } from "../services/reminderService";
import type { Reminder } from "../types/Reminder";

export type HomeAnimal = { id: string; name: string; species?: string; animalGroup?: string; recordSource: "universal" | "legacy-snake"; weightRecords: number; feedingRecords: number; shedRecords: number; healthRecords: number; };
export type HomeSnake = HomeAnimal;
export type HomeUrgentReminder = {
  reminder: Reminder;
  urgency: "overdue" | "due-soon";
  dueAt: number;
};

export function buildQuietIntelligenceSnippet(snake: HomeAnimal | undefined, totalRecords: number, dateKey: string): string {
  if (!snake || totalRecords === 0) return "There is more useful information hiding in a well-kept record than first meets the eye.";
  const snippets = [
    snake.weightRecords >= 3 ? `${snake.name} weight history is starting to look like a pattern rather than a pile of numbers.` : null,
    snake.feedingRecords >= 3 ? `${snake.name} feeding log is getting interesting. A rhythm is beginning to peek through.` : null,
    snake.shedRecords >= 3 ? `Those shed records are quietly becoming a useful little baseline for ${snake.name}.` : null,
    snake.weightRecords >= 2 && snake.feedingRecords >= 3 ? `There is more hiding in ${snake.name} weight and feeding history than either record shows on its own.` : null,
    snake.shedRecords >= 2 && snake.feedingRecords >= 3 ? `Something interesting is starting to emerge in the rhythm of ${snake.name} routine.` : null,
    snake.healthRecords > 0 && (snake.weightRecords > 0 || snake.feedingRecords > 0) ? `${snake.name} records are beginning to give a little more context than the individual entries suggest.` : null,
    totalRecords >= 12 ? "You've logged enough here that the history is starting to look rather more interesting than simple record keeping." : null,
    totalRecords >= 7 ? "There is a little more going on in these records than first meets the eye." : null,
  ].filter((value): value is string => Boolean(value));
  if (!snippets.length) return "A few more real records and this gets surprisingly interesting.";
  let hash = 0;
  for (const character of `${snake.id}-${dateKey}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return snippets[hash % snippets.length];
}

export function useHomeDashboard() {
  const { user, profile } = useAuth();
  const world = useWorldTime();
  const [snakes, setSnakes] = useState<HomeAnimal[]>([]);
  const [intelligence, setIntelligence] = useState<SnakeIntelligence[]>([]);
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [intelligenceAccess, setIntelligenceAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const displayName = profile?.displayName || user?.displayName || "Tiny Titan";
  const learningLabel = profile?.learningLevel === "explorer" ? "Explorer" : profile?.learningLevel === "learner" ? "Learner" : profile?.learningLevel === "student" ? "Student" : "Adult";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingIntelligence(true);
    setAccessChecked(false);
    const load = async () => {
      try {
        const [hasAccess, records, universalAnimals, reminderRecords] = await Promise.all([hasFullIntelligenceAccess(user.uid), getUserSnakes(user.uid), getUserAnimals(user.uid), listReminders(user.uid).catch(() => [])]);
        if (!active) return;
        setIntelligenceAccess(hasAccess);
        setAccessChecked(true);
        setReminders(reminderRecords);
        const legacyMinimal: HomeAnimal[] = records.map((snake) => ({ id: snake.id, name: snake.name, species: snake.species, animalGroup: "reptile", recordSource: "legacy-snake", weightRecords: snake.weightHistory?.length ?? 0, feedingRecords: snake.feedingHistory?.length ?? 0, shedRecords: snake.shedHistory?.length ?? 0, healthRecords: snake.healthHistory?.length ?? 0 }));
        const universalMinimal: HomeAnimal[] = universalAnimals.map((animal) => ({ id: animal.id, name: animal.name, species: animal.speciesCommonName || animal.scientificName, animalGroup: animal.animalGroup, recordSource: "universal", weightRecords: 0, feedingRecords: 0, shedRecords: 0, healthRecords: 0 }));
        const minimal = [...legacyMinimal, ...universalMinimal].sort((a, b) => a.name.localeCompare(b.name));
        setSnakes(minimal);
        setSelectedSnakeId((current) => minimal.some((snake) => snake.id === current) ? current : minimal[0]?.id ?? "");
        if (!hasAccess) { setIntelligence([]); setDecision(null); return; }
        const legacyIds = minimal.filter((animal) => animal.recordSource === "legacy-snake").map((animal) => animal.id);
        const insights = await getDashboardIntelligence(user.uid, legacyIds);
        if (!active) return;
        setIntelligence(insights);
        const existing = getTitanDecisionState(user.uid);
        const existingActive = existing.decisions.find((item) => item.status === "active") ?? null;
        if (existing.decisions.length > 0) setDecision(existingActive);
        else {
          const refreshed = await refreshTitanDecisionStateForAnimals(user.uid, minimal.filter((animal) => animal.recordSource === "legacy-snake").map((animal) => animal.id));
          if (!active) return;
          setDecision(refreshed.decisions.find((item) => item.status === "active") ?? null);
        }
      } catch {
        if (!active) return;
        setSnakes([]); setReminders([]); setIntelligence([]); setDecision(null); setIntelligenceAccess(false); setAccessChecked(true);
      } finally { if (active) setLoadingIntelligence(false); }
    };
    void load();
    const unsubscribe = subscribeToTitanIntelligenceUpdates((detail) => {
      const event = detail.event;
      if (event?.animalId && event.occurredAt) {
        void refreshTitanDecisionStateForAnimals(user.uid, [event.animalId], { type: event.type, occurredAt: event.occurredAt }).then(() => { if (active) void load(); }).catch(() => { if (active) void load(); });
        return;
      }
      if (event) void load();
    });
    return () => { active = false; unsubscribe(); };
  }, [user]);
  useEffect(() => {
    if (!user || !intelligenceAccess) return () => undefined;
    const refresh = () => setDecision(getTitanDecisionState(user.uid).decisions.find((item) => item.status === "active") ?? null);
    refresh();
    return subscribeToTitanIntelligenceUpdates((detail) => { if (detail.event) return; refresh(); });
  }, [user, intelligenceAccess]);
  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId) ?? snakes[0], [snakes, selectedSnakeId]);
  const selectedIntelligence = useMemo(() => selectedSnake?.recordSource === "legacy-snake" ? intelligence.find((item) => item.snakeId === selectedSnakeId) : undefined, [intelligence, selectedSnakeId, selectedSnake?.recordSource]);
  const attentionDecision = decision?.status === "active" ? decision : null;
  const urgentReminder = useMemo<HomeUrgentReminder | null>(() => {
    const now = world.observedAt.getTime();
    const dueSoonBoundary = now + (24 * 60 * 60 * 1000);
    const candidates = reminders
      .filter((reminder) => reminder.status === "active")
      .map((reminder) => ({ reminder, dueAt: Date.parse(reminder.nextNotificationAt) }))
      .filter((item) => Number.isFinite(item.dueAt))
      .sort((a, b) => a.dueAt - b.dueAt);
    const overdue = candidates.find((item) => item.dueAt <= now);
    if (overdue) return { ...overdue, urgency: "overdue" };
    const dueSoon = candidates.find((item) => item.dueAt <= dueSoonBoundary);
    return dueSoon ? { ...dueSoon, urgency: "due-soon" } : null;
  }, [reminders, world.observedAt]);
  const coverage = useMemo(() => intelligence.length ? Math.round(intelligence.reduce((sum, item) => sum + item.dataCoveragePercent, 0) / intelligence.length) : 0, [intelligence]);
  const totalRecords = useMemo(() => snakes.reduce((sum, snake) => sum + snake.weightRecords + snake.feedingRecords + snake.shedRecords + snake.healthRecords, 0), [snakes]);
  const snapshot = useMemo(() => ({ weights: snakes.reduce((sum, snake) => sum + snake.weightRecords, 0), feedings: snakes.reduce((sum, snake) => sum + snake.feedingRecords, 0), sheds: snakes.reduce((sum, snake) => sum + snake.shedRecords, 0), health: snakes.reduce((sum, snake) => sum + snake.healthRecords, 0) }), [snakes]);
  const quietIntelligenceSnippet = useMemo(() => buildQuietIntelligenceSnippet(selectedSnake, totalRecords, world.localDateKey), [selectedSnake, totalRecords, world.localDateKey]);
  const selectedIndex = Math.max(0, snakes.findIndex((snake) => snake.id === selectedSnakeId));
  function moveSnake(direction: -1 | 1) { if (!snakes.length) return; const next = (selectedIndex + direction + snakes.length) % snakes.length; setSelectedSnakeId(snakes[next].id); }
  const selectedSnakeRecords = selectedSnake ? selectedSnake.weightRecords + selectedSnake.feedingRecords + selectedSnake.shedRecords + selectedSnake.healthRecords : 0;
  return { user, profile, world, displayName, learningLabel, experience, snakes, intelligence, attentionDecision, urgentReminder, selectedIntelligence, selectedSnake, selectedIndex, selectedSnakeRecords, coverage, snapshot, totalRecords, quietIntelligenceSnippet, loadingIntelligence, intelligenceAccess, accessChecked, worldOpen, setWorldOpen, moveSnake };
}