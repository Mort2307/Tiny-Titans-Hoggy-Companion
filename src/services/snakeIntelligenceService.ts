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
  category: "weight" | "feeding" | "shedding" | "data" | "activity";
};

export type SnakeIntelligence = {
  snakeId: string;
  snakeName: string;
  confidence: DataConfidence;
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

function feedingIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.feedings]
    .map((item) => item.date)
    .filter(Boolean)
    .sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function shedIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.sheds]
    .map((item) => item.date)
    .filter(Boolean)
    .sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function buildInsights(record: SnakeMasterRecord): SnakeInsight[] {
  const { snake, overview, weights, feedings, sheds } = record;
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

  const missingAreas = [overview.confidence.weight, overview.confidence.feeding, overview.confidence.shedding].filter((value) => value === "Insufficient");
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
    confidence: record.overview.confidence.overall,
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
