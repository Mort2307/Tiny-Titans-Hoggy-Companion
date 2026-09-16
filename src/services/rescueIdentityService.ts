import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { RescueAnimal } from "../types/rescue";

export type RescueAnimalIdentityPatch = Pick<RescueAnimal, "name" | "rescueId" | "microchipNumber" | "secondaryIdentifier" | "previousName" | "previousIdentifier" | "speciesCommonName" | "scientificName" | "sex" | "morphOrColour" | "estimatedAge" | "estimatedDob">;

export async function updateRescueAnimalIdentity(id: string, patch: Partial<RescueAnimalIdentityPatch>) {
  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  if (!Object.keys(cleanPatch).length) return;
  const animalRef = doc(db, "rescueAnimals", id);
  await updateDoc(animalRef, { ...cleanPatch, updatedAt: new Date().toISOString() });
  const snapshot = await getDoc(animalRef);
  if (!snapshot.exists() || snapshot.data().publicPreview !== true) return;
  const data = snapshot.data();
  await setDoc(doc(db, "rescueAnimalPublic", id), {
    organisationId: String(data.organisationId || ""),
    publicPreview: true,
    name: String(data.name || ""),
    rescueId: String(data.rescueId || "") || "",
    secondaryIdentifier: String(data.secondaryIdentifier || "") || "",
    speciesCommonName: String(data.speciesCommonName || ""),
    scientificName: String(data.scientificName || ""),
    sex: String(data.sex || "Unknown"),
    morphOrColour: String(data.morphOrColour || ""),
    estimatedAge: String(data.estimatedAge || ""),
    status: String(data.status || "in_care"),
    intakeDate: String(data.intakeDate || ""),
    publicSummary: String(data.publicSummary || ""),
    timeline: Array.isArray(data.timeline) ? data.timeline.filter((event) => event && event.visibility === "public") : [],
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || "")
  }, { merge: false });
}

export async function getRescueAnimalIdentity(id: string) {
  const snapshot = await getDoc(doc(db, "rescueAnimals", id));
  return snapshot.exists() ? snapshot.data() as Partial<RescueAnimalIdentityPatch> : null;
}
