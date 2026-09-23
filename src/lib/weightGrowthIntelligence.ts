import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { benchmarkIsUsable, confidenceLabel, type BenchmarkMetric } from "../services/benchmarkIntelligenceService";

export type Trend = { delta: number; days: number; weekly: number; label: "Rising" | "Falling" | "Stable" };
export type WeightContext = { tone: "positive" | "neutral" | "caution"; title: string; body: string; detail: string };

export const toTime = (date: string) => new Date(`${date}T12:00:00`).getTime();
export const daysBetween = (a: string, b: string) => Math.round(Math.abs(toTime(b) - toTime(a)) / 86400000);

export function calculateAgeMonths(hatchDate?: string, now = new Date()): number | null {
  if (!hatchDate) return null;
  const parsed = new Date(`${hatchDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed > now) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / 2629800000);
}

export function calculateWeightTrend(history: WeightRecord[]): Trend | null {
  if (history.length < 2) return null;
  const previous = history[history.length - 2];
  const latest = history[history.length - 1];
  const days = daysBetween(previous.date, latest.date);
  const delta = latest.weight - previous.weight;
  const weekly = days ? (delta / days) * 7 : 0;
  return {
    delta,
    days,
    weekly,
    label: Math.abs(weekly) < 0.25 ? "Stable" : weekly > 0 ? "Rising" : "Falling",
  };
}

export function formatSigned(value: number, formatter: (grams: number) => string) {
  return `${value >= 0 ? "+" : ""}${formatter(value)}`;
}

export function metricSummary(
  metric: BenchmarkMetric,
  currentWeight: number,
  formatWeight: (grams: number) => string,
) {
  if (!benchmarkIsUsable(metric) || metric.median == null) return null;
  const distance = currentWeight - metric.median;
  const rangeText =
    metric.lowerQuartile != null && metric.upperQuartile != null
      ? `${formatWeight(metric.lowerQuartile)}–${formatWeight(metric.upperQuartile)}`
      : "the available dataset";
  let position = "near the dataset median";
  if (metric.upperQuartile != null && currentWeight > metric.upperQuartile) position = "above the dataset's upper quartile";
  else if (metric.lowerQuartile != null && currentWeight < metric.lowerQuartile) position = "below the dataset's lower quartile";
  else if (distance > 0) position = "above the dataset median";
  else if (distance < 0) position = "below the dataset median";
  return { position, rangeText, confidence: confidenceLabel(metric.confidence) };
}

export function buildWeightContext(
  snake: Snake,
  currentWeight: number,
  ageMonths: number | null,
  formatWeight: (grams: number) => string,
): WeightContext {
  if (!snake.sex || currentWeight <= 0 || ageMonths == null) {
    return {
      tone: "neutral",
      title: "Weight context needs a little more information",
      body: "Add an accurate hatch date and sex so Tiny Titans can place this weight in the right developmental context.",
      detail: "Without age and sex, the app should not label a weight as too low or too high.",
    };
  }

  const sex = snake.sex.trim().toLowerCase();
  const isMale = sex === "male" || sex.endsWith(" male") || sex.includes(" male ");
  const isFemale = sex === "female" || sex.endsWith(" female") || sex.includes(" female ");
  const adultRange = isMale ? { min: 60, max: 133 } : isFemale ? { min: 180, max: 300 } : null;
  const sexLabel = isMale ? "male" : isFemale ? "female" : "recorded-sex";

  if (!adultRange) {
    return {
      tone: "neutral",
      title: "Sex-specific context is unavailable",
      body: "Tiny Titans can still assess this Titan's personal trend, but the available published weight reference is sex-specific.",
      detail: "Use body condition and the individual growth trajectory alongside the recorded weight.",
    };
  }

  if (ageMonths < 6) {
    const juvenileMean = 12.02;
    const juvenileSd = 3.38;
    const bandLow = juvenileMean - juvenileSd;
    const bandHigh = juvenileMean + juvenileSd;
    if (currentWeight < bandLow) {
      return {
        tone: "caution",
        title: "Below the broad band seen in a juvenile study",
        body: `${formatWeight(currentWeight)} is below roughly ${formatWeight(bandLow)} based on a published juvenile study mean of 12.02 g (SD 3.38 g).`,
        detail: "That study involved 3–4-month-old snakes and is a research reference, not a minimum healthy weight. Keep the individual trend and body condition in view.",
      };
    }
    if (currentWeight > bandHigh) {
      return {
        tone: "positive",
        title: "Above the juvenile study mean — not automatically a concern",
        body: `${formatWeight(currentWeight)} is above the approximate mean±SD band from a published juvenile study.`,
        detail: "Being larger than a research cohort does not by itself mean a juvenile is overweight; individual growth varies.",
      };
    }
    return {
      tone: "positive",
      title: "Within the juvenile study's broad mean±SD band",
      body: `${formatWeight(currentWeight)} sits around the published juvenile study mean of 12.02 g (SD 3.38 g).`,
      detail: "This is useful context, not a target or clinical reference interval.",
    };
  }

  if (ageMonths < 12) {
    return {
      tone: "positive",
      title: `${formatWeight(currentWeight)} is plausible for a growing ${sexLabel} juvenile`,
      body: "There is no validated universal 6–12 month weight interval for Western hognoses. Tiny Titans therefore uses the individual trend rather than inventing an age target.",
      detail: "A steady upward trend with appropriate body condition is more informative than trying to hit a single number.",
    };
  }

  if (ageMonths < 24) {
    if (currentWeight >= adultRange.min) {
      return {
        tone: "positive",
        title: `${formatWeight(currentWeight)} is already within the published adult ${sexLabel} weight range`,
        body: `The published 3-year ${sexLabel} study included weights from ${formatWeight(adultRange.min)} to ${formatWeight(adultRange.max)}.`,
        detail: `At ${Math.round(ageMonths)} months, reaching the adult study's observed range can be reassuring, but it still is not an age-specific target.`,
      };
    }
    return {
      tone: "positive",
      title: `${formatWeight(currentWeight)} is below the adult ${sexLabel} study range — but that does not mean underweight`,
      body: `The adult reference study observed ${sexLabel}s from ${formatWeight(adultRange.min)} to ${formatWeight(adultRange.max)} at 3 years old.`,
      detail: `This Titan is still subadult, so being below the adult study floor at ${Math.round(ageMonths)} months cannot by itself be classed as too small. The recorded growth trajectory matters.`,
    };
  }

  if (currentWeight < adultRange.min) {
    return {
      tone: "caution",
      title: `Below the published adult ${sexLabel} study range`,
      body: `At ${Math.round(ageMonths)} months, ${formatWeight(currentWeight)} is below the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in 3-year-old ${sexLabel}s.`,
      detail: "That is a useful prompt to review body condition, feeding history and the wider husbandry picture. Weight alone cannot diagnose underweight.",
    };
  }
  if (currentWeight > adultRange.max) {
    return {
      tone: "caution",
      title: `Above the published adult ${sexLabel} study range`,
      body: `At ${Math.round(ageMonths)} months, ${formatWeight(currentWeight)} is above the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in the 3-year-old study.`,
      detail: "This identifies an unusually high recorded weight relative to that study, not a diagnosis of excess body condition. Check body condition and trend.",
    };
  }
  return {
    tone: "positive",
    title: `Within the published adult ${sexLabel} study range`,
    body: `${formatWeight(currentWeight)} sits inside the ${formatWeight(adultRange.min)}–${formatWeight(adultRange.max)} range observed in 3-year-old ${sexLabel}s.`,
    detail: "This is a broad research reference, not a perfect weight target for every adult.",
  };
}
