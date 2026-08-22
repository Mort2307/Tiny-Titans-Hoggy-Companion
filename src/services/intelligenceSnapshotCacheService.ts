import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import { CURRENT_INTELLIGENCE_ENGINE_VERSION } from "./intelligenceVersionService";

export type IntelligenceSnapshotCacheKey = {
  engineVersion: string;
  sourceFingerprint: string;
  benchmarkFingerprint: string;
};

function stable(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0");
}

export function buildIntelligenceSnapshotCacheKey(snake: Snake, benchmark: CommunityBenchmarkDataset | null): IntelligenceSnapshotCacheKey {
  const source = stable({
    id: snake.id,
    weightHistory: snake.weightHistory ?? [],
    feedingHistory: snake.feedingHistory ?? [],
    shedHistory: snake.shedHistory ?? [],
    environmentHistory: snake.environmentHistory ?? [],
    healthHistory: snake.healthHistory ?? [],
    notes: snake.notes ?? "",
  });
  const benchmarkSource = stable(benchmark ?? null);
  return {
    engineVersion: CURRENT_INTELLIGENCE_ENGINE_VERSION,
    sourceFingerprint: hash(source),
    benchmarkFingerprint: hash(benchmarkSource),
  };
}

export function isSameIntelligenceSnapshotKey(a: IntelligenceSnapshotCacheKey | null | undefined, b: IntelligenceSnapshotCacheKey): boolean {
  return Boolean(a && a.engineVersion === b.engineVersion && a.sourceFingerprint === b.sourceFingerprint && a.benchmarkFingerprint === b.benchmarkFingerprint);
}
