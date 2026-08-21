import { arrayRemove, arrayUnion, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityFollowTarget = "content" | "board" | "project" | "user";

export async function followCommunityTarget(userId: string, target: CommunityFollowTarget, targetId: string): Promise<void> {
  if (!userId || !targetId) throw new Error("A valid community target is required.");
  const preferencesRef = doc(db, "users", userId, "community", "follows");
  await setDoc(preferencesRef, { [target]: arrayUnion(targetId) }, { merge: true });
}

export async function unfollowCommunityTarget(userId: string, target: CommunityFollowTarget, targetId: string): Promise<void> {
  if (!userId || !targetId) throw new Error("A valid community target is required.");
  await updateDoc(doc(db, "users", userId, "community", "follows"), { [target]: arrayRemove(targetId) });
}
