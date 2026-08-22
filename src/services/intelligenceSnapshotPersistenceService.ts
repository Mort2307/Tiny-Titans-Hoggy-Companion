import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import { buildIntelligenceSnapshot, type IntelligenceSnapshot } from "./intelligenceMemoryService";
import { buildIntelligenceSnapshotCacheKey, isSameIntelligenceSnapshotKey, type IntelligenceSnapshotCacheKey } from "./intelligenceSnapshotCacheService";

export type PersistedIntelligenceSnapshot = IntelligenceSnapshot & {
  id: string;
  snakeId: string;
  cacheKey: IntelligenceSnapshotCacheKey;
  savedAt?: unknown;
};

function snapshotCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "intelligenceSnapshots", snakeId, "snapshots");
}

export async function getLatestReusableIntelligenceSnapshot(uid: string, snake: Snake, benchmark: CommunityBenchmarkDataset | null): Promise<PersistedIntelligenceSnapshot | null> {
  const key = buildIntelligenceSnapshotCacheKey(snake, benchmark);
  const snapshots = await getDocs(query(snapshotCollection(uid, snake.id), orderBy("generatedAt", "desc"), limit(5)));
  const match = snapshots.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PersistedIntelligenceSnapshot, "id">) })).find((item) => isSameIntelligenceSnapshotKey(item.cacheKey, key));
  return match ?? null;
}

export async function saveIntelligenceSnapshot(uid: string, snake: Snake, benchmark: CommunityBenchmarkDataset | null): Promise<PersistedIntelligenceSnapshot> {
  const cacheKey = buildIntelligenceSnapshotCacheKey(snake, benchmark);
  const snapshot = buildIntelligenceSnapshot(snake, benchmark);
  const snapshotId = `${snapshot.generatedAt.replace(/[^0-9]/g, "").slice(0, 17)}-${cacheKey.sourceFingerprint}-${cacheKey.benchmarkFingerprint}`;
  const payload: PersistedIntelligenceSnapshot = { ...snapshot, id: snapshotId, snakeId: snake.id, cacheKey, savedAt: serverTimestamp() };
  await setDoc(doc(snapshotCollection(uid, snake.id), snapshotId), payload);
  return payload;
}

export async function getOrCreateIntelligenceSnapshot(uid: string, snake: Snake, benchmark: CommunityBenchmarkDataset | null): Promise<PersistedIntelligenceSnapshot> {
  const reusable = await getLatestReusableIntelligenceSnapshot(uid, snake, benchmark);
  if (reusable) return reusable;
  return saveIntelligenceSnapshot(uid, snake, benchmark);
}
