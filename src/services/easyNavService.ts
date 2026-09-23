import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "../firebase/config";
import type { EasyNavPreferences } from "../types/easyNav";
const db = getFirestore(app);

export async function loadEasyNavPreferences(uid: string): Promise<EasyNavPreferences | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const raw = snapshot.data().easyNavPreferences;
  return raw && typeof raw === "object" ? raw as EasyNavPreferences : null;
}

export async function saveEasyNavPreferences(
  uid: string,
  preferences: EasyNavPreferences,
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    easyNavPreferences: {
      ...preferences,
      updatedAt: serverTimestamp(),
    },
  }, { merge: true });
}
