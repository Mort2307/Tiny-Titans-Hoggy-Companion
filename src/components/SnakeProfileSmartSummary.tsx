import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { FeedingRecord } from "../types/Feeding";
import type { ShedRecord } from "../types/Shed";
import type { WeightRecord } from "../types/Weight";
import { useUnits } from "../context/UnitContextValue";

type SignalTone = "positive" | "neutral" | "watch" | "attention";
type SignalCategory = "weight" | "feeding" | "shedding" | "husbandry" | "behaviour" | "health" | "data";

type ProfileSignal = {
  id: string;
  category: SignalCategory;
  tone: SignalTone;
  confidence: "High" | "Moderate" | "Low" | "Insufficient";
  title: string;
  reason: string;
  actionLabel?: string;
  route?: string;
};

const MS_PER_DAY = 86_400_000;

function safeDate(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function daysSince(value?: string | null, now = new Date()): number | null {
  const timestamp = safeDate(value);
  if (timestamp === null) return null;
  return Math.max(0, Math.round((now.getTime() - timestamp) / MS_PER_DAY));
}

function elapsedCalendar(value?: string | null, now = new Date()): string {
  const timestamp = safeDate(value);
  if (timestamp === null) return "Not recorded";
  const start = new Date(timestamp);
  if (start > now) return "Not recorded";
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  const years = Math.floor(months / 12);
  months %= 12;
  const parts = [years ? `${years} Year${years === 1 ? "" : "s"}` : "", months ? `${months} Month${months === 1 ? "" : "s"}` : "", days ? `${days} Day${days === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.join(" ") || "0 Days";
}

function plural(value: number, singular: string, suffix = "s") {
  return `${value} ${singular}${value === 1 ? "" : suffix}`;
}

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function intervalDays(records: Array<{ date: string }>): number[] {
  const dates = records.map((item) => safeDate(item.date)).filter((value): value is number => value !== null).sort((a, b) => a - b);
  return dates.slice(1).map((date, index) => Math.round((date - dates[index]) / MS_PER_DAY)).filter((value) => value > 0);
}

function normaliseWeights(history: WeightRecord[]): Array<WeightRecord & { grams: number }> {
  return [...history]
    .map((record) => ({ ...record, grams: record.unit === "kg" ? record.weight * 1000 : record.weight }))
    .filter((record) => Number.isFinite(record.grams) && record.grams > 0 && safeDate(record.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return "Not recorded";
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function signalToneLabel(tone: SignalTone): string {
  return tone === "attention" ? "Action worth taking" : tone === "watch" ? "Worth checking" : tone === "positive" ? "Positive pattern" : "Building baseline";
}

function signalEmoji(tone: SignalTone): string {
  return tone === "attention" ? "🔴" : tone === "watch" ? "🟠" : tone === "positive" ? "🟢" : "⚪";
}

function categoryRoute(category: SignalCategory, snakeId: string): string | undefined {
  const routes: Record<SignalCategory, string | undefined> = {
    weight: `/weights/${snakeId}`,
    feeding: `/feeding/${snakeId}`,
    shedding: `/shedding/${snakeId}`,
    husbandry: `/husbandry/${snakeId}`,
    behaviour: `/behaviour/${snakeId}`,
    health: `/health/${snakeId}`,
    data: `/snakes/${snakeId}/edit`,
  };
  return routes[category];
}

function buildSignals(snake: Snake, now: Date): ProfileSignal[] {
  const signals: ProfileSignal[] = [];
  const weights = normaliseWeights(snake.weightHistory ?? []);
  const feedings = [...(snake.feedingHistory ?? [])].filter((record) => safeDate(record.date) !== null).sort((a, b) => b.date.localeCompare(a.date));
  const sheds = [...(snake.shedHistory ?? [])].filter((record) => safeDate(record.date) !== null).sort((a, b) => b.date.localeCompare(a.date));

  const recentWeightDelta = weights.length >= 2 ? weights[weights.length - 1].grams - weights[weights.length - 2].grams : null;
  const previousWeight = weights.length >= 2 ? weights[weights.length - 2].grams : null;
  const recentWeightPercent = recentWeightDelta !== null && previousWeight ? (recentWeightDelta / previousWeight) * 100 : null;

  if (sheds[0] && (sheds[0].status === "Problematic" || sheds[0].status === "Partial")) {
    signals.push({
      id: "latest-shed-status",
      category: "shedding",
      tone: "attention",
      confidence: sheds.length >= 2 ? "Moderate" : "Low",
      title: "Latest shed record needs reviewing",
      reason: `${snake.name}'s latest recorded shed is marked ${sheds[0].status.toLowerCase()}. Tiny Titans is surfacing the recorded outcome rather than assuming a cause.`,
      actionLabel: "Review Shed",
      route: categoryRoute("shedding", snake.id),
    });
  }

  if (weights.length >= 3 && recentWeightPercent !== null && recentWeightPercent <= -5) {
    signals.push({
      id: "recent-weight-change",
      category: "weight",
      tone: "watch",
      confidence: weights.length >= 5 ? "High" : "Moderate",
      title: "Recent weight change is worth checking",
      reason: `The latest recorded weight is ${Math.abs(recentWeightPercent).toFixed(1)}% lower than the previous record. A single change can have many explanations, so Tiny Titans recommends checking the underlying records first.`,
      actionLabel: "Review Weight",
      route: categoryRoute("weight", snake.id),
    });
  }

  if (feedings.length >= 4) {
    const recent = feedings.slice(0, 4);
    const refusals = recent.filter((record) => record.response !== "Accepted").length;
    if (refusals >= 2) {
      signals.push({
        id: "feeding-response-cluster",
        category: "feeding",
        tone: "watch",
        confidence: feedings.length >= 8 ? "High" : "Moderate",
        title: "Recent feeding responses are worth checking",
        reason: `${snake.name} has ${refusals} non-accepted responses across the latest ${recent.length} feeding records. Tiny Titans is identifying a cluster in the log, not diagnosing a reason.`,
        actionLabel: "Review Feeding",
        route: categoryRoute("feeding", snake.id),
      });
    }

    const feedingIntervals = intervalDays(feedings);
    const baseline = median(feedingIntervals.slice(-Math.min(6, feedingIntervals.length)));
    const currentGap = daysSince(feedings[0]?.date, now);
    if (baseline !== null && currentGap !== null && feedingIntervals.length >= 3 && currentGap > Math.max(baseline * 1.75, baseline + 7)) {
      signals.push({
        id: "feeding-gap",
        category: "feeding",
        tone: "watch",
        confidence: feedings.length >= 8 ? "High" : "Moderate",
        title: "Feeding interval has moved outside the personal pattern",
        reason: `The current gap is ${currentGap} days compared with a recorded personal median of ${baseline.toFixed(0)} days. This is a prompt to inspect the history, not a claim that anything is wrong.`,
        actionLabel: "Review Feeding",
        route: categoryRoute("feeding", snake.id),
      });
    }
  }

  if (sheds.length >= 3) {
    const shedIntervals = intervalDays(sheds);
    const baseline = median(shedIntervals.slice(-Math.min(6, shedIntervals.length)));
    const currentGap = daysSince(sheds[0]?.date, now);
    if (baseline !== null && currentGap !== null && shedIntervals.length >= 2 && currentGap > Math.max(baseline * 1.9, baseline + 14)) {
      signals.push({
        id: "shed-gap",
        category: "shedding",
        tone: "watch",
        confidence: sheds.length >= 5 ? "High" : "Moderate",
        title: "Time since the last shed is outside the recorded rhythm",
        reason: `The current gap is ${currentGap} days compared with a personal median of ${baseline.toFixed(0)} days. Tiny Titans is comparing this snake with its own history rather than a generic shed schedule.`,
        actionLabel: "Review Shed",
        route: categoryRoute("shedding", snake.id),
      });
    }
  }

  if (snake.enclosure?.environmentHistory?.length) {
    const latestEnvironment = [...snake.enclosure.environmentHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    const environmentAge = daysSince(latestEnvironment?.recordedAt, now);
    if (environmentAge !== null && environmentAge > 30) {
      signals.push({
        id: "husbandry-freshness",
        category: "husbandry",
        tone: "watch",
        confidence: "Moderate",
        title: "Husbandry records could use a refresh",
        reason: `The latest recorded enclosure environment entry is ${environmentAge} days old. Tiny Titans recommends checking the current setup rather than assuming the old reading still applies.`,
        actionLabel: "Review Husbandry",
        route: categoryRoute("husbandry", snake.id),
      });
    }
  } else if (snake.enclosure) {
    signals.push({
      id: "husbandry-baseline",
      category: "husbandry",
      tone: "neutral",
      confidence: "Insufficient",
      title: "Husbandry history needs a baseline",
      reason: "An enclosure is recorded, but there is not yet an environment history for Tiny Titans to compare over time.",
      actionLabel: "Review Husbandry",
      route: categoryRoute("husbandry", snake.id),
    });
  }

  if (snake.healthHistory?.length) {
    const latest = [...snake.healthHistory].sort((a, b) => b.date.localeCompare(a.date))[0];
    const age = daysSince(latest?.date, now);
    if (age !== null && age <= 14 && latest.status !== "Recovered") {
      signals.push({
        id: "recent-health-record",
        category: "health",
        tone: "watch",
        confidence: "Moderate",
        title: "Recent health record is active",
        reason: `A recent health entry is still marked ${String(latest.status).toLowerCase()}. Tiny Titans is surfacing the keeper's recorded status, not making a medical judgement.`,
        actionLabel: "Review Health",
        route: categoryRoute("health", snake.id),
      });
    }
  }

  const behaviourHistory = (snake.timeline ?? []).filter((event) => event.type === "Behaviour");
  if (behaviourHistory.length === 0 && !snake.notes) {
    signals.push({
      id: "behaviour-context",
      category: "behaviour",
      tone: "neutral",
      confidence: "Insufficient",
      title: "Behaviour context is still largely unrecorded",
      reason: `Tiny Titans has little individual behaviour context for ${snake.name}. A few observations can make future behaviour comparisons much more useful.`,
      actionLabel: "Add Behaviour",
      route: categoryRoute("behaviour", snake.id),
    });
  }

  if (weights.length === 0 && snake.weight === null) {
    signals.push({ id: "missing-weight", category: "weight", tone: "neutral", confidence: "Insufficient", title: "Weight history needs a starting point", reason: "No usable weight record is available yet, so Tiny Titans cannot build a personal growth baseline.", actionLabel: "Record Weight", route: categoryRoute("weight", snake.id) });
  }
  if (feedings.length === 0) {
    signals.push({ id: "missing-feeding", category: "feeding", tone: "neutral", confidence: "Insufficient", title: "Feeding history needs a starting point", reason: "No feeding record is available yet, so Tiny Titans cannot learn this snake's individual feeding pattern.", actionLabel: "Record Feeding", route: categoryRoute("feeding", snake.id) });
  }
  if (sheds.length === 0) {
    signals.push({ id: "missing-shed", category: "shedding", tone: "neutral", confidence: "Insufficient", title: "Shed history needs a starting point", reason: "No shed record is available yet, so Tiny Titans cannot learn this snake's individual shed rhythm.", actionLabel: "Record Shed", route: categoryRoute("shedding", snake.id) });
  }

  return signals;
}

