import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { getCommunityPosts } from "./communityService";

const READ_STATE_ID = "communityReadState";

type ReadState = {
  lastSeenAt?: { toMillis?: () => number } | null;
};

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) || typeof value.toMillis !== "function") return 0;
  return value.toMillis();
}

function readStateRef(uid: string) {
  return doc(db, "users", uid, "appState", READ_STATE_ID);
}

export async function getCommunityUnreadCount(uid: string, options?: { isTester?: boolean; isAdmin?: boolean }) {
  const [stateSnapshot, posts] = await Promise.all([
    getDoc(readStateRef(uid)),
    getCommunityPosts(options),
  ]);

  const state = stateSnapshot.exists() ? (stateSnapshot.data() as ReadState) : null;
  const lastSeenAt = timestampMillis(state?.lastSeenAt);
  return posts.filter((post) => timestampMillis(post.publishedAt) > lastSeenAt).length;
}

export async function markCommunityAsRead(uid: string) {
  await setDoc(readStateRef(uid), { lastSeenAt: serverTimestamp() }, { merge: true });
}
