import type { TitanContextSnapshot, TitanIntelligenceResult, TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";

export interface TitanRecordCounts {
  snakes: number;
  weights: number;
  feedings: number;
  sheds: number;
  health: number;
  behaviour: number;
  husbandry: number;
  breeding: number;
}

export interface TitanProactiveInput {
  counts: TitanRecordCounts;
  staleAreas?: readonly string[];
  recentEventTypes?: readonly string[];
  animalId?: string;
  speciesId?: string;
}

const now = () => Date.now();

function signal(id: string, title: string, message: string, severity: TitanSignal["severity"], destination: string, confidence = 0.9): TitanSignal {
  return {
    id,
    title,
    message,
    severity,
    confidence,
    actionPath: destination,
    createdAt: now(),
  };
}

function recommendation(id: string, title: string, reason: string, destination: string, priority: number, confidence = 0.9): TitanRecommendation {
  return { id, title, reason, destination, priority, confidence };
}

/**
 * Deterministic first-pass proactive intelligence. It intentionally reasons only
 * from counts and explicit context supplied by the caller. No clinical, genetic
 * or behavioural claim is inferred from missing data.
 */
export function buildTitanProactiveIntelligence(input: TitanProactiveInput): TitanIntelligenceResult {
  const staleAreas = [...(input.staleAreas ?? [])];
  const recentEventTypes = [...(input.recentEventTypes ?? [])];
  const signals: TitanSignal[] = [];
  const recommendations: TitanRecommendation[] = [];

  if (input.counts.snakes === 0) {
    recommendations.push(recommendation("add-first-titan", "Add your first Tiny Titan", "Tiny Titans can personalise the keeper command centre once an animal record exists.", "/snakes/new", 100, 1));
  }

  if (input.counts.snakes > 0 && input.counts.weights === 0) {
    signals.push(signal("no-weight-baseline", "No weight baseline yet", "A weight record gives Tiny Titans a starting point for future growth history. This is a record-keeping prompt, not a health judgement.", "notice", "/weights", 0.99));
    recommendations.push(recommendation("record-weight-baseline", "Record a baseline weight", "No weight record is currently present for this collection.", "/weights", 90, 0.99));
  }

  if (input.counts.snakes > 0 && input.counts.feedings === 0) {
    recommendations.push(recommendation("record-first-feeding", "Start the feeding history", "A feeding entry lets later pattern tools work from actual keeper records rather than assumptions.", "/feeding", 70, 0.98));
  }

  if (input.counts.snakes > 0 && input.counts.sheds === 0) {
    recommendations.push(recommendation("record-first-shed", "Start the shed history", "Shed records become useful only when real observations accumulate.", "/shedding", 50, 0.98));
  }

  staleAreas.slice(0, 3).forEach((area, index) => {
    recommendations.push(recommendation(`stale-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, `Review ${area}`, `This area has been marked stale by the caller. Tiny Titans is surfacing it rather than assuming why it is stale.`, "/", 60 - index, 0.95));
  });

  if (recentEventTypes.includes("FeedingRecorded") && input.counts.weights > 0) {
    signals.push(signal("feeding-weight-context", "New feeding data can add context", "A recent feeding record and an existing weight history can be considered together by downstream pattern tools.", "info", "/snakes", 0.92));
  }

  if (recentEventTypes.includes("WeightRecorded") && input.counts.feedings > 0) {
    signals.push(signal("weight-feeding-context", "Weight history just became more useful", "A new weight record can be interpreted alongside recorded feeding history without treating either as a diagnosis.", "info", "/weights", 0.92));
  }

  const context: TitanContextSnapshot = {
    animalId: input.animalId,
    speciesId: input.speciesId,
    recentEventTypes,
    incompleteTasks: recommendations.map((item) => item.title),
    staleAreas,
    relevantRoutes: ["/", "/snakes", "/weights", "/feeding", "/shedding", "/husbandry"],
    generatedAt: now(),
  };

  return { signals, recommendations, context, generatedAt: now() };
}
