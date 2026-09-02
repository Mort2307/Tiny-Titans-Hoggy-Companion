import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Resolve creator-visible user IDs to profile display names.
 * UIDs remain internal stable identifiers and are not intended for Creator-facing rendering.
 */
export async function getCreatorUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(userIds.map((uid) => String(uid || "").trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  try {
    const snapshot = await getDocs(collection(db, "users"));
    const wanted = new Set(uniqueIds);
    const names: Record<string, string> = {};
    for (const document of snapshot.docs) {
      if (!wanted.has(document.id)) continue;
      const data = document.data();
      const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
      names[document.id] = displayName || "Anonymous user";
    }
    for (const uid of uniqueIds) names[uid] = names[uid] || "Anonymous user";
    return names;
  } catch {
    return Object.fromEntries(uniqueIds.map((uid) => [uid, "Anonymous user"]));
  }
}
