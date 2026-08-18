import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function getCreatorUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (uid) => {
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (!snapshot.exists()) return [uid, "Anonymous user"] as const;
      const data = snapshot.data();
      const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
      return [uid, displayName || "Anonymous user"] as const;
    } catch {
      return [uid, "Anonymous user"] as const;
    }
  }));
  return Object.fromEntries(entries);
}
