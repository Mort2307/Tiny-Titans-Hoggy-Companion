import type { TitanV50RuntimeInput, TitanV50RuntimeResult } from "./titanV50Runtime";
import { runTitanV50 } from "./titanV50Runtime";

interface CacheEntry {
  key: string;
  createdAt: number;
  result: TitanV50RuntimeResult;
}

const DEFAULT_TTL_MS = 15_000;
const MAX_ENTRIES = 20;
const cache = new Map<string, CacheEntry>();

function stableList(values: readonly string[] | undefined): string {
  return [...(values ?? [])].sort().join(",");
}

function inputKey(input: TitanV50RuntimeInput): string {
  return JSON.stringify({
    counts: input.counts,
    staleAreas: stableList(input.staleAreas),
    recentEventTypes: stableList(input.recentEventTypes),
    animalId: input.animalId ?? "",
    speciesId: input.speciesId ?? "",
    hasGeneticRecords: Boolean(input.hasGeneticRecords),
    hasBreedingProjects: Boolean(input.hasBreedingProjects),
    hasEnclosures: Boolean(input.hasEnclosures),
    hasBehaviourRecords: Boolean(input.hasBehaviourRecords),
    hasLearningActivity: Boolean(input.hasLearningActivity),
    hasCommunityActivity: Boolean(input.hasCommunityActivity),
  });
}

function prune(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > DEFAULT_TTL_MS) cache.delete(key);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    cache.delete(oldestKey);
  }
}

/**
 * Small in-memory cache for deterministic intelligence. It is intentionally
 * bounded and short-lived so stale recommendations cannot persist indefinitely.
 */
export function getCachedTitanV50(input: TitanV50RuntimeInput): TitanV50RuntimeResult {
  const now = Date.now();
  prune(now);
  const key = inputKey(input);
  const existing = cache.get(key);
  if (existing && now - existing.createdAt <= DEFAULT_TTL_MS) {
    cache.delete(key);
    cache.set(key, existing);
    return existing.result;
  }

  const result = runTitanV50(input);
  cache.set(key, { key, createdAt: now, result });
  prune(now);
  return result;
}

export function clearTitanV50Cache(): void {
  cache.clear();
}

export function getTitanV50CacheSize(): number {
  prune(Date.now());
  return cache.size;
}
