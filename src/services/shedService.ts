import { collection, deleteDoc, doc, getDocs, query, setDoc } from "firebase/firestore";
import type { ShedRecord } from "../types/Shed";
import { db } from "../firebase/config";

function getShedCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "sheds");
}

export async function getSnakeSheds(uid: string, snakeId: string): Promise<ShedRecord[]> {
  const snapshot = await getDocs(query(getShedCollection(uid, snakeId)));
  return snapshot.docs
    .map((shedDoc) => ({ ...(shedDoc.data() as ShedRecord), id: shedDoc.id, snakeId } as ShedRecord))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveSnakeShed(uid: string, shed: ShedRecord): Promise<ShedRecord> {
  const shedRef = doc(getShedCollection(uid, shed.snakeId), shed.id);
  await setDoc(shedRef, { ...shed, snakeId: shed.snakeId, id: shed.id }, { merge: true });
  return shed;
}

export async function deleteSnakeShed(uid: string, snakeId: string, shedId: string): Promise<void> {
  await deleteDoc(doc(getShedCollection(uid, snakeId), shedId));
}
