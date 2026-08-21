export type CommunityContentType =
  | "discussion"
  | "showcase"
  | "project"
  | "marketplace"
  | "knowledge"
  | "event"
  | "challenge";

export type CommunityVisibility = "community" | "private";

export type CommunityPermission =
  | "featured"
  | "showcase"
  | "marketplace"
  | "project";

export type CommunityBoardKey =
  | "keeper"
  | "husbandry"
  | "behaviour"
  | "genetics"
  | "breeding"
  | "vivarium"
  | "community";

export type CommunityContent = {
  id: string;
  type: CommunityContentType;
  title: string;
  summary?: string;
  body?: string;
  authorId: string;
  authorDisplayName?: string;
  imageUrl?: string | null;
  tags?: string[];
  species?: string | null;
  morph?: string | null;
  board?: CommunityBoardKey | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  visibility: CommunityVisibility;
  permissions?: CommunityPermission[];
  featuredUntil?: unknown;
  engagement?: {
    helpful?: number;
    likes?: number;
    comments?: number;
  };
  moderationStatus?: "pending" | "approved" | "rejected";
};

export type FeaturedCandidate = CommunityContent & {
  featureScore: number;
  featureReason: string;
};

export const COMMUNITY_BOARDS: Array<{
  key: CommunityBoardKey;
  icon: string;
  title: string;
  description: string;
}> = [
  { key: "keeper", icon: "🐍", title: "Keeper Corner", description: "Everyday keeper questions, wins and experiences." },
  { key: "husbandry", icon: "🌡️", title: "Husbandry", description: "Feeding, shedding, heating, lighting and care." },
  { key: "behaviour", icon: "🧠", title: "Behaviour", description: "Decode the weird, wonderful things hognoses do." },
  { key: "genetics", icon: "🧬", title: "Genetics", description: "Morphs, inheritance, hets and identification." },
  { key: "breeding", icon: "🥚", title: "Breeding Projects", description: "Pairings, clutches, outcomes and collaboration." },
  { key: "vivarium", icon: "🌱", title: "Vivarium Lab", description: "Enclosures, plants, substrate and builds." },
  { key: "community", icon: "💬", title: "Community", description: "Everything else Tiny Titans keepers want to discuss." },
];
