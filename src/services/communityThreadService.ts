import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityContent } from "../types/communityEcosystem";

export type CommunityReply = {
  id: string;
  authorId: string;
  authorDisplayName?: string;
  body: string;
  createdAt?: unknown;
};

export async function getCommunityContentById(contentId: string): Promise<CommunityContent | null> {
  const snapshot = await getDoc(doc(db, "communityContent", contentId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as CommunityContent;
}

export async function getCommunityReplies(contentId: string): Promise<CommunityReply[]> {
  const snapshot = await getDocs(query(collection(db, "communityContent", contentId, "replies"), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CommunityReply[];
}
