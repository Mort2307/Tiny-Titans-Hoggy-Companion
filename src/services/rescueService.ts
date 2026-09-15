import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import type { RescueAccess, RescueAnimal, RescueOrganisation, RescueRole, RescueTimelineEvent } from "../types/rescue";

const organisations = "rescueOrganisations";
const animals = "rescueAnimals";
const publicAnimals = "rescueAnimalPublic";
const now = () => new Date().toISOString();

function roleFor(org: RescueOrganisation, uid: string): RescueRole | null {
  if (org.ownerUid === uid) return "owner";
  if (org.medicalUids.includes(uid)) return "medical";
  if (org.staffUids.includes(uid)) return "staff";
  if (org.fosterUids.includes(uid)) return "foster";
  if (org.viewerUids.includes(uid)) return "viewer";
  return null;
}

export function getRescueAccess(org: RescueOrganisation | null, uid?: string | null): RescueAccess {
  const role = org && uid ? roleFor(org, uid) : null;
  return { role, canViewFullHistory: Boolean(role), canEdit: role === "owner" || role === "manager" || role === "staff" || role === "medical", canManageOrganisation: role === "owner", isMember: Boolean(role) };
}

export async function getOwnedRescueOrganisation(uid: string) {
  const snap = await getDocs(query(collection(db, organisations), where("ownerUid", "==", uid)));
  const item = snap.docs.find((d) => d.data().ownerUid === uid);
  return item ? ({ ...item.data(), id: item.id } as RescueOrganisation) : null;
}

