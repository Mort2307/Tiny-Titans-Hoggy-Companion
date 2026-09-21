import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import { getAgeBand, getCommunityBenchmarkDataset, type CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { buildWeightContext, calculateAgeMonths, calculateWeightTrend, daysBetween, metricSummary, toTime } from "../lib/weightGrowthIntelligence";

export function useWeightGrowthIntelligence(snake: Snake, history: WeightRecord[]) {
  const { user } = useAuth();
  const { formatWeight } = useUnits();
  const [intelligenceAccess, setIntelligenceAccess] = useState<boolean | null>(null);
  const [benchmark, setBenchmark] = useState<CommunityBenchmarkDataset | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState("");

  const orderedHistory = useMemo(() => [...history].sort((a, b) => toTime(a.date) - toTime(b.date)), [history]);
  const currentWeight = orderedHistory[orderedHistory.length - 1]?.weight ?? snake.weight ?? 0;
  const trend = useMemo(() => calculateWeightTrend(orderedHistory), [orderedHistory]);
  const ageMonths = useMemo(() => calculateAgeMonths(snake.hatchDate), [snake.hatchDate]);
  const ageBand = useMemo(() => getAgeBand(snake.hatchDate), [snake.hatchDate]);
  const weightContext = useMemo(() => buildWeightContext(snake, currentWeight, ageMonths, formatWeight), [snake, currentWeight, ageMonths, formatWeight]);
  const longestGap = useMemo(() => {
    if (orderedHistory.length < 2) return null;
    let largest = { days: 0, from: "", to: "" };
    for (let index = 1; index < orderedHistory.length; index += 1) {
      const days = daysBetween(orderedHistory[index - 1].date, orderedHistory[index].date);
      if (days > largest.days) largest = { days, from: orderedHistory[index - 1].date, to: orderedHistory[index].date };
    }
    return largest;
  }, [orderedHistory]);

  useEffect(() => {
    let cancelled = false;
    async function loadIntelligence() {
      if (!user?.uid) {
        setIntelligenceAccess(false);
        setBenchmark(null);
        setBenchmarkLoading(false);
        return;
      }
      setBenchmarkLoading(true);
      setBenchmarkError("");
      try {
        const allowed = await hasFullIntelligenceAccess(user.uid);
        if (cancelled) return;
        setIntelligenceAccess(allowed);
        if (!allowed) {
          setBenchmark(null);
          return;
        }
        const dataset = await getCommunityBenchmarkDataset({
          species: snake.species,
          sex: snake.sex,
          morph: snake.morphs?.[0],
          ageBand,
        });
        if (cancelled) return;
        setBenchmark(dataset);
      } catch {
        if (!cancelled) {
          setBenchmarkError("Tiny Titans could not retrieve the community comparison right now. Your personal analysis is unaffected.");
        }
      } finally {
        if (!cancelled) setBenchmarkLoading(false);
      }
    }
    void loadIntelligence();
    return () => { cancelled = true; };
  }, [user?.uid, snake.species, snake.sex, snake.morphs, ageBand]);

  const weightMetric = benchmark?.metrics.find((metric) => metric.metric === "weight");
  const communitySummary = weightMetric ? metricSummary(weightMetric, currentWeight, formatWeight) : null;
  const tooFewRecords = orderedHistory.length < 3;
  const recentGapTooLarge = Boolean(longestGap && longestGap.days >= 180);
  const reassuring = weightContext.tone === "positive" && Boolean(trend && trend.label !== "Falling") && !tooFewRecords && !recentGapTooLarge;
  const currentAgeText = ageMonths == null
    ? "Age not recorded"
    : ageMonths < 1 ? "Under 1 month"
    : ageMonths < 24 ? `${Math.round(ageMonths)} months old`
    : `${(ageMonths / 12).toFixed(1)} years old`;

  return {
    formatWeight, orderedHistory, currentWeight, trend, ageMonths, ageBand, weightContext,
    longestGap, intelligenceAccess, benchmarkLoading, benchmarkError, communitySummary,
    tooFewRecords, recentGapTooLarge, reassuring, currentAgeText,
  };
}
