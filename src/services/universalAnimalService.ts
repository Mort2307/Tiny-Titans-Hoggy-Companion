import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";
import type { UniversalAnimalRecord, UniversalAnimalStatus } from "../types/UniversalAnimal";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import { getFirebaseErrorDetails, getTinyTitansErrorMessage, TinyTitansAppError } from "../utils/firebaseError";

function animalsCollection(uid: string) {
  return collection(db, "users", uid, "animals");
}

function removeUndefined(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;

    const cleaned: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const cleanedChild = removeUndefined(child);
      if (cleanedChild !== undefined) cleaned[key] = cleanedChild;
    }
    return cleaned;
  }

  return value;
}

function prepareAnimalForFirestore(
  input: Omit<UniversalAnimalRecord, "id" | "ownerUid" | "createdAt" | "updatedAt">,
): Record<string, unknown> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    throw new TinyTitansAppError(
      "ANIMAL_NAME_MISSING",
      "Tiny Titans could not add this animal because the animal name is missing. Enter a name and try again. Error code: ANIMAL_NAME_MISSING",
    );
  }

  const speciesId = typeof input.speciesId === "string" ? input.speciesId.trim() : input.speciesId;
  if (speciesId && !findUniversalSpecies(speciesId)) {
    throw new TinyTitansAppError(
      "SPECIES_ID_INVALID",
      "Tiny Titans could not add this animal because the Species ID is not recognised by the current Tiny Titans species catalogue. Select the species from the catalogue and try again. Error code: SPECIES_ID_INVALID",
    );
  }

  const validSex = ["male", "female", "unknown", "not-applicable"];
  if (!validSex.includes(String(input.sex))) {
    throw new TinyTitansAppError(
      "FIRESTORE_INVALID_DATA",
      "Tiny Titans could not add this animal because the Sex value is invalid. Choose one of the available options and try again. Error code: FIRESTORE_INVALID_DATA",
    );
  }

  const validStatuses: UniversalAnimalStatus[] = ["active", "quarantine", "rehoming", "sold", "deceased", "archived"];
  if (!validStatuses.includes(input.status)) {
    throw new TinyTitansAppError(
      "FIRESTORE_INVALID_DATA",
      "Tiny Titans could not add this animal because the Status value is invalid. Choose one of the available options and try again. Error code: FIRESTORE_INVALID_DATA",
    );
  }

  const cleaned = removeUndefined({
    ...input,
    name,
    speciesId: speciesId || undefined,
  });

  if (!cleaned || typeof cleaned !== "object") {
    throw new TinyTitansAppError(
      "FIRESTORE_INVALID_DATA",
      "Tiny Titans could not prepare this animal record for saving because some information is invalid. Please check the form and try again. Error code: FIRESTORE_INVALID_DATA",
    );
  }

  return cleaned as Record<string, unknown>;
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

function throwAnimalSaveError(action: string, error: unknown, context?: Record<string, unknown>): never {
  const details = getFirebaseErrorDetails(error);
  console.error(`Tiny Titans: ${action} animal failed`, { ...context, firebaseCode: details.code, firebaseMessage: details.message, error });
  throw new Error(
    getTinyTitansErrorMessage(error, `Tiny Titans could not ${action} this animal. Please try again.`),
    { cause: error },
  );
}

export async function getUserAnimals(uid: string): Promise<UniversalAnimalRecord[]> {
  try {
    const ownerUid = await resolveDataOwnerUid(uid);
    const snapshot = await getDocs(query(animalsCollection(ownerUid), orderBy("name")));
    return snapshot.docs.map((item) => normaliseAnimal(item.id, item.data() as Record<string, unknown>));
  } catch (error) {
    throwAnimalSaveError("load", error);
  }
}