export async function createRescueOrganisation(uid: string, name: string): Promise<RescueOrganisation> {
  const timestamp = now(); const clean = name.trim() || "My Rescue Centre";
  const ref = await addDoc(collection(db, organisations), {
    accountType: "rescue",
    accountStatus: "pilot_pending",
    pilotStatus: "pilot_pending",
    name: clean,
    ownerUid: uid,
    staffUids: [],
    medicalUids: [],
    fosterUids: [],
    viewerUids: [],
    speciesDiscovered: [],
    staffLimit: 5,
    animalLimit: 100,
    storageMbLimit: 512,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return { id: ref.id, accountType: "rescue", accountStatus: "pilot_pending", pilotStatus: "pilot_pending", name: clean, ownerUid: uid, staffUids: [], medicalUids: [], fosterUids: [], viewerUids: [], speciesDiscovered: [], staffLimit: 5, animalLimit: 100, storageMbLimit: 512, createdAt: timestamp, updatedAt: timestamp };
}

export async function getRescueOrganisation(id: string) {
  if (!auth.currentUser) return null;
  try { const snap = await getDoc(doc(db, organisations, id)); return snap.exists() ? ({ ...snap.data(), id: snap.id } as RescueOrganisation) : null; } catch { return null; }
}

export async function listRescueAnimals(organisationId: string) {
  const snap = await getDocs(query(collection(db, animals), where("organisationId", "==", organisationId)));
  return snap.docs.sort((a, b) => String(b.data().updatedAt || "").localeCompare(String(a.data().updatedAt || ""))).map((d) => ({ ...d.data(), id: d.id, timeline: Array.isArray(d.data().timeline) ? d.data().timeline : [] } as RescueAnimal));
}

function publicTimeline(timeline: RescueTimelineEvent[]): Array<Omit<RescueTimelineEvent, "recordedByUid">> {
  return timeline.filter((event) => event.visibility === "public").map((event) => ({ id: event.id, type: event.type, occurredAt: event.occurredAt, title: event.title, summary: event.summary, details: event.details, visibility: event.visibility }));
}

function toPublicAnimal(id: string, data: Record<string, unknown>): RescueAnimal {
  return { id, organisationId: String(data.organisationId || ""), publicPreview: data.publicPreview === true, name: String(data.name || "Rescue animal"), speciesCommonName: String(data.speciesCommonName || "Species awaiting identification"), scientificName: String(data.scientificName || ""), sex: String(data.sex || "Unknown"), morphOrColour: String(data.morphOrColour || ""), estimatedAge: String(data.estimatedAge || ""), status: (data.status as RescueAnimal["status"]) || "in_care", intakeDate: String(data.intakeDate || ""), enclosure: "", publicSummary: String(data.publicSummary || ""), husbandrySummary: "", privateNotes: "", timeline: Array.isArray(data.timeline) ? (data.timeline as RescueTimelineEvent[]) : [], createdAt: String(data.createdAt || ""), updatedAt: String(data.updatedAt || "") };
}

async function getPublicRescueAnimal(id: string) {
  const snap = await getDoc(doc(db, publicAnimals, id));
  if (!snap.exists() || snap.data().publicPreview !== true) return null;
  return toPublicAnimal(snap.id, { ...snap.data(), timeline: publicTimeline(Array.isArray(snap.data().timeline) ? (snap.data().timeline as RescueTimelineEvent[]) : []) });
}

async function syncPublicRescueAnimal(id: string, animal: RescueAnimal) {
  const publicRef = doc(db, publicAnimals, id);
  if (!animal.publicPreview) { await deleteDoc(publicRef).catch(() => undefined); return; }
  await setDoc(publicRef, { organisationId: animal.organisationId, publicPreview: true, name: animal.name, speciesCommonName: animal.speciesCommonName, scientificName: animal.scientificName, sex: animal.sex, morphOrColour: animal.morphOrColour, estimatedAge: animal.estimatedAge, status: animal.status, intakeDate: animal.intakeDate, publicSummary: animal.publicSummary, timeline: publicTimeline(animal.timeline), createdAt: animal.createdAt, updatedAt: animal.updatedAt }, { merge: false });
}

export async function getRescueAnimal(id: string) {
  if (!auth.currentUser) return getPublicRescueAnimal(id);
  try { const snap = await getDoc(doc(db, animals, id)); return snap.exists() ? ({ ...snap.data(), id: snap.id, timeline: Array.isArray(snap.data().timeline) ? snap.data().timeline : [] } as RescueAnimal) : null; } catch { return getPublicRescueAnimal(id); }
}

export async function createRescueAnimal(input: Omit<RescueAnimal, "id" | "createdAt" | "updatedAt" | "timeline">, recordedByUid: string) {
  const timestamp = now(); const intake: RescueTimelineEvent = { id: crypto.randomUUID(), type: "intake", occurredAt: input.intakeDate || timestamp, title: "Rescue intake", summary: "Animal added to the rescue record.", details: input.publicSummary || "Initial intake record.", recordedByUid, visibility: "staff" };
  const ref = doc(collection(db, animals)); const animal = { ...input, timeline: [intake], createdAt: timestamp, updatedAt: timestamp } as RescueAnimal; const batch = writeBatch(db); batch.set(ref, animal);
  if (input.publicPreview) batch.set(doc(db, publicAnimals, ref.id), { organisationId: animal.organisationId, publicPreview: true, name: animal.name, speciesCommonName: animal.speciesCommonName, scientificName: animal.scientificName, sex: animal.sex, morphOrColour: animal.morphOrColour, estimatedAge: animal.estimatedAge, status: animal.status, intakeDate: animal.intakeDate, publicSummary: animal.publicSummary, timeline: [], createdAt: timestamp, updatedAt: timestamp });
  await batch.commit(); return ref.id;
}

export async function updateRescueAnimal(id: string, patch: Partial<Pick<RescueAnimal, "name" | "speciesCommonName" | "scientificName" | "sex" | "morphOrColour" | "estimatedAge" | "status" | "enclosure" | "publicPreview" | "publicSummary" | "husbandrySummary" | "privateNotes">>) {
  await updateDoc(doc(db, animals, id), { ...patch, updatedAt: now() }); const current = await getRescueAnimal(id); if (current) await syncPublicRescueAnimal(id, current);
}

export async function appendRescueTimelineEvent(id: string, event: Omit<RescueTimelineEvent, "id">) {
  const animal = await getRescueAnimal(id); if (!animal) throw new Error("Animal record not found."); const next = { ...event, id: crypto.randomUUID() }; await updateDoc(doc(db, animals, id), { timeline: [next, ...animal.timeline], updatedAt: now() }); const current = await getRescueAnimal(id); if (current) await syncPublicRescueAnimal(id, current); return next.id;
}
