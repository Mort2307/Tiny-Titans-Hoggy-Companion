import type { SnakeMasterRecord, DataConfidence } from "./snakeMasterRecord";
import { getSnakeMasterRecord } from "./snakeMasterRecord";

export type IntelligenceTone = "positive" | "neutral" | "attention";
export type IntelligenceConfidence = "High" | "Moderate" | "Low" | "Insufficient";

export type SnakeInsight = {
  id: string;
  title: string;
  value: string;
  why: string;
  action: string;
  tone: IntelligenceTone;
  confidence: IntelligenceConfidence;
  category: "weight" | "feeding" | "shedding" | "behaviour" | "health" | "data" | "activity";
};

export type IntelligenceMetric = {
  key: "weight" | "feeding" | "shedding" | "behaviour" | "health";
  label: string;
  percent: number;
  records: number;
  recordsForFullCoverage: number;
};

export type SnakeIntelligence = {
  snakeId: string;
  snakeName: string;
  /** Overall reliability of the engine's current interpretation. This is never a keeper rating or health score. */
  confidence: DataConfidence;
  /** Percentage of the core personal-history dataset currently available to the engine. */
  dataCoveragePercent: number;
  /** Transparent breakdown behind dataCoveragePercent. */
  coverageMetrics: IntelligenceMetric[];
  /** User-facing definition that can be shown beside the confidence value. */
  confidenceExplanation: string;
  insights: SnakeInsight[];
  priority: SnakeInsight | null;
  summary: string;
  generatedAt: string;
};

function confidenceRank(value: IntelligenceConfidence): number {
  return value === "High" ? 4 : value === "Moderate" ? 3 : value === "Low" ? 2 : 1;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = average(values);
  if (mean === null || mean === 0) return null;
  const variance = average(values.map((value) => (value - mean) ** 2));
  return variance === null ? null : Math.sqrt(variance) / Math.abs(mean);
}

function dateSpanDays(dates: string[]): number {
  const valid = dates.map((date) => new Date(`${date}T00:00:00`).getTime()).filter(Number.isFinite);
  if (valid.length < 2) return 0;
  return Math.round((Math.max(...valid) - Math.min(...valid)) / 86_400_000);
}

function feedingIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.feedings].map((item) => item.date).filter(Boolean).sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function shedIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.sheds].map((item) => item.date).filter(Boolean).sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function buildCoverageMetrics(record: SnakeMasterRecord): IntelligenceMetric[] {
  const definitions: Array<[IntelligenceMetric["key"], string, number, number]> = [
    ["weight", "Weight", record.weights.length, 5],
    ["feeding", "Feeding", record.feedings.length, 8],
    ["shedding", "Shedding", record.sheds.length, 5],
    ["behaviour", "Behaviour", record.behaviours.length, 5],
    ["health", "Health", record.health.length, 3],
  ];

  return definitions.map(([key, label, records, recordsForFullCoverage]) => ({
    key,
    label,
    records,
    recordsForFullCoverage,
    percent: Math.round(Math.min(records / recordsForFullCoverage, 1) * 100),
  }));
}

/**
 * Coverage measures how much useful individual-history data exists.
 * Confidence is deliberately different: it measures how trustworthy the
 * resulting pattern is based on amount, spread, recency and consistency.
 */
function calculateDataCoverage(metrics: IntelligenceMetric[]): number {
  return Math.round(metrics.reduce((sum, metric) => sum + metric.percent, 0) / metrics.length);
}

function confidenceFromScore(score: number): DataConfidence {
  if (score >= 78) return "High";
  if (score >= 52) return "Moderate";
  if (score >= 25) return "Low";
  return "Insufficient";
}

function calculateEvidenceConfidence(record: SnakeMasterRecord, coveragePercent: number): DataConfidence {
  const datedSets = [record.weights, record.feedings, record.sheds].map((items) => items.map((item) => item.date).filter(Boolean));
  const recordCounts = datedSets.map((dates) => dates.length);
  const totalRecords = recordCounts.reduce((sum, count) => sum + count, 0);
  if (totalRecords < 3 || coveragePercent < 20) return "Insufficient";

  const spans = datedSets.map(dateSpanDays);
  const spanScore = Math.min(20, (Math.max(...spans, 0) / 90) * 20);
  const volumeScore = Math.min(30, totalRecords * 1.5);

  const weightValues = record.weights.map((item) => item.weight).filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const feedingConsistency = coefficientOfVariation(feedingIntervals(record));
  const shedConsistency = coefficientOfVariation(shedIntervals(record));
  const weightConsistency = coefficientOfVariation(weightValues);
  const consistencyValues = [feedingConsistency, shedConsistency, weightConsistency].filter((value): value is number => value !== null);
  const consistencyScore = consistencyValues.length
    ? Math.max(0, 25 - Math.min(25, average(consistencyValues.map((value) => Math.min(value, 2)))! * 12.5))
    : 8;

  const recencyDates = datedSets.flat().map((date) => new Date(`${date}T00:00:00`).getTime()).filter(Number.isFinite);
  const newest = recencyDates.length ? Math.max(...recencyDates) : 0;
  const ageDays = newest ? Math.max(0, (Date.now() - newest) / 86_400_000) : 9999;
  const recencyScore = ageDays <= 30 ? 15 : ageDays <= 90 ? 10 : ageDays <= 180 ? 5 : 0;

  return confidenceFromScore(Math.min(100, coveragePercent * 0.4 + volumeScore + spanScore + consistencyScore + recencyScore));
}

