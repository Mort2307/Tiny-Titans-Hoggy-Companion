import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { RescueAnimal } from "../types/rescue";

export type RescueAnimalIdentityPatch = Pick<RescueAnimal, "name" | "rescueId" | "microchipNumber" | "secondaryIdentifier" | "previousName" | "previousIdentifier" | "speciesCommonName" | "scientificName" | "sex" | "morphOrColour" | "estimatedAge" | "estimatedDob">;

export async function updateRescueAnimalIdentity(id: string, patch: Partial<RescueAnimalIdentityPatch>) {
  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  if (!Object.keys(cleanPatch).length) return;
  await updateDoc(doc(db, "rescueAnimals", id), { ...cleanPatch, updatedAt: new Date().toISOString() });
}

export async function getRescueAnimalIdentity(id: string) {
  const snapshot = await getDoc(doc(db, "rescueAnimals", id));
  return snapshot.exists() ? snapshot.data() as Partial<RescueAnimalIdentityPatch> : null;
}
