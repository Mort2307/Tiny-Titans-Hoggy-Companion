import { collection, deleteDoc, doc, getDocs, query, setDoc } from "firebase/firestore";
import type { ShedRecord, ShedStage } from "../types/Shed";
import { db } from "../firebase/config";
import { resolveDataOwnerUid } from "./familyService";
import { requestFamilyMutation } from "./familyPermissionsService";

function getShedCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "sheds");
}

function asCycle(record: ShedRecord): ShedRecord {
  if (record.currentStage && (record.cycleStartedAt || record.clearPhaseAt || record.completedAt)) return record;
  const stage: ShedStage = record.shedCompleted ? "Complete" : record.eyesSkinCleared ? "Clear" : record.bluePhaseStarted ? "Blue" : "Complete";
  const date = record.date;
  return {
    ...record,
    currentStage: stage,
    cycleStartedAt: record.bluePhaseStarted ? date : undefined,
    clearPhaseAt: record.eyesSkinCleared ? date : undefined,
    completedAt: record.shedCompleted ? date : undefined,
  };
}

function cycleSortDate(record: ShedRecord) {
  return record.completedAt || record.cycleStartedAt || record.date;
}

export async function getSnakeSheds(uid: string, snakeId: string): Promise<ShedRecord[]> {
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  const snapshot = await getDocs(query(getShedCollection(dataOwnerUid, snakeId)));
  return snapshot.docs
    .map((shedDoc) => asCycle({ ...shedDoc.data() as ShedRecord, id: shedDoc.id, snakeId }))
    .sort((a, b) => cycleSortDate(b).localeCompare(cycleSortDate(a)));
}

/** Return the newest incomplete lifecycle so users continue it instead of creating a duplicate shed. */
export async function getActiveShedCycle(uid: string, snakeId: string): Promise<ShedRecord | null> {
  const records = await getSnakeSheds(uid, snakeId);
  return records.find((record) => record.currentStage !== "Complete" && !record.completedAt) ?? null;
}

export async function saveSnakeShed(uid: string, shed: ShedRecord): Promise<ShedRecord> {
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  const existing = await getDocs(query(getShedCollection(dataOwnerUid, shed.snakeId)));
  const isUpdate = existing.docs.some((item) => item.id === shed.id);
  const cycle = asCycle(shed);
  await requestFamilyMutation({
    requesterUid: uid,
    requesterName: uid,
    area: "sheds",
    action: isUpdate ? "edit" : "create",
    title: isUpdate ? "Update shedding cycle" : "Start shedding cycle",
    description: isUpdate ? "A family member wants to update a shared shedding cycle." : "A family member wants to start a shared shedding cycle.",
    targetPath: `users/${dataOwnerUid}/snakes/${cycle.snakeId}/sheds/${cycle.id}`,
    operation: isUpdate ? "update" : "create",
    data: { ...cycle, snakeId: cycle.snakeId, id: cycle.id, lastModifiedBy: uid },
  });
  const shedRef = doc(getShedCollection(dataOwnerUid, cycle.snakeId), cycle.id);
  await setDoc(shedRef, { ...cycle, snakeId: cycle.snakeId, id: cycle.id, lastModifiedBy: uid }, { merge: true });
  return cycle;
}

export async function deleteSnakeShed(uid: string, snakeId: string, shedId: string): Promise<void> {
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  const targetPath = `users/${dataOwnerUid}/snakes/${snakeId}/sheds/${shedId}`;
  await requestFamilyMutation({
    requesterUid: uid,
    requesterName: uid,
    area: "sheds",
    action: "delete",
    title: "Delete shedding cycle",
    description: "A family member wants to permanently remove a shedding cycle.",
    targetPath,
    operation: "delete",
  });
  await deleteDoc(doc(getShedCollection(dataOwnerUid, snakeId), shedId));
}
