import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "../firebase/config";

const db = getFirestore(app);

export type AccountUnitSystem = "metric" | "imperial";

export async function saveAccountUnitSystem(uid: string, system: AccountUnitSystem) {
  if (!uid) throw new Error("Unit preference requires an authenticated account.");
  await setDoc(doc(db, "users", uid), { unitSystem: system, updatedAt: serverTimestamp() }, { merge: true });
}
