import { tinyTitansEventBus } from "./tinyTitansEventBus";
import { tinyTitansIntelligenceKernel } from "./tinyTitansIntelligenceKernel";
import { buildLocalInsight, calculateTrend } from "./tinyTitansLocalIntelligence";

type WeightPoint = { value: number; at: string };
const recentWeights = new Map<string, WeightPoint[]>();
let started = false;
let stopKernel: (() => void) | null = null;
let stopWeightHandler: (() => void) | null = null;

function rememberWeight(snakeId: string, point: WeightPoint): WeightPoint[] {
  const points = [...(recentWeights.get(snakeId) ?? []), point]
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-12);
  recentWeights.set(snakeId, points);
  return points;
}

export function startTinyTitansLocalIntelligence(): () => void {
  if (started) return stopTinyTitansLocalIntelligence;
  started = true;

  stopWeightHandler = tinyTitansEventBus.on("WeightRecorded", (event) => {
    const points = rememberWeight(event.payload.snakeId, {
      value: event.payload.weightGrams,
      at: event.payload.occurredAt,
    });
    const trend = calculateTrend(points);
    if (trend.direction === "insufficient-data") return;

    tinyTitansIntelligenceKernel.register("WeightRecorded", () => buildLocalInsight({
      id: `weight-trend-${event.payload.snakeId}-${event.payload.occurredAt}`,
      type: "insight",
      tone: trend.direction === "rising" ? "positive" : trend.direction === "falling" ? "attention" : "neutral",
      title: "Weight trend updated",
      message: trend.direction === "stable"
        ? "Recent recorded weights are broadly stable."
        : `Recent recorded weight is ${trend.direction}. This is a trend signal, not a health diagnosis.`,
      confidence: Math.min(0.95, 0.55 + points.length * 0.03),
      sourceEvents: ["WeightRecorded"],
      actionLabel: "View weights",
      actionRoute: "/weight-records",
      evidence: [
        { label: "Observations", value: String(points.length) },
        { label: "Latest", value: `${event.payload.weightGrams} g` },
      ],
    }));
  });

  stopKernel = tinyTitansIntelligenceKernel.start();
  return stopTinyTitansLocalIntelligence;
}

export function stopTinyTitansLocalIntelligence(): void {
  stopWeightHandler?.();
  stopWeightHandler = null;
  stopKernel?.();
  stopKernel = null;
  recentWeights.clear();
  started = false;
}
