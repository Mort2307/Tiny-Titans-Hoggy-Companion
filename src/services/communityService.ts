import { addDoc, collection, getDocs, query, serverTimestamp, where, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityAudience, CommunityCategory, CommunityPost, CommunityPriority, KnownIssueStatus } from "../types/community";

const postsCollection = collection(db, "communityPosts");

type CommunitySnapshot = QuerySnapshot<DocumentData, DocumentData>;

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) || typeof value.toMillis !== "function") return 0;
  return value.toMillis();
}

/**
 * Firestore rules restrict communityPosts by audience. Every query therefore
 * includes an audience equality filter. Queries are intentionally independent:
 * if a tester/admin audience is not readable yet, public "everyone" updates
 * must still load rather than turning the entire Hub into a permissions error.
 */
export async function getCommunityPosts(options?: { isTester?: boolean; isAdmin?: boolean }): Promise<CommunityPost[]> {
  const isAdmin = options?.isAdmin === true;
  const isTester = options?.isTester === true;

  const audiences: CommunityAudience[] = ["everyone"];
  if (isTester || isAdmin) audiences.push("testers");
  if (isAdmin) audiences.push("admin");

  const uniqueAudiences = [...new Set(audiences)];
  const results: PromiseSettledResult<CommunitySnapshot>[] = await Promise.allSettled(
    uniqueAudiences.map(async (audience): Promise<CommunitySnapshot> =>
      getDocs(query(postsCollection, where("audience", "==", audience)))
    )
  );

  const readableSnapshots: CommunitySnapshot[] = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  const publicResult = results[0];
  if (publicResult?.status === "rejected") throw publicResult.reason;

  const posts: CommunityPost[] = readableSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<CommunityPost, "id">),
    }))
  );

  return posts.sort((a, b) => timestampMillis(b.publishedAt) - timestampMillis(a.publishedAt));
}

/**
 * Firestore rejects object fields whose value is `undefined`.
 * Community drafts intentionally contain optional fields, so strip only
 * undefined values before writing while preserving valid falsey values and null.
 */
function removeUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;
}

export async function publishCommunityPost(input: Omit<CommunityPost, "id" | "publishedAt" | "updatedAt">) {
  const data = removeUndefinedFields({
    ...input,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await addDoc(postsCollection, data);
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
