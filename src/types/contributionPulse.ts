import type { MorphImageSubmission, UserMorphSubmission } from "../types/morphSubmission";

export type ContributionModal = "personal" | "global" | null;
export type FounderContribution = { id: string; status?: string; createdAt?: unknown; updatedAt?: unknown };
export type PersonalContribution = {
  id: string; category: string; title: string; snippet: string;
  status?: string; link?: string; createdAt?: unknown;
};
export type ContributionSourceData = {
  observations: import("../types/keeperObservation").KeeperObservation[];
  feedback: import("../types/feedback").Feedback[];
  bugs: import("../types/reportIssue").ReportIssue[];
  morphSubmissions: UserMorphSubmission[];
  morphImageSubmissions: MorphImageSubmission[];
  founderApplications: FounderContribution[];
  snakes: import("../types/Snake").Snake[];
  privacy: import("../types/privacy").PrivacyPreferences | null;
  globalFeed: import("../services/communityIntelligenceService").PublicContributionEntry[];
  globalSnapshot: import("../services/communityIntelligenceService").PublicContributionSnapshot | null;
};
