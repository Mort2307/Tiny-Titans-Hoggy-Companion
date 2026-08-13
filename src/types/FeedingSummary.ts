export interface FeedingSummary {
  snakeId: string;
  totalMeals: number;
  successfulMeals: number;
  refusedMeals: number;
  partialMeals: number;
  regurgitatedMeals: number;
  acceptanceRate: number | null;
  averagePreyWeightG: number | null;
  averagePreyWidthMm: number | null;
  averagePreyLengthMm: number | null;
  lastFeedingDate: string | null;
  daysSinceLastFeeding: number | null;
  weighedMealCount: number;
  dimensionedMealCount: number;
}
