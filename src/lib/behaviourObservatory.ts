import type { KeeperObservationConfidence } from "../types/keeperObservation";
import { getBehaviourCategory } from "../data/behaviourTaxonomy";

export const BEHAVIOUR_CONTEXTS = [
  "Feeding",
  "Handling",
  "Shedding",
  "Enclosure change",
  "Environmental change",
  "Breeding",
  "Exploration",
  "Unknown",
] as const;

export const CONFIDENCE_LABELS: Record<KeeperObservationConfidence, string> = {
  unsure: "Not sure",
  "fairly-confident": "Fairly confident",
  "very-confident": "Very confident",
};

export function behaviourCategoryLabel(value: string): string {
  return getBehaviourCategory(value)?.label ?? "Observation";
}
