export type FeatureVotingStatus = "suggested" | "under_review" | "planned" | "in_development" | "testing" | "released" | "declined" | "backlog";

export type FeatureVotingCategory =
  | "snake_keeping"
  | "health_vet"
  | "feeding"
  | "weight"
  | "shedding"
  | "genetics"
  | "breeding"
  | "learning"
  | "achievements"
  | "community"
  | "ui"
  | "other";

export type FeatureRequest = {
  id: string;
  title: string;
  description: string;
  whyUseful: string;
  category: FeatureVotingCategory;
  status: FeatureVotingStatus;
  voteCount: number;
  createdBy: string;
  creatorName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  adminNote?: string;
};

export const FEATURE_VOTING_STATUS_LABELS: Record<FeatureVotingStatus, string> = {
  suggested: "Suggested",
  under_review: "Under Review",
  planned: "Planned",
  in_development: "In Development",
  testing: "Testing",
  released: "Released",
  declined: "Declined",
  backlog: "Backlog",
};

export const FEATURE_VOTING_STATUS_ICONS: Record<FeatureVotingStatus, string> = {
  suggested: "💡",
  under_review: "🟡",
  planned: "📋",
  in_development: "🔨",
  testing: "🧪",
  released: "✅",
  declined: "❌",
  backlog: "⏸️",
};

export const FEATURE_VOTING_CATEGORY_LABELS: Record<FeatureVotingCategory, string> = {
  snake_keeping: "Snake Keeping",
  health_vet: "Health & Vet",
  feeding: "Feeding",
  weight: "Weight",
  shedding: "Shedding",
  genetics: "Genetics",
  breeding: "Breeding",
  learning: "Learning",
  achievements: "Achievements",
  community: "Community",
  ui: "UI / Experience",
  other: "Other",
};

export const FEATURE_VOTING_CATEGORIES = Object.entries(FEATURE_VOTING_CATEGORY_LABELS) as [FeatureVotingCategory, string][];
export const FEATURE_VOTING_STATUSES = Object.keys(FEATURE_VOTING_STATUS_LABELS) as FeatureVotingStatus[];
