import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFamilyForUser } from "./familyService";

export type SandboxExperiment = {
  id: string;
  ownerUid: string;
  familyId?: string;
  title: string;
  type: "genetics" | "pairing" | "clutch" | "custom";
  data: Record<string, unknown>;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function saveSandboxExperiment(uid: string, input: Omit<SandboxExperiment, "id" | "ownerUid" | "familyId" | "createdAt" | "updatedAt">): Promise<SandboxExperiment> {
  const family = await getFamilyForUser(uid);
  const payload = { ownerUid: uid, familyId: family?.id ?? null, ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const result = await addDoc(collection(db, "sandboxExperiments"), payload);
  return { id: result.id, ...input, ownerUid: uid, familyId: family?.id, createdAt: payload.createdAt, updatedAt: payload.updatedAt };
}

export async function getSandboxExperiments(uid: string): Promise<SandboxExperiment[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "sandboxExperiments"), where("ownerUid", "==", uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SandboxExperiment, "id">) }));
}

export async function deleteSandboxExperiment(uid: string, id: string): Promise<void> {
  const snapshot = await getSandboxExperiments(uid);
  if (!snapshot.some((item) => item.id === id)) throw new Error("Sandbox experiment not found.");
  await deleteDoc(doc(db, "sandboxExperiments", id));
}
