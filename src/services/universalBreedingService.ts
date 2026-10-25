import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";
import { requestFamilyMutation } from "./familyPermissionsService";
import { emitTitanIntelligenceEvent } from "./titanReactiveIntelligenceService";
import type { UniversalBreedingEvent } from "../types/UniversalBreeding";

function eventCollection(uid: string, projectId: string) {
  return collection(db, "users", uid, "breedingProjects", projectId, "events");
}

/** Uses the existing per-user breedingProjects hierarchy and family permission boundary. */
export async function getUniversalBreedingEvents(uid: string, projectId: string): Promise<UniversalBreedingEvent[]> {
  const owner = await resolveDataOwnerUid(uid);
  const snapshot = await getDocs(eventCollection(owner, projectId));
  return snapshot.docs
    .map((entry) => entry.data() as UniversalBreedingEvent)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export async function saveUniversalBreedingEvent(uid: string, event: UniversalBreedingEvent): Promise<void> {
  if (!event.projectId || !event.speciesId || !event.id) throw new Error("Project, species and event IDs are required.");
  if (!event.recordedAt || Number.isNaN(Date.parse(event.recordedAt))) throw new Error("A valid observation date is required.");
  if (event.quantity !== undefined && (!Number.isInteger(event.quantity) || event.quantity < 0)) {
    throw new Error("Observed quantity must be a non-negative whole number.");
  }
  const owner = await resolveDataOwnerUid(uid);
  const reference = doc(eventCollection(owner, event.projectId), event.id);
  const payload = {
    ...event,
    lastModifiedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await requestFamilyMutation({
    requesterUid: uid,
    requesterName: uid,
    area: "breeding",
    action: "create",
    title: "Record an animal breeding observation",
    description: "A family member wants to add a recorded observation to a shared breeding project.",
    targetPath: reference.path,
    operation: "create",
    data: payload,
  });
  await setDoc(reference, payload);
  emitTitanIntelligenceEvent({ uid, type: "BreedingProjectChanged", action: "updated" });
}
