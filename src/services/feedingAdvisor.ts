import type { FeedingRecord } from "../types/Feeding";
import type { Snake } from "../types/Snake";

export type FeedingAdvisorConfidence = "High" | "Moderate" | "Low" | "Insufficient data";
export type FeedingAdvisorStatus = "Recommended" | "Review" | "Caution" | "Insufficient data";

export type FeedingAdvisorResult = {
  status: FeedingAdvisorStatus;
  confidence: FeedingAdvisorConfidence;
  suggestedPreyRangeGrams: { min: number; max: number } | null;
  suggestedIntervalDays: { min: number; max: number } | null;
  reasons: string[];
  warnings: string[];
  guardrails: string[];
};

function daysBetween(a: string, b: string): number {
  const first = new Date(`${a}T00:00:00`).getTime();
  const second = new Date(`${b}T00:00:00`).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 0;
  return Math.max(0, Math.round(Math.abs(second - first) / 86_400_000));
}

function ageInDays(hatchDate?: string): number | null {
  if (!hatchDate) return null;
  const value = daysBetween(hatchDate, new Date().toISOString().slice(0, 10));
  return value > 0 ? value : null;
}

function successfulMeals(feedings: FeedingRecord[]): FeedingRecord[] {
  return feedings
    .filter((record) => record.response === "Accepted" && typeof record.weight === "number" && record.weight > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getFeedingAdvisor(
  snake: Snake,
  feedings: FeedingRecord[],
): FeedingAdvisorResult {
  const weight = snake.weight;
  const meals = [...feedings].sort((a, b) => b.date.localeCompare(a.date));
  const successful = successfulMeals(meals);
  const guardrails = [
    "Prey should not be selected from body weight alone.",
    "For Western hognoses, prey dimensions matter: the prey should not be wider than the snake can safely accommodate; when uncertain, choose smaller.",
    "A prey-weight recommendation is only a historical comparison, not a universal target percentage.",
    "The advisor is husbandry guidance, not a veterinary diagnosis.",
  ];

  if (!weight || weight <= 0 || successful.length < 2) {
    return {
      status: "Insufficient data",
      confidence: "Insufficient data",
      suggestedPreyRangeGrams: null,
      suggestedIntervalDays: null,
      reasons: [
        "At least a current body weight and two successful weighed meals are required before an individual prey-weight range is suggested.",
      ],
      warnings: [],
      guardrails,
    };
  }

  const recentSuccessful = successful.slice(0, 5);
  const mealWeights = recentSuccessful.map((meal) => meal.weight as number);
  const averageMeal = mealWeights.reduce((sum, value) => sum + value, 0) / mealWeights.length;
  const minimumMeal = Math.min(...mealWeights);
  const maximumMeal = Math.max(...mealWeights);

  const acceptedDates = recentSuccessful.map((meal) => meal.date);
  const intervals: number[] = [];
  for (let index = 0; index < acceptedDates.length - 1; index += 1) {
    const interval = daysBetween(acceptedDates[index], acceptedDates[index + 1]);
    if (interval > 0) intervals.push(interval);
  }

  const averageInterval = intervals.length
    ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    : null;

  const dimensionedMeals = recentSuccessful.filter(
    (meal) => typeof meal.preyWidthMm === "number" && meal.preyWidthMm > 0,
  );
  const averagePreyWidth = dimensionedMeals.length
    ? dimensionedMeals.reduce((sum, meal) => sum + (meal.preyWidthMm as number), 0) / dimensionedMeals.length
    : null;

  const ageDays = ageInDays(snake.hatchDate);
  const reasons = [
    `Based primarily on ${recentSuccessful.length} recent successful weighed meals (${minimumMeal.toFixed(1)}–${maximumMeal.toFixed(1)} g).`,
    `Average successful meal in the current history is ${averageMeal.toFixed(1)} g.`,
  ];
  const warnings: string[] = [];

  if (averagePreyWidth !== null) {
    reasons.push(`Recent successful prey averaged ${averagePreyWidth.toFixed(1)} mm in recorded width; keep prey-width fit as the physical guardrail.`);
  } else {
    warnings.push("Prey width has not been recorded for recent meals. Record prey dimensions before relying heavily on the size recommendation.");
  }

  const recentRefusals = meals.slice(0, 4).filter((meal) => meal.response === "Refused").length;
  const recentRegurgitations = meals.slice(0, 4).filter((meal) => meal.response === "Regurgitated").length;

  if (recentRegurgitations > 0) {
    warnings.push("A recent regurgitation is recorded. Do not increase prey size; review husbandry and seek veterinary advice if repeated or concerning.");
  }

  if (recentRefusals >= 2) {
    warnings.push("Two or more of the four most recent recorded meals were refused. Do not compensate by automatically increasing prey size.");
  }

  if (ageDays !== null && ageDays < 180) {
    reasons.push("The snake is under approximately six months old, so growth and feeding frequency should be reviewed more closely rather than using an adult schedule.");
  } else if (ageDays !== null) {
    reasons.push("Age is included as context, but the advisor does not assume a fixed schedule from age alone.");
  }

  if (averageInterval !== null) {
    reasons.push(`Recent successful meals averaged ${averageInterval.toFixed(0)} days apart.`);
  }

  const status: FeedingAdvisorStatus = warnings.some((warning) => warning.includes("regurgitation"))
    ? "Caution"
    : warnings.length
      ? "Review"
      : "Recommended";
  const confidence: FeedingAdvisorConfidence = successful.length >= 4 && intervals.length >= 2 && dimensionedMeals.length >= 2
    ? "High"
    : successful.length >= 2
      ? "Moderate"
      : "Low";

  return {
    status,
    confidence,
    suggestedPreyRangeGrams: {
      min: Number(minimumMeal.toFixed(1)),
      max: Number(maximumMeal.toFixed(1)),
    },
    suggestedIntervalDays: averageInterval
      ? {
          min: Math.max(3, Math.floor(averageInterval - 2)),
          max: Math.ceil(averageInterval + 2),
        }
      : null,
    reasons,
    warnings,
    guardrails,
  };
}
