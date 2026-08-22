export type CommunityAudience = "everyone" | "testers" | "admin";
export type CommunityCategory = "update" | "known_issue" | "tester" | "release";
export type CommunityPriority = "normal" | "important" | "critical";
export type KnownIssueStatus = "Investigating" | "Fixing" | "Testing" | "Resolved";

export type CommunityPost = {
  id: string;
  category: CommunityCategory;
  title: string;
  message: string;
  priority: CommunityPriority;
  audience: CommunityAudience;
  publishedAt?: unknown;
  updatedAt?: unknown;
  imageUrl?: string | null;
  videoUrl?: string | null;
  appVersion?: string | null;
  platform?: string | null;
  status?: KnownIssueStatus | null;
  workaround?: string | null;
  resolvedVersion?: string | null;
  affectedVersion?: string | null;
  affectedPlatform?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  createdBy?: string | null;
};

export function communityCategoryLabel(category: CommunityCategory) {
  return ({ update: "Tiny Titans Updates", known_issue: "Known Issues", tester: "Tester Updates", release: "Release Notes" })[category];
}

export function communityCategoryIcon(category: CommunityCategory) {
  return ({ update: "📢", known_issue: "🐛", tester: "🧪", release: "📋" })[category];
}