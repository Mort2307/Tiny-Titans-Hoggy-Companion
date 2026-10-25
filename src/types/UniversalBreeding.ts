/** An observation, not an assertion that a species reproduces by any particular method. */
export type UniversalBreedingEventKind =
  | "courtship" | "pairing" | "eggs" | "live-birth" | "offspring"
  | "development" | "moult" | "nesting" | "health" | "other";

export interface UniversalBreedingEvent {
  id: string;
  projectId: string;
  speciesId: string;
  kind: UniversalBreedingEventKind;
  recordedAt: string;
  /** Observed count, never a predicted clutch or litter size. */
  quantity?: number;
  /** Optional observed phenotype or local breeder terminology; not confirmed genetics. */
  observedVariation?: string;
  notes?: string;
  createdAt: string;
}

export const UNIVERSAL_BREEDING_EVENTS: Array<{ kind: UniversalBreedingEventKind; label: string }> = [
  { kind: "courtship", label: "Courtship / reproductive behaviour" },
  { kind: "pairing", label: "Pairing / observed contact" },
  { kind: "nesting", label: "Nesting / reproductive preparation" },
  { kind: "eggs", label: "Eggs / egg case / egg mass" },
  { kind: "live-birth", label: "Live birth" },
  { kind: "offspring", label: "Offspring observed" },
  { kind: "development", label: "Development / instar / metamorphosis" },
  { kind: "moult", label: "Moult / emergence" },
  { kind: "health", label: "Health or welfare observation" },
  { kind: "other", label: "Other observation" },
];
