import type { IntelligenceSnapshot } from "./intelligenceMemoryService";

/** Bump this when intelligence calculation rules materially change. */
export const CURRENT_INTELLIGENCE_ENGINE_VERSION = "1.0.0";

export type VersionedIntelligenceSnapshot = IntelligenceSnapshot & {
  engineVersion: string;
};

export function versionSnapshot(snapshot: IntelligenceSnapshot): VersionedIntelligenceSnapshot {
  return { ...snapshot, engineVersion: CURRENT_INTELLIGENCE_ENGINE_VERSION };
}

export function isSnapshotCurrent(snapshot: Partial<VersionedIntelligenceSnapshot> | null | undefined): boolean {
  return Boolean(snapshot?.engineVersion && snapshot.engineVersion === CURRENT_INTELLIGENCE_ENGINE_VERSION);
}

export function snapshotNeedsRecalculation(snapshot: Partial<VersionedIntelligenceSnapshot> | null | undefined): boolean {
  return !isSnapshotCurrent(snapshot);
}

export function explainVersionChange(previous: Partial<VersionedIntelligenceSnapshot> | null | undefined): string | null {
  if (!previous?.engineVersion) return null;
  if (previous.engineVersion === CURRENT_INTELLIGENCE_ENGINE_VERSION) return null;
  return `This assessment was generated with intelligence engine ${previous.engineVersion}. Tiny Titans can recalculate it using engine ${CURRENT_INTELLIGENCE_ENGINE_VERSION}.`;
}
