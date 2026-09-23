import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";
import type { UniversalAnimalRecord, UniversalAnimalStatus } from "../types/UniversalAnimal";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";

function animalsCollection(uid: string) {
  return collection(db, "users", uid, "animals");
}

function normaliseAnimal(id: string, data: Record<string, unknown>): UniversalAnimalRecord {
  const speciesId = typeof data.speciesId === "string" && data.speciesId.trim() ? data.speciesId.trim() : undefined;
  const species = speciesId ? findUniversalSpecies(speciesId) : undefined;
  return {
    id,
    ownerUid: String(data.ownerUid || ""),
    name: String(data.name || "Unnamed animal"),
    speciesId,
    speciesCommonName: String(data.speciesCommonName || species?.commonNames[0] || "") || undefined,
    scientificName: String(data.scientificName || species?.acceptedScientificName || "") || undefined,
    animalGroup: String(data.animalGroup || species?.className || "") || undefined,
    sex: ["male", "female", "unknown", "not-applicable"].includes(String(data.sex)) ? data.sex as UniversalAnimalRecord["sex"] : "unknown",
    status: ["active", "quarantine", "rehoming", "sold", "deceased", "archived"].includes(String(data.status)) ? data.status as UniversalAnimalStatus : "active",
    morphOrColour: String(data.morphOrColour || "") || undefined,
    origin: String(data.origin || "") || undefined,
    breederOrSource: String(data.breederOrSource || "") || undefined,
    acquisitionDate: String(data.acquisitionDate || "") || undefined,
    hatchOrBirthDate: String(data.hatchOrBirthDate || "") || undefined,
    identifier: String(data.identifier || "") || undefined,
    notes: String(data.notes || "") || undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((value): value is string => typeof value === "string").slice(0, 30) : [],
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

export async function getUserAnimals(uid: string): Promise<UniversalAnimalRecord[]> {
  const ownerUid = await resolveDataOwnerUid(uid);
  const snapshot = await getDocs(query(animalsCollection(ownerUid), orderBy("name")));
  return snapshot.docs.map((item) => normaliseAnimal(item.id, item.data() as Record<string, unknown>));
}

export async function getUserAnimal(uid: string, animalId: string): Promise<UniversalAnimalRecord | null> {
  const ownerUid = await resolveDataOwnerUid(uid);
  const snapshot = await getDoc(doc(db, "users", ownerUid, "animals", animalId));
  return snapshot.exists() ? normaliseAnimal(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export async function createUserAnimal(uid: string, input: Omit<UniversalAnimalRecord, "id" | "ownerUid" | "createdAt" | "updatedAt">): Promise<UniversalAnimalRecord> {
  const ownerUid = await resolveDataOwnerUid(uid);
  const timestamp = new Date().toISOString();
  const payload = {
    ...input,
    ownerUid,
    recordKind: "universal-animal",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const ref = await addDoc(animalsCollection(ownerUid), payload);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("Tiny Titans saved the animal but could not reload the record.");
  return normaliseAnimal(ref.id, snapshot.data() as Record<string, unknown>);
}

export async function updateUserAnimal(uid: string, animalId: string, patch: Partial<Omit<UniversalAnimalRecord, "id" | "ownerUid" | "createdAt">>): Promise<UniversalAnimalRecord> {
  const ownerUid = await resolveDataOwnerUid(uid);
  const ref = doc(db, "users", ownerUid, "animals", animalId);
  await updateDoc(ref, { ...patch, updatedAt: new Date().toISOString() });
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("The animal record could not be reloaded after saving.");
  return normaliseAnimal(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function deleteUserAnimal(uid: string, animalId: string): Promise<void> {
  const ownerUid = await resolveDataOwnerUid(uid);
  await deleteDoc(doc(db, "users", ownerUid, "animals", animalId));
}
