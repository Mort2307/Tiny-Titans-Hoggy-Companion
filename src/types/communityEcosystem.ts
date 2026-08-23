export type CommunityContentType = "showcase" | "project" | "knowledge" | "marketplace" | "discussion";
export type CommunityBoardKey = "showcase" | "projects" | "knowledge" | "marketplace" | "mentorship";
export type CommunityContent = {
  id: string; authorId?: string; authorName?: string; title: string; body?: string; type: CommunityContentType; board: CommunityBoardKey;
  visibility: "community" | "private" | "draft"; moderationStatus: "pending" | "approved" | "rejected"; imageUrl?: string;
  permissions: string[]; tags: string[]; createdAt?: unknown; engagement?: { helpful?: number; likes?: number; comments?: number };
};
export type FeaturedCandidate = CommunityContent & { featureScore: number; featureReason: string };
