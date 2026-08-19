export type BehaviourObservation =
  | "Exploring"
  | "Burrowing"
  | "Hiding"
  | "Defensive display"
  | "Huffing"
  | "Hooding"
  | "Bluff strike"
  | "Musk"
  | "Thanatosis"
  | "Handling response"
  | "Other";

export type BehaviourContext = "Routine observation" | "Handling" | "After feeding" | "Pre-shed" | "Enclosure change" | "Other";

/** A keeper description, never a diagnosis or fixed temperament label. */
export type BehaviourRecord = {
  id: string;
  snakeId: string;
  date: string;
  observation: BehaviourObservation;
  context: BehaviourContext;
  description: string;
  duration?: string;
  relatedChange?: string;
  notes?: string;
  lastModifiedBy?: string;
};
