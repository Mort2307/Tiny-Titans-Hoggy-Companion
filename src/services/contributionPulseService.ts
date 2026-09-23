import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserFeedback, getUserIssueReports } from "./creatorService";
import { getUserKeeperObservations } from "./keeperObservationService";
import { getUserMorphSubmissions } from "./morphUserSubmissionService";
import { getPublicCommunityContributionFeed, getPublicCommunityContributionSnapshot } from "./communityIntelligenceService";
import { getPrivacyPreferences } from "./privacyService";
import { getUserSnakes } from "./snakeService";
import type { MorphImageSubmission } from "../types/morphSubmission";
import type { FounderContribution } from "../types/contributionPulse";

export async function getUserMorphImageSubmissions(uid: string): Promise<MorphImageSubmission[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "morphImageSubmissions"), where("userId", "==", uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MorphImageSubmission, "id">) }));
}

export async function getUserFounderApplications(uid: string): Promise<FounderContribution[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, "founderApplications"), where("uid", "==", uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderContribution, "id">) }));
}

export async function loadContributionSourceData(uid: string) {
  const [observations, feedback, bugs, morphSubmissions, morphImageSubmissions, founderApplications, privacy, snakes, globalFeed, globalSnapshot] = await Promise.all([
    getUserKeeperObservations(uid).catch(() => []),
    getUserFeedback(uid).catch(() => []),
    getUserIssueReports(uid).catch(() => []),
    getUserMorphSubmissions(uid).catch(() => []),
    getUserMorphImageSubmissions(uid).catch(() => []),
    getUserFounderApplications(uid).catch(() => []),
    getPrivacyPreferences(uid).catch(() => null),
    getUserSnakes(uid).catch(() => []),
    getPublicCommunityContributionFeed().catch(() => ({ entries: [] })),
    getPublicCommunityContributionSnapshot().catch(() => null),
  ]);
  return { observations, feedback, bugs, morphSubmissions, morphImageSubmissions, founderApplications, privacy, snakes, globalFeed: globalFeed.entries ?? [], globalSnapshot };
}
