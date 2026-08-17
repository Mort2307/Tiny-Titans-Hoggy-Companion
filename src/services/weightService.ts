import { collection, deleteDoc, doc, getDocs, query, setDoc } from "firebase/firestore";
import type { WeightRecord } from "../types/Weight";
import { db } from "../firebase/config";

function getWeightCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "weights");
}

function normalise(record: WeightRecord, snakeId: string): WeightRecord {
  return { ...record, id: record.id, snakeId };
}

export async function getSnakeWeights(uid: string, snakeId: string): Promise<WeightRecord[]> {
  const snapshot = await getDocs(query(getWeightCollection(uid, snakeId)));
  return snapshot.docs
    .map((weightDoc) => normalise({ ...(weightDoc.data() as WeightRecord), id: weightDoc.id }, snakeId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveSnakeWeight(uid: string, record: WeightRecord): Promise<WeightRecord> {
  const weight = normalise(record, record.snakeId);
  if (!weight.id) throw new Error("Cannot save a weight record without an ID.");
  await setDoc(doc(getWeightCollection(uid, weight.snakeId), weight.id), weight, { merge: true });
  return weight;
}

export async function deleteSnakeWeight(uid: string, snakeId: string, weightId: string): Promise<void> {
  await deleteDoc(doc(getWeightCollection(uid, snakeId), weightId));
}

export async function migrateEmbeddedWeights(uid: string, snakeId: string, records: WeightRecord[]): Promise<WeightRecord[]> {
  const existing = await getSnakeWeights(uid, snakeId);
  const existingIds = new Set(existing.map((record) => record.id));
  const existingFallbackKeys = new Set(existing.map((record) => `${record.date}|${record.weight}|${record.unit || "g"}`));
  const candidates = records.filter((record) => {
    const fallbackKey = `${record.date}|${record.weight}|${record.unit || "g"}`;
    return !existingIds.has(record.id) && !existingFallbackKeys.has(fallbackKey);
  });
  if (candidates.length) {
    await Promise.all(candidates.map((record) => saveSnakeWeight(uid, normalise(record, snakeId))));
  }
  return getSnakeWeights(uid, snakeId);
}