function buildConfidenceExplanation(confidence: DataConfidence): string {
  if (confidence === "High") {
    return "Intelligence Confidence measures how reliably Tiny Titans can interpret the recorded data. High means the available records have enough quantity, history, recency and consistency to support a strong pattern. It is not a rating of your keeping ability, your snake's health, or you as a keeper.";
  }
  if (confidence === "Moderate") {
    return "Intelligence Confidence measures how reliably Tiny Titans can interpret the recorded data. Moderate means useful patterns are present, but the history, consistency or time span is not yet strong enough for high confidence. It is not a rating of your keeping ability, your snake's health, or you as a keeper.";
  }
  if (confidence === "Low") {
    return "Intelligence Confidence measures how reliably Tiny Titans can interpret the recorded data. Low means the engine can see some evidence but should remain cautious because the dataset is limited, recent or inconsistent. It is not a rating of your keeping ability, your snake's health, or you as a keeper.";
  }
  return "Intelligence Confidence measures how reliably Tiny Titans can interpret the recorded data. More useful history is needed before Tiny Titans can make a confident interpretation. It is not a rating of your keeping ability, your snake's health, or you as a keeper.";
}

function buildInsights(record: SnakeMasterRecord): SnakeInsight[] {
  const { snake, overview, weights, feedings, sheds, behaviours, health } = record;
  const insights: SnakeInsight[] = [];

  if (weights.length >= 2 && overview.weightChangeG !== null && overview.weightChangePercent !== null) {
    const recent = weights.slice(0, Math.min(4, weights.length));
    const recentDelta = recent.length >= 2 ? recent[0].weight - recent[recent.length - 1].weight : overview.weightChangeG;
    const direction = recentDelta > 0 ? "upward" : recentDelta < 0 ? "downward" : "stable";
    insights.push({
      id: "weight-trend",
      title: "Individual weight trend",
      value: `${direction} · ${overview.weightChangeG >= 0 ? "+" : ""}${overview.weightChangeG.toFixed(1)}g overall`,
      why: `Calculated from ${weights.length} canonical weight records for ${snake.name}. Tiny Titans is comparing this snake with its own recorded history rather than a generic target weight.`,
      action: "Continue recording weights at a consistent interval so the personal trend becomes more reliable.",
      tone: direction === "downward" ? "attention" : direction === "upward" ? "positive" : "neutral",
      confidence: overview.confidence.weight,
      category: "weight",
    });
  }

  if (feedings.length >= 2 && overview.acceptanceRate !== null) {
    const intervals = feedingIntervals(record);
    const avgInterval = average(intervals);
    const recentRefusals = feedings.slice(0, 4).filter((item) => item.response !== "Accepted").length;
    insights.push({
      id: "feeding-pattern",
      title: "Individual feeding pattern",
      value: `${overview.acceptanceRate}% accepted${avgInterval !== null ? ` · ${avgInterval.toFixed(1)}d average` : ""}`,
      why: `Derived from ${feedings.length} feeding records for ${snake.name}${recentRefusals ? `, including ${recentRefusals} non-accepted recent record${recentRefusals === 1 ? "" : "s"}` : ""}.`,
      action: recentRefusals > 0 ? "Keep recording accepted and refused meals before changing the routine; a small cluster alone does not establish a problem." : "Keep recording every meal so Tiny Titans can distinguish normal variation from a meaningful change.",
      tone: recentRefusals >= 2 ? "attention" : overview.acceptanceRate >= 80 ? "positive" : "neutral",
      confidence: overview.confidence.feeding,
      category: "feeding",
    });
  }

  if (sheds.length >= 2) {
    const intervals = shedIntervals(record);
    const avgInterval = average(intervals);
    insights.push({
      id: "shed-pattern",
      title: "Individual shed rhythm",
      value: avgInterval === null ? "Building pattern" : `${avgInterval.toFixed(1)}d average interval`,
      why: `Derived from ${sheds.length} recorded sheds for ${snake.name}. This describes the animal's own recorded rhythm rather than declaring a universal shed schedule.`,
      action: "Continue recording completed sheds and useful observations to strengthen the personal baseline.",
      tone: "neutral",
      confidence: overview.confidence.shedding,
      category: "shedding",
    });
  }

  if (behaviours.length > 0) {
    const latest = behaviours[0];
    insights.push({ id: "behaviour-context", title: "Latest behaviour observation", value: latest.observation, why: `Recorded for ${snake.name} in the context of ${latest.context.toLowerCase()}. Tiny Titans describes the observation rather than assigning a fixed temperament or cause.`, action: "Continue recording context and any relevant changes; a pattern is more useful than a single observation.", tone: "neutral", confidence: overview.confidence.behaviour, category: "behaviour" });
  }

  const dueFollowUp = health.filter((item) => item.followUpDate && item.followUpDate <= new Date().toISOString().slice(0, 10) && item.status !== "Recovered").sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)))[0];
  if (dueFollowUp) {
    insights.push({ id: "health-follow-up", title: "Health follow-up is due", value: dueFollowUp.followUpDate ?? "Due", why: `A follow-up was recorded for “${dueFollowUp.title}”. Tiny Titans is surfacing the keeper's own plan, not making a medical assessment.`, action: "Review the record and follow the agreed veterinary plan, or update the record if circumstances have changed.", tone: "attention", confidence: overview.confidence.health, category: "health" });
  }

  const missingAreas = [overview.confidence.weight, overview.confidence.feeding, overview.confidence.shedding, overview.confidence.behaviour, overview.confidence.health].filter((value) => value === "Insufficient");
  if (missingAreas.length > 0) {
    const missing = missingAreas.length === 3 ? "weight, feeding and shed" : missingAreas.length === 2 ? "two key history areas" : "one key history area";
    insights.push({
      id: "data-baseline",
      title: "Build the individual baseline",
      value: "More history needed",
      why: `${snake.name} does not yet have enough recorded ${missing} data for Tiny Titans to make stronger individual comparisons.`,
      action: "Log the next relevant event rather than trying to fill in old history from memory. Real records improve the intelligence over time.",
      tone: "attention",
      confidence: overview.confidence.overall,
      category: "data",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "getting-started",
      title: "Learning this snake",
      value: "Collecting baseline data",
      why: "Tiny Titans intentionally avoids generic conclusions when this snake has too little personal history.",
      action: "Start with a weight, feeding record or shed record to give the intelligence engine something real to work with.",
      tone: "neutral",
      confidence: "Insufficient",
      category: "data",
    });
  }

  return insights;
}

