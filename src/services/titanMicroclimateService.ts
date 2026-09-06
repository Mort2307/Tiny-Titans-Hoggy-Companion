import { addDoc, collection, getDocs, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { emitTitanIntelligenceEvent } from "./titanReactiveIntelligenceService";

export interface TitanMicroclimateReading {
  id: string;
  snakeId: string;
  enclosureId?: string;
  temperatureC?: number;
  humidityPercent?: number;
  source: "keeper" | "sensor";
  recordedAt: number;
}

type FirestoreMicroclimate = Omit<TitanMicroclimateReading, "id"> & { recordedAt: number | Timestamp };
function toMillis(value: number | Timestamp): number { return typeof value === "number" ? value : value.toMillis(); }
export async function getTitanMicroclimateReadings(uid: string, snakeId: string): Promise<TitanMicroclimateReading[]> {
  if (!uid || !snakeId) return [];
  const ref = collection(db, "users", uid, "snakes", snakeId, "microclimateReadings");
  const snapshot = await getDocs(query(ref, orderBy("recordedAt", "desc")));
  return snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreMicroclimate;
    return { id: doc.id, snakeId, enclosureId: data.enclosureId, temperatureC: data.temperatureC, humidityPercent: data.humidityPercent, source: data.source, recordedAt: toMillis(data.recordedAt) };
  });
}
export async function addTitanMicroclimateReading(uid: string, snakeId: string, reading: Omit<TitanMicroclimateReading, "id" | "snakeId" | "recordedAt">): Promise<string> {
  if (!uid || !snakeId) throw new Error("A signed-in keeper and snake are required.");
  if (reading.temperatureC === undefined && reading.humidityPercent === undefined) throw new Error("Enter a temperature or humidity reading.");
  const ref = collection(db, "users", uid, "snakes", snakeId, "microclimateReadings");
  const doc = await addDoc(ref, { ...reading, recordedAt: Date.now() });
  emitTitanIntelligenceEvent({ uid, animalId: snakeId, type: "MicroclimateRecorded", action: "created" });
  return doc.id;
}