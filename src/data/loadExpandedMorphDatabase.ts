let expandedMorphDatabasePromise: Promise<unknown> | null = null;

/**
 * Defers the extended morph/combo registries until a feature that needs the
 * expanded registry is opened. The modules still mutate the canonical
 * registries exactly as before; this only changes when that work happens.
 */
export function loadExpandedMorphDatabase(): Promise<unknown> {
  if (!expandedMorphDatabasePromise) {
    expandedMorphDatabasePromise = Promise.all([
      import("./expandMorphDatabase"),
      import("./expandGeneticsComboRegistry"),
    ]);
  }
  return expandedMorphDatabasePromise;
}
