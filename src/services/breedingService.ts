import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { BreedingPairing, BreedingProject, EggClutch, HatchlingRecord } from "../types/Breeding";

function projectsCollection(uid: string) { return collection(db, "users", uid, "breedingProjects"); }
function projectDoc(uid: string, projectId: string) { return doc(db, "users", uid, "breedingProjects", projectId); }
function pairingsCollection(uid: string, projectId: string) { return collection(projectDoc(uid, projectId), "pairings"); }
function clutchCollection(uid: string, projectId: string) { return collection(projectDoc(uid, projectId), "clutches"); }
function hatchlingsCollection(uid: string, projectId: string) { return collection(projectDoc(uid, projectId), "hatchlings"); }

export async function getBreedingProjects(uid: string): Promise<BreedingProject[]> { const snapshot = await getDocs(query(projectsCollection(uid), orderBy("updatedAt", "desc"))); return snapshot.docs.map((item) => item.data() as BreedingProject); }
export async function getBreedingProject(uid: string, projectId: string): Promise<BreedingProject | null> { const snapshot = await getDoc(projectDoc(uid, projectId)); return snapshot.exists() ? (snapshot.data() as BreedingProject) : null; }
export async function saveBreedingProject(uid: string, project: BreedingProject): Promise<void> { const reference = projectDoc(uid, project.id); const existing = await getDoc(reference); await setDoc(reference, { ...project, updatedAt: serverTimestamp(), ...(existing.exists() ? {} : { createdAt: serverTimestamp() }) }, { merge: true }); }

export async function deleteBreedingProject(uid: string, projectId: string): Promise<void> {
  const [pairings, clutches, hatchlings] = await Promise.all([
    getDocs(pairingsCollection(uid, projectId)),
    getDocs(clutchCollection(uid, projectId)),
    getDocs(hatchlingsCollection(uid, projectId)),
  ]);
  await Promise.all([
    ...pairings.docs.map((item) => deleteDoc(item.ref)),
    ...clutches.docs.map((item) => deleteDoc(item.ref)),
    ...hatchlings.docs.map((item) => deleteDoc(item.ref)),
  ]);
  await deleteDoc(projectDoc(uid, projectId));
}

export async function getBreedingPairings(uid: string, projectId: string): Promise<BreedingPairing[]> { const snapshot = await getDocs(query(pairingsCollection(uid, projectId), orderBy("pairingDate", "desc"))); return snapshot.docs.map((item) => item.data() as BreedingPairing); }
export async function getBreedingPairing(uid: string, projectId: string, pairingId: string): Promise<BreedingPairing | null> { const snapshot = await getDoc(doc(pairingsCollection(uid, projectId), pairingId)); return snapshot.exists() ? (snapshot.data() as BreedingPairing) : null; }
export async function saveBreedingPairing(uid: string, projectId: string, pairing: BreedingPairing): Promise<void> { await setDoc(doc(pairingsCollection(uid, projectId), pairing.id), { ...pairing, updatedAt: serverTimestamp() }, { merge: true }); }
export async function deleteBreedingPairing(uid: string, projectId: string, pairingId: string): Promise<void> { await deleteDoc(doc(pairingsCollection(uid, projectId), pairingId)); }
export async function getEggClutches(uid: string, projectId: string): Promise<EggClutch[]> { const snapshot = await getDocs(query(clutchCollection(uid, projectId), orderBy("laidDate", "desc"))); return snapshot.docs.map((item) => item.data() as EggClutch); }
export async function saveEggClutch(uid: string, projectId: string, clutch: EggClutch): Promise<void> { await setDoc(doc(clutchCollection(uid, projectId), clutch.id), { ...clutch, updatedAt: serverTimestamp() }, { merge: true }); }
export async function deleteEggClutch(uid: string, projectId: string, clutchId: string): Promise<void> { await deleteDoc(doc(clutchCollection(uid, projectId), clutchId)); }
export async function getHatchlings(uid: string, projectId: string): Promise<HatchlingRecord[]> { const snapshot = await getDocs(query(hatchlingsCollection(uid, projectId), orderBy("hatchDate", "desc"))); return snapshot.docs.map((item) => item.data() as HatchlingRecord); }
export async function saveHatchling(uid: string, projectId: string, hatchling: HatchlingRecord): Promise<void> { await setDoc(doc(hatchlingsCollection(uid, projectId), hatchling.id), { ...hatchling, updatedAt: serverTimestamp() }, { merge: true }); }
export async function deleteHatchling(uid: string, projectId: string, hatchlingId: string): Promise<void> { await deleteDoc(doc(hatchlingsCollection(uid, projectId), hatchlingId)); }
