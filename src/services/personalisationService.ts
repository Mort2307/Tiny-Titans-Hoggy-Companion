import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "../firebase/config";
const db = getFirestore(app);

export async function savePersonalisationProfile(
  uid: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
