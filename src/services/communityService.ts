import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityAudience, CommunityCategory, CommunityPost, CommunityPriority, KnownIssueStatus } from "../types/community";

const postsCollection = collection(db, "communityPosts");

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const snapshot = await getDocs(query(postsCollection, orderBy("publishedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<CommunityPost, "id">) }));
}

export async function publishCommunityPost(input: Omit<CommunityPost, "id" | "publishedAt" | "updatedAt">) {
  const ref = await addDoc(postsCollection, {
    ...input,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export type CommunityPostDraft = {
  category: CommunityCategory;
  title: string;
  message: string;
  priority: CommunityPriority;
  audience: CommunityAudience;
  appVersion?: string;
  affectedVersion?: string;
  affectedPlatform?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: KnownIssueStatus;
  workaround?: string;
  resolvedVersion?: string;
  imageUrl?: string | null;
};

export async function publishCommunityDraft(draft: CommunityPostDraft, createdBy: string) {
  return publishCommunityPost({ ...draft, createdBy });
}
