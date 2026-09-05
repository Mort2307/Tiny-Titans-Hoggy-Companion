export type FoodType =
  | "Pinkie Mouse"
  | "Fuzzy Mouse"
  | "Hopper Mouse"
  | "Adult Mouse"
  | "Rat Pup"
  | "Rat Fuzzy"
  | "Adult Rat"
  | "Rabbit"
  | "Piglet"
  | "Quail"
  | "Other Bird"
  | "Fish"
  | "Amphibian"
  | "Egg"
  | "Reptile Prey"
  | "Invertebrate"
  | "Other";

export type FeedingMethod =
  | "Tongs"
  | "Drop Feed"
  | "Hand Fed"
  | "Scented"
  | "Other";

export type FeedingResponse =
  | "Accepted"
  | "Refused"
  | "Partial"
  | "Regurgitated";

export type FeedingRecord = {
  id: string;
  snakeId: string;
  date: string;
  /** Kept for backwards compatibility with existing Firestore records. */
  foodType: FoodType;
  customFood?: string;
  size?: string;
  /** For one prey item this is its mass; for multiple items it may represent total prey mass. */
  weight?: number;
  /** Number of prey items represented by this feeding event. */
  quantity?: number;
  /** Explicit category retained so analytics do not need to infer diet from display labels. */
  preyCategory?: "rodent" | "lagomorph" | "bird" | "fish" | "amphibian" | "egg" | "reptile" | "invertebrate" | "other";
  feedingMethod?: FeedingMethod;
  response: FeedingResponse;
  notes?: string;
};
