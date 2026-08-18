import type { Snake } from "../types/Snake";

export type IntelligenceConfidence = "low" | "moderate" | "high";
export type IntelligenceInsightStatus = "positive" | "informational" | "attention";

export type SnakeIntelligenceInsight = {
  id: string;
  status: IntelligenceInsightStatus;
  title: string;
  detail: string;
  reason: string;
  confidence: IntelligenceConfidence;
  domains: string[];
};

const DAY = 86_400_000;

function validDates(values: string[]): number[] {
  return values.map((value) => new Date(value).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
}

function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(a - b) / DAY);
}

function confidence(recordCount: number, spanDays: number, consistent: boolean): IntelligenceConfidence {
  if (recordCount >= 8 && spanDays >= 56 && consistent) return "high";
  if (recordCount >= 4 && spanDays >= 21) return "moderate";
  return "low";
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Cross-domain, deterministic intelligence for one snake.
 * It only interprets recorded user data and deliberately stays quiet when evidence is weak.
 */
export function getSnakeIntelligenceInsights(snake: Snake): SnakeIntelligenceInsight[] {
  const weights = snake.weightHistory ?? [];
  const feeds = snake.feedingHistory ?? [];
  const sheds = snake.shedHistory ?? [];
  const events = [
    ...weights.map((record) => record.date),
    ...feeds.map((record) => record.date),
    ...sheds.map((record) => record.date),
  ];
  const dates = validDates(events);
  const spanDays = dates.length > 1 ? daysBetween(dates[0], dates.at(-1) as number) : 0;
  const insights: SnakeIntelligenceInsight[] = [];

  if (!dates.length) {
    return [{
      id: "baseline-start",
      status: "informational",
      title: "Building this snake's baseline",
      detail: `Record routine weights, feeds or sheds for ${snake.name} and Tiny Titans can begin learning their individual pattern.`,
      reason: "There is not enough historical data yet to make a personalised trend claim.",
      confidence: "low",
      domains: ["data quality"],
    }];
  }

  if (weights.length >= 2) {
    const ordered = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = ordered[0]?.weight;
    const latest = ordered.at(-1)?.weight;
    if (typeof first === "number" && typeof latest === "number" && first > 0) {
      const change = latest - first;
      const percent = (change / first) * 100;
      const recentDates = validDates(ordered.slice(-4).map((record) => record.date));
      const recentSpan = recentDates.length > 1 ? daysBetween(recentDates[0], recentDates.at(-1) as number) : 0;
      const consistent = ordered.length >= 4 && ordered.slice(-4).every((record, index, records) => index === 0 || typeof record.weight === "number" && record.weight >= (records[index - 1]?.weight ?? record.weight));
      const level = confidence(weights.length, spanDays, consistent);
      insights.push({
        id: "weight-trajectory",
        status: change >= 0 ? "positive" : "informational",
        title: change >= 0 ? "Weight trend is moving upward" : "Weight has moved down across the recorded period",
        detail: `${snake.name} has changed ${Math.abs(change).toFixed(1)}g (${Math.abs(percent).toFixed(1)}%) across the recorded weight history.`,
        reason: `This compares ${snake.name} with their own recorded weights, not a generic target weight.${recentSpan ? ` The latest ${Math.min(4, ordered.length)} records span ${recentSpan} days.` : ""}`,
        confidence: level,
        domains: ["weight", "growth"],
      });
    }
  }

  if (feeds.length >= 3) {
    const feedDates = validDates(feeds.map((record) => record.date));
    const intervals = feedDates.slice(1).map((date, index) => (date - feedDates[index]) / DAY);
    const typical = median(intervals);
    const latestFeed = feedDates.at(-1);
    const weightDate = validDates(weights.map((record) => record.date)).at(-1);
    if (typical !== null && latestFeed !== undefined) {
      const gap = (Date.now() - latestFeed) / DAY;
      const weightContext = weightDate !== undefined ? ` The latest recorded weight is ${Math.round((Date.now() - weightDate) / DAY)} days old.` : " No recent weight is available to add another context signal.";
      if (gap > Math.max(typical * 2.5, typical + 14)) {
        insights.push({
          id: "feeding-gap",
          status: "attention",
          title: "Feeding gap differs from this snake's recent pattern",
          detail: `No feeding has been recorded for ${Math.floor(gap)} days; the recent recorded median interval is ${Math.round(typical)} days.`,
          reason: `This is based on ${feeds.length} feeding records.${weightContext} It is an observation, not a diagnosis or instruction to feed immediately.`,
          confidence: confidence(feeds.length, spanDays, intervals.every((value) => value > 0)),
          domains: ["feeding", "weight"],
        });
      }
    }
  }

  if (sheds.length >= 3) {
    const shedDates = validDates(sheds.map((record) => record.date));
    const intervals = shedDates.slice(1).map((date, index) => (date - shedDates[index]) / DAY);
    const typical = median(intervals);
    const latest = intervals.at(-1);
    if (typical !== null && latest !== undefined && latest > typical * 1.75) {
      insights.push({
        id: "shed-interval",
        status: "informational",
        title: "Recent shed interval is longer than this snake's usual recorded interval",
        detail: `The latest interval is about ${Math.round(latest)} days versus a recorded median of ${Math.round(typical)} days.`,
        reason: `The comparison uses ${sheds.length} recorded sheds from ${snake.name}'s own history.`,
        confidence: confidence(sheds.length, spanDays, intervals.every((value) => value > 0)),
        domains: ["shed", "history"],
      });
    }
  }

  if (!insights.length) {
    insights.push({
      id: "no-actionable-change",
      status: "positive",
      title: "No meaningful change detected",
      detail: `${snake.name}'s available records do not currently show a strong deviation worth surfacing.`,
      reason: "Tiny Titans stays quiet when the available evidence does not support a useful alert.",
      confidence: confidence(dates.length, spanDays, true),
      domains: ["history"],
    });
  }

  return insights;
}
