export type EasyNavMode = "standard" | "easy";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TitanWeeklyMetricId = "feed" | "weight" | "shed" | "health" | "behaviour" | "breeding" | "reminders" | "intelligence";
export type TitanAtAGlanceSliceId =
  | "feed" | "weight" | "shed" | "reminders" | "health" | "behaviour" | "husbandry"
  | "intelligence" | "genetics" | "breeding" | "snakes" | "learning" | "community"
  | "room" | "knowledge" | "contribution" | "goals" | "account" | "thisWeek" | "creatorCentre";

export type EasyNavPreferences = {
  mode: EasyNavMode;
  slices: TitanAtAGlanceSliceId[];
  weekStartDay: WeekStartDay;
  weeklyMetrics: TitanWeeklyMetricId[];
};
