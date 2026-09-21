import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import { getSnakeMasterRecord, type SnakeMasterRecord } from "../services/snakeMasterRecord";
import { buildSnakeIntelligence from "../services/snakeIntelligenceService";
import { getCanonicalBreedingTimeline } from "../services/canonicalBreedingTimeline";
import { deleteSnakeWeight } from "../services/weightService";
import { deleteSnakeFeeding } from "../services/feedingService";
import { deleteSnakeShed } from "../services/shedService";
import { formatDaysSinceFeeding, latestFeedingAttempt, latestSuccessfulFeed } from "../utils/feedingSummary";
import { confidenceExplanation,formatMasterRecordDate,insightDestination,insightIconName,timelineActionLabel,timelineDestination } from "../lib/snakeMasterRecord";

export function useSnakeMasterRecord() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isImperial, formatWeight, formatLength } = useUnits();
        const [record, setRecord] = useState<SnakeMasterRecord | null>(null);
  const [loadedRecordKey, setLoadedRecordKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const recordKey = user && id ? `${user.uid}:${id}` : null;
  const loading = Boolean(recordKey && loadedRecordKey !== recordKey);

  const loadRecord = useCallback(async () => {
    if (!user || !id) return;
    const [result, breedingTimeline] = await Promise.all([getSnakeMasterRecord(user.uid, id), getCanonicalBreedingTimeline(user.uid, id)]);
    if (!result) { setRecord(null); setError(""); return; }
    const existingIds = new Set(result.timeline.map((event) => event.id));
    const mergedTimeline = [...result.timeline, ...breedingTimeline.filter((event) => !existingIds.has(event.id))].sort((a, b) => b.date.localeCompare(a.date));
    setRecord({ ...result, timeline: mergedTimeline });
    setError("");
  }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    void loadRecord().catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load this reptile overview."); }).finally(() => { if (!cancelled) setLoadedRecordKey(recordKey); });
    return () => { cancelled = true; };
  }, [user, id, recordKey, loadRecord]);

  useEffect(() => {
    const target = searchParams.get("event");
    if (!target || !record) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`timeline-event-${target}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedEventId(target);
      window.setTimeout(() => setHighlightedEventId((current) => current === target ? null : current), 2200);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [record, searchParams]);

  const intelligence = useMemo(() => record ? buildSnakeIntelligence(record) : null, [record]);
  const speciesLabel = record?.snake.species ?? "Reptile";
  const weight = record?.overview.currentWeightG == null ? "Not recorded" : formatWeight(record.overview.currentWeightG);
  const change = record?.overview.weightChangeG == null ? "Build baseline" : `${record.overview.weightChangeG >= 0 ? "+" : ""}${formatWeight(record.overview.weightChangeG)} since first weight`;
  const shedLength = record?.overview.averageShedLengthCm == null ? "Not recorded" : formatLength(record.overview.averageShedLengthCm);
  const averageShed = record?.overview.averageShedLengthCm == null ? "Build baseline" : formatLength(record.overview.averageShedLengthCm);
  const latestFeedAttempt = record ? latestFeedingAttempt(record.feedings) : undefined;
  const latestSuccessful = record ? latestSuccessfulFeed(record.feedings) : undefined;
  const confidenceDetails = record ? (Object.entries(record.overview.confidenceReasons) as Array<[string, { level: SnakeMasterRecord["overview"]["confidence"]["overall"]; records: number; target: number }]>).map(([area, detail]) => [area, detail.level, detail.records, detail.target] as const) : [];

  const handleDeleteTimelineRecord = async (event: SnakeMasterRecord["timeline"][number]) => {
    if (!user || !id || !event.relatedRecordId || !["Weight", "Feeding", "Shed"].includes(event.type)) return;
    const label = `${event.title}${event.date ? ` on ${formatMasterRecordDate(event.date)}` : ""}`;
    if (!window.confirm(`Delete this ${event.type.toLowerCase()} record?\n\n${label}\n\nThis permanently removes the individual record and updates this reptile's Master Record. This cannot be undone.`)) return;
    setDeletingRecordId(event.id);
    setError("");
    try {
      if (event.type === "Weight") await deleteSnakeWeight(user.uid, id, event.relatedRecordId);
      else if (event.type === "Feeding") await deleteSnakeFeeding(user.uid, id, event.relatedRecordId);
      else await deleteSnakeShed(user.uid, id, event.relatedRecordId);
      await loadRecord();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to delete this ${event.type.toLowerCase()} record.`);
    } finally {
      setDeletingRecordId(null);
    }
  };

  return {
    id,record,loading,error,deletingRecordId,highlightedEventId,intelligence,isImperial,formatWeight,formatLength,
    speciesLabel,weight,change,shedLength,averageShed,latestFeedAttempt,latestSuccessful,confidenceDetails,
    formatDaysSinceFeeding,handleDeleteTimelineRecord,confidenceExplanation,timelineDestination,insightDestination,timelineActionLabel,insightIconName
  };
}