export function buildSnakeIntelligence(record: SnakeMasterRecord): SnakeIntelligence {
  const coverageMetrics = buildCoverageMetrics(record);
  const dataCoveragePercent = calculateDataCoverage(coverageMetrics);
  const confidence = calculateEvidenceConfidence(record, dataCoveragePercent);
  const insights = buildInsights(record);
  const priority = [...insights].sort((a, b) => {
    const toneWeight = (value: IntelligenceTone) => value === "attention" ? 3 : value === "positive" ? 1 : 2;
    return toneWeight(b.tone) - toneWeight(a.tone) || confidenceRank(b.confidence) - confidenceRank(a.confidence);
  })[0] ?? null;

  const summary = priority?.tone === "attention"
    ? `${record.snake.name} has something worth reviewing, but Tiny Titans will not assume a cause without enough evidence.`
    : priority?.tone === "positive"
      ? `${record.snake.name}'s recorded history currently shows a useful, measurable pattern.`
      : `${record.snake.name}'s history is being tracked against its own baseline.`;

  return {
    snakeId: record.snake.id,
    snakeName: record.snake.name,
    confidence,
    dataCoveragePercent,
    coverageMetrics,
    confidenceExplanation: buildConfidenceExplanation(confidence),
    insights,
    priority,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSnakeIntelligence(uid: string, snakeId: string): Promise<SnakeIntelligence | null> {
  const record = await getSnakeMasterRecord(uid, snakeId);
  return record ? buildSnakeIntelligence(record) : null;
}

export async function getDashboardIntelligence(uid: string, snakeIds: string[]): Promise<SnakeIntelligence[]> {
  const results = await Promise.all(snakeIds.map((snakeId) => getSnakeIntelligence(uid, snakeId).catch(() => null)));
  return results.filter((result): result is SnakeIntelligence => Boolean(result));
}
