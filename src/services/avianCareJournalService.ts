import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";

export type AvianCareCategory = "weight" | "food-water" | "moult-feathers" | "activity-enrichment" | "droppings" | "welfare" | "other";
export type AvianCareObservation = {
  id: string;
  category: AvianCareCategory;
  observedAt: string;
  note: string;
  weightGrams?: number;
  createdAt: string;
};
export type NewAvianObservation = Pick<AvianCareObservation, "category" | "observedAt" | "note" | "weightGrams">;
const VALID_CATEGORIES: AvianCareCategory[] = ["weight", "food-water", "moult-feathers", "activity-enrichment", "droppings", "welfare", "other"];

function getCollection(ownerUid: string, animalId: string) {
  return collection(db, "users", ownerUid, "animals", animalId, "avianCareObservations");
}
export async function listAvianObservations(uid: string, animalId: string): Promise<AvianCareObservation[]> {
  const ownerUid = await resolveDataOwnerUid(uid);
  const snapshots = await getDocs(query(getCollection(ownerUid, animalId), orderBy("observedAt", "desc")));
  return snapshots.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      category: VALID_CATEGORIES.includes(data.category) ? data.category as AvianCareCategory : "other",
      observedAt: String(data.observedAt || ""),
      createdAt: String(data.createdAt || ""),
      note: String(data.note || ""),
      weightGrams: typeof data.weightGrams === "number" && Number.isFinite(data.weightGrams) ? data.weightGrams : undefined,
    };
  });
}
export async function addAvianObservation(uid: string, animalId: string, value: NewAvianObservation): Promise<string> {
  if (!VALID_CATEGORIES.includes(value.category)) throw new Error("Choose a recognised bird observation category.");
  const trimmed = value.note.trim();
  if (!trimmed && value.category !== "weight") throw new Error("Add a short observation before saving.");
  if (trimmed.length > 3000) throw new Error("Keep the observation under 3,000 characters.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.observedAt) || !Number.isFinite(Date.parse(value.observedAt + "T00:00:00Z"))) {
    throw new Error("Choose a valid observation date.");
  }
  const weight = value.weightGrams;
  if (value.category === "weight" && (weight === undefined || !Number.isFinite(weight) || weight <= 0 || weight > 500000)) {
    throw new Error("Enter a positive bird weight in grams.");
  }
  const ownerUid = await resolveDataOwnerUid(uid);
  const record = await addDoc(getCollection(ownerUid, animalId), {
    category: value.category,
    observedAt: value.observedAt,
    note: trimmed,
    ...(value.category === "weight" ? { weightGrams: weight } : {}),
    createdAt: new Date().toISOString(),
  });
  return record.id;
}
export async function deleteAvianObservation(uid: string, animalId: string, entryId: string): Promise<void> {
  const ownerUid = await resolveDataOwnerUid(uid);
  await deleteDoc(doc(getCollection(ownerUid, animalId), entryId));
}
