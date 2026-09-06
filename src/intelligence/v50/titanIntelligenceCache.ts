import type { TitanV50UnifiedInput, TitanV50UnifiedResult } from "./titanV50UnifiedRuntime";
import { runTitanV50Unified } from "./titanV50UnifiedRuntime";

interface CacheEntry {
  key: string;
  createdAt: number;
  result: TitanV50UnifiedResult;
}

const DEFAULT_TTL_MS = 15_000;
const MAX_ENTRIES = 20;
const cache = new Map<string, CacheEntry>();

function stableList(values: readonly string[] | undefined): string {
  return [...(values ?? [])].sort().join(",");
}

function inputKey(input: TitanV50UnifiedInput): string {
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
    eventType: input.eventType ?? "",
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

export function getCachedTitanV50(input: TitanV50UnifiedInput): TitanV50UnifiedResult {
  const now = Date.now();
  prune(now);
  const key = inputKey(input);
  const existing = cache.get(key);
  if (existing && now - existing.createdAt <= DEFAULT_TTL_MS) {
    cache.delete(key);
    cache.set(key, existing);
    return existing.result;
  }

  const result = runTitanV50Unified(input);
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
