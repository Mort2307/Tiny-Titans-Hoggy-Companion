import { useEffect, useMemo, useState } from "react";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { benchmarkIsUsable, confidenceLabel, getAgeBand, getCommunityBenchmarkDataset, type BenchmarkMetric, type CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";

type Props = { snake: Snake; history: WeightRecord[] };
type Trend = { delta: number; days: number; weekly: number; label: "Rising" | "Falling" | "Stable" };
type WeightContext = { tone: "positive" | "neutral" | "caution"; title: string; body: string; detail: string };

const toTime = (date: string) => new Date(`${date}T12:00:00`).getTime();
const daysBetween = (a: string, b: string) => Math.round(Math.abs(toTime(b) - toTime(a)) / 86400000);

function calculateAgeMonths(hatchDate?: string, now = new Date()): number | null {
  if (!hatchDate) return null;
  const parsed = new Date(`${hatchDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed > now) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / 2629800000);
}

function calculateTrend(history: WeightRecord[]): Trend | null {
  if (history.length < 2) return null;
  const previous = history[history.length - 2];
  const latest = history[history.length - 1];
  const days = daysBetween(previous.date, latest.date);
  const delta = latest.weight - previous.weight;
  const weekly = days ? (delta / days) * 7 : 0;
  return { delta, days, weekly, label: Math.abs(weekly) < 0.25 ? "Stable" : weekly > 0 ? "Rising" : "Falling" };
}

function formatSigned(value: number, formatter: (grams: number) => string) {
  return `${value >= 0 ? "+" : ""}${formatter(value)}`;
}

function metricSummary(metric: BenchmarkMetric, currentWeight: number, formatWeight: (grams: number) => string) {
  if (!benchmarkIsUsable(metric) || metric.median == null) return null;
  const distance = currentWeight - metric.median;
  const rangeText = metric.lowerQuartile != null && metric.upperQuartile != null ? `${formatWeight(metric.lowerQuartile)}–${formatWeight(metric.upperQuartile)}` : "the available dataset";
  let position = "near the dataset median";
  if (metric.upperQuartile != null && currentWeight > metric.upperQuartile) position = "above the dataset's upper quartile";
  else if (metric.lowerQuartile != null && currentWeight < metric.lowerQuartile) position = "below the dataset's lower quartile";
  else if (distance > 0) position = "above the dataset median";
  else if (distance < 0) position = "below the dataset median";
  return { position, rangeText, confidence: confidenceLabel(metric.confidence) };
}

function buildWeightContext(snake: Snake, currentWeight: number, ageMonths: number | null, formatWeight: (grams: number) => string): WeightContext {
  if (!snake.sex || currentWeight <= 0 || ageMonths == null) {
    return { tone: "neutral", title: "Weight context needs a little more information", body: "Add an accurate hatch date and sex so Tiny Titans can place this weight in the right developmental context.", detail: "Without age and sex, the app should not label a weight as too low or too high." };
  }

  const sex = snake.sex.trim().toLowerCase();
  const isMale = sex === "male" || sex.endsWith(" male") || sex.includes(" male ");
  const isFemale = sex === "female" || sex.endsWith(" female") || sex.includes(" female ");
  const adultRange = isMale ? { min: 60, max: 133 } : isFemale ? { min: 180, max: 300 } : null;
  const sexLabel = isMale ? "male" : isFemale ? "female" : "recorded-sex";

  if (!adultRange) {
    return { tone: "neutral", title: "Sex-specific context is unavailable", body: "Tiny Titans can still assess this Titan's personal trend, but the available published weight reference is sex-specific.", detail: "Use body condition and the individual growth trajectory alongside the recorded weight." };
  }

  if (ageMonths < 6) {
    const juvenileMean = 12.02;
    const juvenileSd = 3.38;
    const bandLow = juvenileMean - juvenileSd;
    const bandHigh = juvenileMean + juvenileSd;
    if (currentWeight < bandLow) return { tone: "caution", title: "Below the broad band seen in a juvenile study", body: `${formatWeight(currentWeight)} is below roughly ${formatWeight(bandLow)} based on a published juvenile study mean of 12.02 g (SD 3.38 g).`, detail: "That study involved 3–4-month-old snakes and is a research reference, not a minimum healthy weight. Keep the individual trend and body condition in view." };
    if (currentWeight > bandHigh) return { tone: "positive", title: "Above the juvenile study mean — not automatically a concern", body: `${formatWeight(currentWeight)} is above the approximate mean±SD band from a published juvenile study.`, detail: "Being larger than a research cohort does not by itself mean a juvenile is overweight; individual growth varies." };
    return { tone: "positive", title: "Within the juvenile study's broad mean±SD band", body: `${formatWeight(currentWeight)} sits around the published juvenile study mean of 12.02 g (SD 3.38 g).`, detail: "This is useful context, not a target or clinical reference interval." };
  }

  if (ageMonths < 12) {
    return { tone: "positive", title: `${formatWeight(currentWeight)} is plausible for a growing ${sexLabel} juvenile`, body: "There is no validated universal 6–12 month weight interval for Western hognoses. Tiny Titans therefore uses the individual trend rather than inventing an age target.", detail: "A steady upward trend with appropriate body condition is more informative than trying to hit a single number." };
  }

  if (ageMonths < 24) {
    if (currentWeight >= adultRange.min) {
      return { tone: "positive", title: `${formatWeight(currentWeight)} is already within the published adult ${sexLabel} weight range`, body: `The published 3-year ${sexLabel} study included weights from ${formatWeight(adultRange.min)} to ${formatWeight(adultRange.max)}.`, detail: `At ${Math.round(ageMonths)} months, reaching the adult study's observed range can be reassuring, but it still is not an age-specific target.` };
    }
    return { tone: "positive", title: `${formatWeight(currentWeight)} is below the adult ${sexLabel} study range — but that does not mean underweight`, body: `The adult reference study observed ${sexLabel}s from ${formatWeight(adultRange.min)} to ${formatWeight(adultRange.max)} at 3 years old.`, detail: `This Titan is still subadult, so being below the adult study floor at ${Math.round(ageMonths)} months cannot by itself be classed as too small. The recorded growth trajectory matters.` };
  }

  if (currentWeight < adultRange.min) return { tone: "caution", title: `Below the published adult ${sexLabel} study range`, body: `At ${Math.round(ageMonths)} months, ${formatWeight(currentWeight)} is below the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in 3-year-old ${sexLabel}s.`, detail: "That is a useful prompt to review body condition, feeding history and the wider husbandry picture. Weight alone cannot diagnose underweight." };
  if (currentWeight > adultRange.max) return { tone: "caution", title: `Above the published adult ${sexLabel} study range`, body: `At ${Math.round(ageMonths)} months, ${formatWeight(currentWeight)} is above the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in the 3-year-old study.`, detail: "This identifies an unusually high recorded weight relative to that study, not a diagnosis of excess body condition. Check body condition and trend." };
  return { tone: "positive", title: `Within the published adult ${sexLabel} study range`, body: `${formatWeight(currentWeight)} sits inside the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in 3-year-old ${sexLabel}s.`, detail: "This is a broad research reference, not a perfect weight target for every adult." };
}

