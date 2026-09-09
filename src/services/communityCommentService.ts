import { addDoc, collection, getDocs, limit, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityComment = {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt?: unknown;
};

const comments = collection(db, "communityComments");

function timestampValue(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return Number(value.toMillis()) || 0;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime() || 0;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapComment(item: { id: string; data: () => Record<string, unknown> }): CommunityComment {
  return { id: item.id, ...(item.data() as Omit<CommunityComment, "id">) };
}

function sortComments(items: CommunityComment[]) {
  return [...items].sort((a, b) => timestampValue(a.createdAt) - timestampValue(b.createdAt));
}

export async function getCommunityComments(postId: string): Promise<CommunityComment[]> {
  if (!postId) return [];
  const snapshot = await getDocs(query(comments, where("postId", "==", postId), limit(100)));
  return sortComments(snapshot.docs.map(mapComment));
}

export function watchCommunityComments(postId: string, onChange: (items: CommunityComment[]) => void, onError?: (error: Error) => void) {
  if (!postId) return () => undefined;
  return onSnapshot(query(comments, where("postId", "==", postId), limit(100)), (snapshot) => onChange(sortComments(snapshot.docs.map(mapComment))), (error) => onError?.(error));
}

export async function addCommunityComment(input: { postId: string; authorUid: string; authorName: string; body: string }) {
  const postId = input.postId.trim();
  const authorUid = input.authorUid.trim();
  const authorName = input.authorName.trim().slice(0, 80) || "Keeper";
  const body = input.body.trim().slice(0, 2000);
  if (!postId || !authorUid || !body) throw new Error("A signed-in account and a message are required.");
  return addDoc(comments, { postId, authorUid, authorName, body, createdAt: serverTimestamp() });
}