function buildCompleteness(snake: Snake): { score: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ["basic identity", Boolean(snake.name && snake.species && snake.sex)],
    ["hatch date", Boolean(snake.hatchDate)],
    ["arrival date", Boolean(snake.arrivalDate)],
    ["genetics", Boolean(snake.morphs?.length || snake.customMorph)],
    ["weight history", Boolean((snake.weightHistory?.length ?? 0) || snake.weight !== null)],
    ["feeding history", Boolean((snake.feedingHistory?.length ?? 0) || snake.lastMealDate)],
    ["shed history", Boolean(snake.shedHistory?.length)],
    ["enclosure record", Boolean(snake.enclosure)],
  ];
  const complete = checks.filter(([, value]) => value).length;
  return { score: Math.round((complete / checks.length) * 100), missing: checks.filter(([, value]) => !value).map(([label]) => label) };
}

function statusForSignal(signal: ProfileSignal | undefined): string {
  return signal ? `${signalEmoji(signal.tone)} ${signalToneLabel(signal.tone)}` : "🟢 No immediate review flagged";
}

export default function SnakeProfileSmartSummary({ snake }: { snake: Snake }) {
  const navigate = useNavigate();
  const { formatWeight } = useUnits();
  const now = useMemo(() => new Date(), []);

  const data = useMemo(() => {
    const weights = normaliseWeights(snake.weightHistory ?? []);
    const feedings = [...(snake.feedingHistory ?? [])].filter((record) => safeDate(record.date) !== null).sort((a, b) => b.date.localeCompare(a.date));
    const sheds = [...(snake.shedHistory ?? [])].filter((record) => safeDate(record.date) !== null).sort((a, b) => b.date.localeCompare(a.date));
    const currentWeight = weights.length ? weights[weights.length - 1].grams : snake.weight;
    const previousWeight = weights.length >= 2 ? weights[weights.length - 2].grams : null;
    const weightDelta = currentWeight !== null && previousWeight !== null ? currentWeight - previousWeight : null;
    const weightIntervals = intervalDays(weights);
    const feedIntervals = intervalDays(feedings);
    const shedIntervals = intervalDays(sheds);
    const acceptance = feedings.length ? Math.round((feedings.filter((record) => record.response === "Accepted").length / feedings.length) * 100) : null;
    const completeness = buildCompleteness(snake);
    const signals = buildSignals(snake, now);
    const reviewSignals = signals.filter((signal) => signal.tone === "attention" || signal.tone === "watch");
    const priority = [...signals].sort((a, b) => {
      const toneRank = (tone: SignalTone) => tone === "attention" ? 4 : tone === "watch" ? 3 : tone === "neutral" ? 2 : 1;
      const confidenceRank = (confidence: ProfileSignal["confidence"]) => confidence === "High" ? 4 : confidence === "Moderate" ? 3 : confidence === "Low" ? 2 : 1;
      return toneRank(b.tone) - toneRank(a.tone) || confidenceRank(b.confidence) - confidenceRank(a.confidence);
    })[0];
    return { weights, feedings, sheds, currentWeight, previousWeight, weightDelta, weightIntervals, feedIntervals, shedIntervals, acceptance, completeness, signals, reviewSignals, priority };
  }, [snake, now]);

  const lastFeedDate = data.feedings[0]?.date ?? snake.lastMealDate ?? null;
  const lastShedDate = data.sheds[0]?.date ?? null;
  const lastFeedDays = daysSince(lastFeedDate, now);
  const lastShedDays = daysSince(lastShedDate, now);
  const latestShed = data.sheds[0];
  const feedMedian = median(data.feedIntervals);
  const shedMedian = median(data.shedIntervals);
  const currentWeightDisplay = data.currentWeight === null ? "—" : formatWeight(data.currentWeight);
  const weightDeltaDisplay = data.weightDelta === null ? "Pattern building" : `${data.weightDelta >= 0 ? "+" : ""}${formatWeight(data.weightDelta)}`;
  const highestWeight = data.weights.length ? Math.max(...data.weights.map((record) => record.grams)) : null;
  const lowestWeight = data.weights.length ? Math.min(...data.weights.map((record) => record.grams)) : null;
  const firstWeightDate = data.weights[0]?.date;
  const firstFeedDate = data.feedings[data.feedings.length - 1]?.date;
  const firstShedDate = data.sheds[data.sheds.length - 1]?.date;

  function go(signal: ProfileSignal) {
    if (signal.route) navigate(signal.route);
  }

  return (
    <>
      <section className="tt-intelligence-panel tt-profile-smart-priority" aria-labelledby="snake-profile-priority-heading">
        <div className="tt-shared-intelligence-header">
          <div>
            <p className="tt-intelligence-kicker">WHAT SHOULD YOU LOOK AT FIRST?</p>
            <h2 id="snake-profile-priority-heading" className="tt-intelligence-title">{snake.name}</h2>
          </div>
          <span className="tt-profile-priority-status">{statusForSignal(data.priority)}</span>
        </div>
        {data.priority ? (
          <article className="tt-profile-priority-card" data-tone={data.priority.tone}>
            <div className="tt-profile-priority-copy">
              <span className="tt-profile-signal-label">{signalToneLabel(data.priority.tone)}</span>
              <h3>{data.priority.title}</h3>
              <p>{data.priority.reason}</p>
              <span className="tt-confidence">◉ {data.priority.confidence} confidence</span>
            </div>
            {data.priority.actionLabel && data.priority.route && <button type="button" className="tt-profile-review-button" onClick={() => go(data.priority!)}>{data.priority.actionLabel} →</button>}
          </article>
        ) : (
          <p className="tt-intelligence-meta">Tiny Titans has no immediate review flag from the records currently available. Continue logging normally and the profile will reassess as new evidence arrives.</p>
        )}
      </section>

      <section className="tt-intelligence-panel tt-profile-snapshot" aria-labelledby="snake-profile-snapshot-heading">
        <div className="tt-shared-intelligence-header">
          <div>
            <p className="tt-intelligence-kicker">KEEPER SNAPSHOT</p>
            <h2 id="snake-profile-snapshot-heading" className="tt-intelligence-title">{snake.name}'s current record</h2>
          </div>
          <span className="tt-profile-coverage">{data.completeness.score}% record coverage</span>
        </div>
        <div className="tt-profile-snapshot-grid">
          <div><span>⚖️ Current weight</span><strong>{currentWeightDisplay}</strong><small>{weightDeltaDisplay} since previous record</small></div>
          <div><span>🍽️ Last fed</span><strong>{formatDaysAgo(lastFeedDays)}</strong><small>{data.feedings[0]?.foodType ?? "No meal type recorded"}</small></div>
          <div><span>🐍 Last shed</span><strong>{lastShedDate ? elapsedCalendar(lastShedDate, now) + " ago" : "Not recorded"}</strong><small>{latestShed?.status ?? "No shed record"}</small></div>
          <div><span>📈 Feeding pattern</span><strong>{feedMedian !== null ? `${feedMedian.toFixed(0)} day median` : "Building"}</strong><small>{data.acceptance === null ? "No acceptance baseline" : `${data.acceptance}% accepted`}</small></div>
          <div><span>🔄 Shed rhythm</span><strong>{shedMedian !== null ? `${shedMedian.toFixed(0)} day median` : "Building"}</strong><small>{plural(data.sheds.length, "record")}</small></div>
          <div><span>📋 Recent activity</span><strong>{plural(data.reviewSignals.length, "review flag")}</strong><small>{data.signals.length} total intelligence signal{data.signals.length === 1 ? "" : "s"}</small></div>
        </div>
        <p className="tt-intelligence-meta"><strong>Record coverage is not a health score.</strong> It simply shows how much of this snake's basic profile data is currently available for useful interpretation.</p>
      </section>

      <section className="tt-intelligence-panel tt-profile-signal-list" aria-labelledby="snake-profile-signal-heading">
        <div className="tt-shared-intelligence-header">
          <div>
            <p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p>
            <h2 id="snake-profile-signal-heading" className="tt-intelligence-title">Signals &amp; next actions</h2>
          </div>
          <span className="tt-confidence">Evidence-led · no diagnosis</span>
        </div>
        <div className="tt-profile-signal-grid">
          {data.signals.slice(0, 8).map((signal) => (
            <article key={signal.id} className="tt-profile-signal-card" data-tone={signal.tone}>
              <div className="tt-profile-signal-topline"><span>{signalEmoji(signal.tone)} {signalToneLabel(signal.tone)}</span><span>{signal.confidence}</span></div>
              <h3>{signal.title}</h3>
              <p>{signal.reason}</p>
              {signal.actionLabel && signal.route && <button type="button" className="tt-profile-card-link" onClick={() => go(signal)}>{signal.actionLabel} →</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="tt-intelligence-panel tt-profile-milestones" aria-labelledby="snake-profile-milestone-heading">
        <div className="tt-shared-intelligence-header">
          <div>
            <p className="tt-intelligence-kicker">MILESTONES</p>
            <h2 id="snake-profile-milestone-heading" className="tt-intelligence-title">{snake.name}'s history at a glance</h2>
          </div>
          <button type="button" className="tt-profile-card-link" onClick={() => navigate(`/snakes/${snake.id}/timeline`)}>Open Timeline →</button>
        </div>
        <div className="tt-profile-milestone-grid">
          <div><span>🏁 First weight</span><strong>{firstWeightDate ?? "Not recorded"}</strong></div>
          <div><span>🏆 Highest recorded weight</span><strong>{highestWeight === null ? "Not recorded" : formatWeight(highestWeight)}</strong></div>
          <div><span>📉 Lowest recorded weight</span><strong>{lowestWeight === null ? "Not recorded" : formatWeight(lowestWeight)}</strong></div>
          <div><span>🍽️ First feeding record</span><strong>{firstFeedDate ?? "Not recorded"}</strong></div>
          <div><span>🐍 First shed record</span><strong>{firstShedDate ?? "Not recorded"}</strong></div>
          <div><span>🏠 Time with keeper</span><strong>{elapsedCalendar(snake.arrivalDate, now)}</strong></div>
        </div>
      </section>

      {data.completeness.missing.length > 0 && (
        <section className="tt-intelligence-panel tt-profile-data-completeness" aria-labelledby="snake-profile-completeness-heading">
          <div className="tt-shared-intelligence-header">
            <div>
              <p className="tt-intelligence-kicker">DATA QUALITY</p>
              <h2 id="snake-profile-completeness-heading" className="tt-intelligence-title">Build a stronger individual baseline</h2>
            </div>
            <span className="tt-profile-coverage">{data.completeness.score}%</span>
          </div>
          <p className="tt-intelligence-meta">The missing fields below reduce how much personalised pattern analysis Tiny Titans can perform. Nothing here is a judgement about the snake or the keeper.</p>
          <div className="tt-profile-missing-list">
            {data.completeness.missing.map((item) => <span key={item}>○ {item}</span>)}
          </div>
          <button type="button" className="tt-profile-review-button" onClick={() => navigate(`/snakes/${snake.id}/edit`)}>Update Profile →</button>
        </section>
      )}
    </>
  );
}
