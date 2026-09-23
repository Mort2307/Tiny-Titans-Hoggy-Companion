import type { FoodType, FeedingMethod, FeedingResponse } from "../../types/Feeding";
import type { PreyCategory } from "./speciesDiet";

export const feedingMethods: FeedingMethod[] = ["Tongs", "Drop Feed", "Hand Fed", "Scented", "Other"];
export const feedingResponses: FeedingResponse[] = ["Accepted", "Refused", "Partial", "Regurgitated"];
export const responseEmoji: Record<FeedingResponse, string> = { Accepted: "✅", Refused: "❌", Partial: "⚠️", Regurgitated: "🔴" };
export const responseCopy: Record<FeedingResponse, string> = { Accepted: "Accepted", Refused: "Refused", Partial: "Partial", Regurgitated: "Regurgitated" };
export const categoryByFood: Record<FoodType, PreyCategory> = {
  "Pinkie Mouse": "rodent", "Fuzzy Mouse": "rodent", "Hopper Mouse": "rodent", "Adult Mouse": "rodent",
  "Rat Pup": "rodent", "Rat Fuzzy": "rodent", "Adult Rat": "rodent", Rabbit: "lagomorph", Piglet: "other",
  Quail: "bird", "Other Bird": "bird", Fish: "fish", Amphibian: "amphibian", Egg: "egg", "Reptile Prey": "reptile",
  Invertebrate: "invertebrate", Other: "other",
};