export default function WeightGrowthIntelligence({ snake, history }: Props) {
  const { user } = useAuth();
  const { formatWeight } = useUnits();
  const [intelligenceAccess, setIntelligenceAccess] = useState<boolean | null>(null);
  const [benchmark, setBenchmark] = useState<CommunityBenchmarkDataset | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState("");
  const orderedHistory = useMemo(() => [...history].sort((a, b) => toTime(a.date) - toTime(b.date)), [history]);
  const currentWeight = orderedHistory[orderedHistory.length - 1]?.weight ?? snake.weight ?? 0;
  const trend = useMemo(() => calculateTrend(orderedHistory), [orderedHistory]);
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
      if (!user?.uid) { setIntelligenceAccess(false); return; }
      setBenchmarkLoading(true); setBenchmarkError("");
      try {
        const allowed = await hasFullIntelligenceAccess(user.uid);
        if (cancelled) return;
        setIntelligenceAccess(allowed);
        if (!allowed) { setBenchmark(null); return; }
        const dataset = await getCommunityBenchmarkDataset({ species: snake.species, sex: snake.sex, morph: snake.morphs?.[0], ageBand });
        if (cancelled) return;
        setBenchmark(dataset);
      } catch (error) {
        if (!cancelled) setBenchmarkError("Tiny Titans could not retrieve the community comparison right now. Your personal analysis is unaffected.");
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
  const currentAgeText = ageMonths == null ? "Age not recorded" : ageMonths < 1 ? "Under 1 month" : ageMonths < 24 ? `${Math.round(ageMonths)} months old` : `${(ageMonths / 12).toFixed(1)} years old`;

  return (
    <section className="tt-weight-intelligence" aria-labelledby="tt-weight-intelligence-heading">
      <div className="tt-weight-intelligence-header"><div><p className="tt-tracker-eyebrow">Weight &amp; Growth Intelligence</p><h2 id="tt-weight-intelligence-heading">Is {snake.name} on a reassuring growth track?</h2><p className="tt-tracker-panel-muted">Personal trend is always available. Research context is always shown when enough age and sex information exists; community comparison appears only when Tiny Titans Intelligence is enabled.</p></div><span className={`tt-weight-intelligence-badge ${reassuring ? "positive" : "neutral"}`}>{reassuring ? "🟢 Reassuring trend" : "🔎 Context needed"}</span></div>
      <div className="tt-weight-intelligence-grid"><div className="tt-weight-intelligence-main">
        <div className="tt-weight-intelligence-stats"><div><span>Current</span><strong>{formatWeight(currentWeight)}</strong></div><div><span>Age</span><strong>{currentAgeText}</strong></div><div><span>Records</span><strong>{orderedHistory.length}</strong></div><div><span>Recent trend</span><strong>{trend ? `${formatSigned(trend.weekly, formatWeight)}/wk` : "—"}</strong></div></div>
        <div className={`tt-weight-intelligence-message ${weightContext.tone}`}><strong>{weightContext.title}</strong><p>{weightContext.body}</p><p className="tt-tracker-panel-muted">{weightContext.detail}</p></div>
        <div className="tt-weight-intelligence-message"><strong>{trend ? `${trend.label} recorded weight trend` : "More weigh-ins will improve the assessment"}</strong><p>{trend ? `The latest record is ${formatSigned(trend.delta, formatWeight)} from the previous recorded weight${trend.days ? ` over ${trend.days} day${trend.days === 1 ? "" : "s"}` : ""}. This describes the recorded measurements; it is not a diagnosis of body condition.` : "Tiny Titans needs at least two dated measurements to calculate a recent change, and three or more gives a much more useful view of the individual trend."}</p></div>
        <div className="tt-weight-intelligence-context"><h3>How Tiny Titans is judging the weight</h3><p>Tiny Titans does not use a made-up “ideal grams at age X” chart. It combines <strong>age + sex + current weight + individual trend</strong>, then adds anonymised community data when the consented dataset is strong enough.</p><p>Published evidence is useful for context: one juvenile study reported <strong>12.02 ± 3.38 g</strong> at 3–4 months, while a study of healthy 3-year-old adults reported males at <strong>60–133 g</strong> and females at <strong>180–300 g</strong>. These are study populations, not health targets.</p></div>
        {recentGapTooLarge && <div className="tt-weight-intelligence-warning"><strong>⚠️ Large history gap detected</strong><p>There is a {longestGap?.days}-day gap between {longestGap?.from} and {longestGap?.to}. Tiny Titans will not treat those measurements as a smooth growth trajectory.</p></div>}
        {benchmarkLoading && <div className="tt-weight-intelligence-loading">🧠 Checking eligible Tiny Titans benchmark data…</div>}
        {benchmarkError && <div className="tt-weight-intelligence-warning"><strong>Community comparison temporarily unavailable</strong><p>{benchmarkError}</p></div>}
        {intelligenceAccess === false && <div className="tt-weight-intelligence-locked"><strong>🔒 Community comparison is optional</strong><p>Your own trend and research context remain fully available. Enable Tiny Titans Intelligence in Data &amp; Privacy to compare against anonymised eligible community data.</p></div>}
        {intelligenceAccess && communitySummary && <div className="tt-weight-intelligence-benchmark"><div className="tt-weight-intelligence-benchmark-head"><div><p className="tt-tracker-eyebrow">Community reference</p><h3>{communitySummary.position}</h3></div><span>{communitySummary.confidence}</span></div><p>For the eligible {snake.sex?.toLowerCase() || "recorded-sex"} {snake.species} cohort around {ageBand || "this age"}, the current benchmark's middle 50% is approximately <strong>{communitySummary.rangeText}</strong>.</p><p className="tt-tracker-panel-muted">This describes participating keeper data, not an ideal target. Being above or below the median does not by itself mean a snake is too large or too small.</p></div>}
        {intelligenceAccess && !communitySummary && !benchmarkLoading && <div className="tt-weight-intelligence-locked"><strong>📊 No reliable community benchmark for this cohort yet</strong><p>Tiny Titans is still able to give the evidence-based weight context above. The community comparison will appear once the anonymised dataset has enough eligible records.</p></div>}
      </div><aside className="tt-weight-intelligence-side"><div><span>Trajectory confidence</span><strong>{orderedHistory.length >= 5 && !recentGapTooLarge ? "Higher" : orderedHistory.length >= 3 ? "Developing" : "Limited"}</strong></div><div><span>Age context</span><strong>{ageBand ? ageBand.replace("juvenile-", "juvenile · ").replace("-", " ") : "Needs hatch date"}</strong></div><div><span>Weight context</span><strong>{weightContext.tone === "positive" ? "Reassuring" : weightContext.tone === "caution" ? "Review" : "Needs context"}</strong></div><p>Weight is one data point. The app uses it alongside age, sex, trend and, when available, community data. Body condition still matters.</p></aside></div>
      <div className="tt-weight-intelligence-footer"><span>{intelligenceAccess ? "🧠 Intelligence active" : "Personal analysis active · community comparison off"}</span>{intelligenceAccess !== true && <button type="button" className="tt-weight-intelligence-link" onClick={() => { window.location.assign("/account/data-privacy"); }}>Manage Intelligence →</button>}</div>
    </section>
  );
}
