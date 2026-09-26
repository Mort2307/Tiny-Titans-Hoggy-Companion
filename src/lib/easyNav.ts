import type { EasyNavMode, TitanAtAGlanceSliceId, TitanWeeklyMetricId, WeekStartDay } from "../types/easyNav";
import {
  DEFAULT_SLICES, DEFAULT_WEEK_START, DEFAULT_WEEKLY_METRICS, MAX_SLICES, MAX_WEEKLY_METRICS,
  MIN_SLICES, MIN_WEEKLY_METRICS, TITAN_AT_A_GLANCE_OPTIONS, TITAN_WEEKLY_METRIC_OPTIONS,
} from "../config/easyNav";

export function sanitiseMode(value: unknown): EasyNavMode {
  // Quick View is the canonical navigation mode. Legacy saved values are normalised here.\n  return "easy";
}

export function sanitiseWeekStart(value: unknown): WeekStartDay {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
    ? value as WeekStartDay
    : DEFAULT_WEEK_START;
}

export function sanitiseSlices(value: unknown, creatorAccess: boolean): TitanAtAGlanceSliceId[] {
  if (!Array.isArray(value)) return DEFAULT_SLICES;
  const allowed = new Set(
    TITAN_AT_A_GLANCE_OPTIONS
      .filter((option) => creatorAccess || !option.creatorOnly)
      .map((option) => option.id),
  );
  const result = [
    ...new Set(
      value.filter(
        (item): item is TitanAtAGlanceSliceId =>
          typeof item === "string" && allowed.has(item as TitanAtAGlanceSliceId),
      ),
    ),
  ].slice(0, MAX_SLICES);
  return result.length < MIN_SLICES ? DEFAULT_SLICES : result;
}

export function sanitiseWeeklyMetrics(value: unknown): TitanWeeklyMetricId[] {
  if (!Array.isArray(value)) return DEFAULT_WEEKLY_METRICS;
  const allowed = new Set(TITAN_WEEKLY_METRIC_OPTIONS.map((option) => option.id));
  const result = [
    ...new Set(
      value.filter(
        (item): item is TitanWeeklyMetricId =>
          typeof item === "string" && allowed.has(item as TitanWeeklyMetricId),
      ),
    ),
  ].slice(0, MAX_WEEKLY_METRICS);
  return result.length < MIN_WEEKLY_METRICS ? DEFAULT_WEEKLY_METRICS : result;
}

export function defaultEasyNavPreferences(): {
  mode: EasyNavMode;
  slices: TitanAtAGlanceSliceId[];
  weekStartDay: WeekStartDay;
  weeklyMetrics: TitanWeeklyMetricId[];
} {
  return {
    mode: "easy",
    slices: [...DEFAULT_SLICES],
    weekStartDay: DEFAULT_WEEK_START,
    weeklyMetrics: [...DEFAULT_WEEKLY_METRICS],
  };
}

export function sanitiseEasyNavPreferences(
  value: unknown,
  creatorAccess: boolean,
): {
  mode: EasyNavMode;
  slices: TitanAtAGlanceSliceId[];
  weekStartDay: WeekStartDay;
  weeklyMetrics: TitanWeeklyMetricId[];
} {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    mode: sanitiseMode(record.mode),
    slices: sanitiseSlices(record.slices, creatorAccess),
    weekStartDay: sanitiseWeekStart(record.weekStartDay),
    weeklyMetrics: sanitiseWeeklyMetrics(record.weeklyMetrics),
  };
}