export async function getUserAnimal(uid: string, animalId: string): Promise<UniversalAnimalRecord | null> {
  try {
    const ownerUid = await resolveDataOwnerUid(uid);
    const snapshot = await getDoc(doc(db, "users", ownerUid, "animals", animalId));
    return snapshot.exists() ? normaliseAnimal(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
  } catch (error) {
    throwAnimalSaveError("load", error, { animalId });
  }
}

export async function createUserAnimal(
  uid: string,
  input: Omit<UniversalAnimalRecord, "id" | "ownerUid" | "createdAt" | "updatedAt">,
): Promise<UniversalAnimalRecord> {
  try {
    const ownerUid = await resolveDataOwnerUid(uid);
    const preparedInput = prepareAnimalForFirestore(input);
    const timestamp = new Date().toISOString();
    const payload = removeUndefined({
      ...preparedInput,
      ownerUid,
      recordKind: "universal-animal",
      createdAt: timestamp,
      updatedAt: timestamp,
    }) as Record<string, unknown>;

    const ref = await addDoc(animalsCollection(ownerUid), payload);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new TinyTitansAppError(
        "FIRESTORE_FAILED",
        "Tiny Titans saved the animal but could not reload the record. Refresh My Animals before trying again. Error code: FIRESTORE_FAILED",
      );
    }

    return normaliseAnimal(ref.id, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    if (error instanceof TinyTitansAppError) throw error;
    throwAnimalSaveError("add", error);
  }
}

export async function updateUserAnimal(
  uid: string,
  animalId: string,
  patch: Partial<Omit<UniversalAnimalRecord, "id" | "ownerUid" | "createdAt">>,
): Promise<UniversalAnimalRecord> {
  try {
    const ownerUid = await resolveDataOwnerUid(uid);
    const preparedPatch = removeUndefined(patch) as Record<string, unknown>;

    if ("name" in preparedPatch && typeof preparedPatch.name === "string") {
      preparedPatch.name = preparedPatch.name.trim();
      if (!preparedPatch.name) {
        throw new TinyTitansAppError(
          "ANIMAL_NAME_MISSING",
          "Tiny Titans could not update this animal because the animal name is missing. Enter a name and try again. Error code: ANIMAL_NAME_MISSING",
        );
      }
    }

    if ("speciesId" in preparedPatch && preparedPatch.speciesId !== undefined && preparedPatch.speciesId !== null) {
      if (typeof preparedPatch.speciesId !== "string" || !preparedPatch.speciesId.trim()) {
        throw new TinyTitansAppError(
          "SPECIES_ID_MISSING",
          "Tiny Titans could not update this animal because the Species ID is missing. Select a species from the Tiny Titans species catalogue or clear the species selection, then try again. Error code: SPECIES_ID_MISSING",
        );
      }

      preparedPatch.speciesId = preparedPatch.speciesId.trim();
      if (!findUniversalSpecies(String(preparedPatch.speciesId))) {
        throw new TinyTitansAppError(
          "SPECIES_ID_INVALID",
          "Tiny Titans could not update this animal because the Species ID is not recognised by the current Tiny Titans species catalogue. Select the species from the catalogue and try again. Error code: SPECIES_ID_INVALID",
        );
      }
    }

    const ref = doc(db, "users", ownerUid, "animals", animalId);
    await updateDoc(ref, { ...preparedPatch, updatedAt: new Date().toISOString() });

    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new TinyTitansAppError(
        "FIRESTORE_NOT_FOUND",
        "The animal was updated but Tiny Titans could not reload its record. Refresh My Animals before trying again. Error code: FIRESTORE_NOT_FOUND",
      );
    }

    return normaliseAnimal(snapshot.id, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    if (error instanceof TinyTitansAppError) throw error;
    throwAnimalSaveError("update", error, { animalId });
  }
}

export async function deleteUserAnimal(uid: string, animalId: string): Promise<void> {
  try {
    const ownerUid = await resolveDataOwnerUid(uid);
    await deleteDoc(doc(db, "users", ownerUid, "animals", animalId));
  } catch (error) {
    throwAnimalSaveError("delete", error, { animalId });
  }
}
