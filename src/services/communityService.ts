import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityAudience, CommunityCategory, CommunityPost, CommunityPriority, KnownIssueStatus } from "../types/community";

const postsCollection = collection(db, "communityPosts");

export async function getCommunityPosts(options?: { isTester?: boolean; isAdmin?: boolean }): Promise<CommunityPost[]> {
  const isAdmin = options?.isAdmin === true;
  const isTester = options?.isTester === true;
  const queries = isAdmin
    ? [query(postsCollection, orderBy("publishedAt", "desc"))]
    : [query(postsCollection, where("audience", "==", "everyone"), orderBy("publishedAt", "desc"))];

  if (isTester) {
    queries.push(query(postsCollection, where("audience", "==", "testers"), orderBy("publishedAt", "desc")));
  }

  const snapshots = await Promise.all(queries.map((item) => getDocs(item)));
  const posts = snapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<CommunityPost, "id">) })));
  return posts.sort((a, b) => {
    const aTime = a.publishedAt && typeof a.publishedAt === "object" && "toMillis" in a.publishedAt && typeof a.publishedAt.toMillis === "function" ? a.publishedAt.toMillis() : 0;
    const bTime = b.publishedAt && typeof b.publishedAt === "object" && "toMillis" in b.publishedAt && typeof b.publishedAt.toMillis === "function" ? b.publishedAt.toMillis() : 0;
    return bTime - aTime;
  });
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
