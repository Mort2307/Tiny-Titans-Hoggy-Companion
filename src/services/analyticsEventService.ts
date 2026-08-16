import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export async function trackGeneticsCalculation(uid: string, fingerprint: string): Promise<void> {
  if (!uid || !fingerprint) return;
  const events = collection(db, "users", uid, "analyticsEvents");
  const existing = await getDocs(query(events, where("type", "==", "genetics_calculation"), where("fingerprint", "==", fingerprint)));
  if (!existing.empty) return;
  await addDoc(events, {
    type: "genetics_calculation",
    fingerprint,
    createdAt: new Date().toISOString(),
  });
}
