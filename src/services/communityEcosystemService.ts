import { collection, getDocs, limit, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityContent, CommunityContentType, CommunityBoardKey, FeaturedCandidate } from "../types/communityEcosystem";

const contentCollection = collection(db, "communityContent");

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) || typeof value.toMillis !== "function") return 0;
  return value.toMillis();
}

function normaliseContent(id: string, data: DocumentData): CommunityContent {
  return {
    id,
    ...(data as Omit<CommunityContent, "id">),
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    engagement: data.engagement ?? {},
  };
}

export async function getCommunityContent(options?: {
  type?: CommunityContentType;
  board?: CommunityBoardKey;
  limitCount?: number;
}): Promise<CommunityContent[]> {
  const field = options?.board ? "board" : options?.type ? "type" : "visibility";
  const value = options?.board ?? options?.type ?? "community";
  const snapshot = await getDocs(query(contentCollection, where(field, "==", value), limit(options?.limitCount ?? 40)));
  return snapshot.docs
    .map((item) => normaliseContent(item.id, item.data()))
    .filter((item) => item.visibility === "community")
    .filter((item) => item.moderationStatus !== "rejected")
    .filter((item) => !options?.type || item.type === options.type)
    .filter((item) => !options?.board || item.board === options.board)
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

function featureScore(item: CommunityContent, now: number): number {
  const ageDays = Math.max(0, (now - timestampMillis(item.createdAt)) / 86_400_000);
  const recency = Math.max(0, 35 - ageDays * 2.2);
  const engagement = Math.min(30, (item.engagement?.helpful ?? 0) * 3 + (item.engagement?.likes ?? 0) * 0.5 + (item.engagement?.comments ?? 0));
  const visual = item.imageUrl ? 14 : 0;
  const permission = item.permissions?.includes("featured") ? 20 : 0;
  const typeVariety = item.type === "showcase" ? 8 : item.type === "project" ? 6 : item.type === "marketplace" ? 4 : 2;
  return recency + engagement + visual + permission + typeVariety;
}

export function rankFeaturedCandidates(items: CommunityContent[], now = Date.now()): FeaturedCandidate[] {
  return items
    .filter((item) => item.visibility === "community" && item.moderationStatus !== "rejected")
    .filter((item) => item.permissions?.includes("featured"))
    .map((item) => {
      const score = featureScore(item, now);
      const reason = item.type === "showcase"
        ? "Community showcase with an opted-in feature permission."
        : item.type === "project"
          ? "Community project selected for variety and collaboration value."
          : item.type === "marketplace"
            ? "New community listing opted into Featured."
            : "Community contribution selected for relevance and freshness.";
      return { ...item, featureScore: score, featureReason: reason };
    })
    .sort((a, b) => b.featureScore - a.featureScore);
}

export async function getFeaturedCandidates(): Promise<FeaturedCandidate[]> {
  const items = await getCommunityContent({ limitCount: 60 });
  return rankFeaturedCandidates(items);
}
