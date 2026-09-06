import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { BehaviourRecord } from "../types/Behaviour";
import { resolveDataOwnerUid } from "./familyService";
import { requestFamilyMutation } from "./familyPermissionsService";
import { emitTitanIntelligenceEvent } from "./titanReactiveIntelligenceService";

function records(uid: string, snakeId: string) { return collection(db, "users", uid, "snakes", snakeId, "behaviours"); }

export async function getSnakeBehaviourRecords(uid: string, snakeId: string): Promise<BehaviourRecord[]> {
  const owner = await resolveDataOwnerUid(uid);
  const snapshot = await getDocs(query(records(owner, snakeId), orderBy("date", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data() as BehaviourRecord, id: item.id, snakeId }));
}

export async function saveSnakeBehaviourRecord(uid: string, record: BehaviourRecord): Promise<BehaviourRecord> {
  const owner = await resolveDataOwnerUid(uid);
  const existing = await getDocs(records(owner, record.snakeId));
  const operation = existing.docs.some((item) => item.id === record.id) ? "update" : "create";
  const payload = { ...record, lastModifiedBy: uid };
  await requestFamilyMutation({ requesterUid: uid, requesterName: uid, area: "behaviour", action: operation === "create" ? "create" : "edit", title: "Update behaviour record", description: "A family member wants to update a shared behaviour observation.", targetPath: `users/${owner}/snakes/${record.snakeId}/behaviours/${record.id}`, operation, data: payload });
  await setDoc(doc(records(owner, record.snakeId), record.id), payload, { merge: true });
  emitTitanIntelligenceEvent({ uid, animalId: record.snakeId, type: "BehaviourObserved", action: operation === "create" ? "created" : "updated", recordId: record.id, observation: record.observation, context: record.context, occurredAt: `${record.date}T00:00:00.000Z` });
  return payload;
}

export async function deleteSnakeBehaviourRecord(uid: string, snakeId: string, recordId: string): Promise<void> {
  const owner = await resolveDataOwnerUid(uid);
  await requestFamilyMutation({ requesterUid: uid, requesterName: uid, area: "behaviour", action: "delete", title: "Delete behaviour record", description: "A family member wants to permanently remove a shared behaviour observation.", targetPath: `users/${owner}/snakes/${snakeId}/behaviours/${recordId}`, operation: "delete" });
  await deleteDoc(doc(records(owner, snakeId), recordId));
  emitTitanIntelligenceEvent({ uid, animalId: snakeId, type: "BehaviourObserved", action: "deleted", recordId, observation: "Other", context: "Other", occurredAt: new Date().toISOString() });
}
