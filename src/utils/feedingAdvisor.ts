export type FeedingRecord = {
  date: string;
  preyWeightGrams: number;
  preyType?: string;
  successful: boolean;
};

export type FeedingAdviceInput = {
  currentWeightGrams: number;
  recentMeals: FeedingRecord[];
};

export type FeedingAdvice = {
  status: "insufficient-data" | "review" | "suggestion";
  minGrams?: number;
  maxGrams?: number;
  confidence: "none" | "low" | "medium" | "high";
  reasons: string[];
};

/**
 * Conservative foundation for the Individual Feeding Advisor.
 * It deliberately refuses to manufacture a recommendation when individual
 * history is insufficient. Final husbandry rules should be reviewed before
 * exposing this as a keeper-facing recommendation.
 */
export function getFeedingAdvice(input: FeedingAdviceInput): FeedingAdvice {
  const meals = input.recentMeals
    .filter((meal) => meal.successful && Number.isFinite(meal.preyWeightGrams) && meal.preyWeightGrams > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!Number.isFinite(input.currentWeightGrams) || input.currentWeightGrams <= 0 || meals.length < 3) {
    return {
      status: "insufficient-data",
      confidence: "none",
      reasons: ["At least three successful, measured individual meals and a current body weight are required."],
    };
  }

  const recent = meals.slice(0, 5).map((meal) => meal.preyWeightGrams);
  const min = Math.min(...recent);
  const max = Math.max(...recent);

  return {
    status: "suggestion",
    minGrams: Number(min.toFixed(1)),
    maxGrams: Number(max.toFixed(1)),
    confidence: meals.length >= 5 ? "high" : "medium",
    reasons: [
      "Range is derived from this individual's successful measured meals.",
      "Morph/genetics are not used to infer feeding requirements.",
      "Keeper and veterinary judgement remain more important than an automated suggestion.",
    ],
  };
}
