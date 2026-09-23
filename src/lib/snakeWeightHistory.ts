import type { WeightRecord } from "../types/Weight";

export function sortWeightHistory(history: WeightRecord[]): WeightRecord[] {
  return [...history].sort((a, b) => {
    const difference = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (difference === 0) return a.id.localeCompare(b.id);
    return difference;
  });
}

export function buildWeightHistory(snakeId: string, existingHistory: WeightRecord[], startingWeight: number | null, startingWeightDate: string, currentWeight: number | null, lastWeighedDate: string): WeightRecord[] {
  const records: WeightRecord[] = [...(existingHistory ?? [])];
  if (startingWeight !== null && Number.isFinite(startingWeight) && startingWeight > 0 && startingWeightDate) {
    const startingId = `starting-${snakeId}`;
    const startingRecord: WeightRecord = { id: startingId, snakeId, weight: startingWeight, date: startingWeightDate, unit: "g" };
    const existingIndex = records.findIndex((record) => record.id === startingId);
    if (existingIndex >= 0) records[existingIndex] = startingRecord; else records.push(startingRecord);
  }
  if (currentWeight !== null && Number.isFinite(currentWeight) && currentWeight > 0 && lastWeighedDate) {
    const currentId = `current-${snakeId}-${lastWeighedDate}`;
    const currentRecord: WeightRecord = { id: currentId, snakeId, weight: currentWeight, date: lastWeighedDate, unit: "g" };
    const existingIndex = records.findIndex((record) => record.id === currentId);
    if (existingIndex >= 0) records[existingIndex] = currentRecord; else records.push(currentRecord);
  }
  const uniqueRecords = new Map<string, WeightRecord>();
  for (const record of records) {
    const key = record.id || `${record.snakeId}-${record.date}-${record.weight}`;
    uniqueRecords.set(key, { ...record, snakeId, unit: record.unit || "g" });
  }
  return sortWeightHistory(Array.from(uniqueRecords.values()));
}