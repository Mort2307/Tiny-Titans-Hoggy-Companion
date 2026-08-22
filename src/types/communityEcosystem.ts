export type CommunityContentType = "post" | "showcase" | "project" | "marketplace";
export type CommunityBoardKey = "general" | "showcase" | "projects" | "marketplace";
export type CommunityVisibility = "community" | "private";
export type CommunityModerationStatus = "pending" | "approved" | "rejected";
export type CommunityPermission = "featured";

export type CommunityEngagement = {
  helpful?: number;
  likes?: number;
  comments?: number;
};

export type CommunityContent = {
  id: string;
  type: CommunityContentType;
  board: CommunityBoardKey;
  visibility: CommunityVisibility;
  moderationStatus: CommunityModerationStatus;
  title: string;
  description?: string;
  imageUrl?: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
  creatorUid?: string;
  creatorName?: string;
  permissions: CommunityPermission[];
  tags: string[];
  engagement: CommunityEngagement;
};

export type FeaturedCandidate = CommunityContent & {
  featureScore: number;
  featureReason: string;
};
