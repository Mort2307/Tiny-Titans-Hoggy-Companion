import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/config";

export type ManagedRole = "user" | "moderator" | "admin";
export type ManagedUser = { uid: string; email: string; displayName: string; role: string; isTester: boolean };

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: typeof data.email === "string" ? data.email : "",
      displayName: typeof data.displayName === "string" ? data.displayName : "",
      role: typeof data.role === "string" ? data.role : "user",
      isTester: data.isTester === true,
    };
  }).sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
}

export async function setManagedUserRole(uid: string, role: ManagedRole) {
  if (!uid.trim()) throw new Error("A user is required.");
  const callable = httpsCallable<{ uid: string; role: ManagedRole }, { uid: string; role: ManagedRole }>(functions, "setCreatorClaims");
  return (await callable({ uid, role })).data;
}
