import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { HealthRecord, MedicationAdministration } from "../types/Health";
import { resolveDataOwnerUid } from "./familyService";
import { requestFamilyMutation } from "./familyPermissionsService";

function records(uid: string, snakeId: string) { return collection(db, "users", uid, "snakes", snakeId, "health"); }

export async function getSnakeHealthRecords(uid: string, snakeId: string): Promise<HealthRecord[]> {
  const owner = await resolveDataOwnerUid(uid);
  const snapshot = await getDocs(query(records(owner, snakeId), orderBy("date", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data() as HealthRecord, id: item.id, snakeId }));
}

export async function saveSnakeHealthRecord(uid: string, record: HealthRecord): Promise<HealthRecord> {
  const owner = await resolveDataOwnerUid(uid);
  const existing = await getDocs(records(owner, record.snakeId));
  const operation = existing.docs.some((item) => item.id === record.id) ? "update" : "create";
  const payload = { ...record, lastModifiedBy: uid };
  await requestFamilyMutation({ requesterUid: uid, requesterName: uid, area: "health", action: operation === "create" ? "create" : "edit", title: "Update health record", description: "A family member wants to update a shared health or veterinary record.", targetPath: `users/${owner}/snakes/${record.snakeId}/health/${record.id}`, operation, data: payload });
  await setDoc(doc(records(owner, record.snakeId), record.id), payload, { merge: true });
  return payload;
}

export async function recordMedicationAdministration(uid: string, record: HealthRecord, administration: MedicationAdministration): Promise<HealthRecord> {
  const current = record.medicationAdministrations ?? [];
  const nextAdministration = { ...administration, recordedBy: uid };
  const next: HealthRecord = {
    ...record,
    medicationAdministrations: [...current.filter((item) => item.id !== administration.id), nextAdministration],
    reminderState: administration.status === "given" ? "active" : record.reminderState,
  };
  return saveSnakeHealthRecord(uid, next);
}

export async function cancelMedicationSchedule(uid: string, record: HealthRecord): Promise<HealthRecord> {
  return saveSnakeHealthRecord(uid, { ...record, reminderState: "cancelled", medicationSchedule: record.medicationSchedule ? { ...record.medicationSchedule, enabled: false, reminderEnabled: false } : undefined });
}

export async function deleteSnakeHealthRecord(uid: string, snakeId: string, recordId: string): Promise<void> {
  const owner = await resolveDataOwnerUid(uid);
  await requestFamilyMutation({ requesterUid: uid, requesterName: uid, area: "health", action: "delete", title: "Delete health record", description: "A family member wants to permanently remove a shared health or veterinary record.", targetPath: `users/${owner}/snakes/${snakeId}/health/${recordId}`, operation: "delete" });
  await deleteDoc(doc(records(owner, snakeId), recordId));
}
