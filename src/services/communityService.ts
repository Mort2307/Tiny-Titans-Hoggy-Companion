import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityAudience, CommunityCategory, CommunityPost, CommunityPriority, KnownIssueStatus } from "../types/community";

const postsCollection = collection(db, "communityPosts");

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) || typeof value.toMillis !== "function") return 0;
  return value.toMillis();
}

export async function getCommunityPosts(options?: { isTester?: boolean; isAdmin?: boolean }): Promise<CommunityPost[]> {
  const isAdmin = options?.isAdmin === true;
  const isTester = options?.isTester === true;
  const queries = isAdmin
    ? [query(postsCollection)]
    : [query(postsCollection, where("audience", "==", "everyone"))];

  if (isTester) queries.push(query(postsCollection, where("audience", "==", "testers")));

  const snapshots = await Promise.all(queries.map((item) => getDocs(item)));
  const posts = snapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<CommunityPost, "id">) })));
  return posts.sort((a, b) => timestampMillis(b.publishedAt) - timestampMillis(a.publishedAt));
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
