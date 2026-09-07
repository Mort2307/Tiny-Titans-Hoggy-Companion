import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export type CreatorUserDirectoryEntry = {
  uid: string;
  displayName: string;
  email: string;
};

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

/**
 * Full Creator-facing directory used for direct messaging. The existing users
 * collection is the canonical account directory, so this intentionally returns
 * every account visible to an authorised Creator rather than only users who have
 * already opened a submission conversation.
 */
export async function getCreatorUserDirectory(): Promise<CreatorUserDirectoryEntry[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .map((document) => {
      const data = document.data();
      const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
      const email = typeof data.email === "string" ? data.email.trim() : "";
      return { uid: document.id, displayName: displayName || "Anonymous user", email };
    })
    .sort((a, b) => {
      const nameA = `${a.displayName} ${a.email}`.trim().toLocaleLowerCase();
      const nameB = `${b.displayName} ${b.email}`.trim().toLocaleLowerCase();
      return nameA.localeCompare(nameB);
    });
}
