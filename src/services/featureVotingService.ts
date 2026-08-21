import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { FeatureRequest, FeatureVotingCategory, FeatureVotingStatus } from "../types/featureVoting";

const functions = getFunctions(app, "europe-west2");

function millis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  const parsed = value ? new Date(String(value)).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFeatureRequests(): Promise<FeatureRequest[]> {
  const call = httpsCallable<void, FeatureRequest[]>(functions, "listFeatureRequests");
  const result = await call();
  return result.data
    .sort((a, b) => (b.voteCount - a.voteCount) || (millis(b.createdAt) - millis(a.createdAt)));
}

export async function getUserFeatureVotes(): Promise<Set<string>> {
  const call = httpsCallable<void, string[]>(functions, "listUserFeatureVotes");
  const result = await call();
  return new Set(result.data);
}

export async function toggleFeatureVote(featureId: string): Promise<boolean> {
  const call = httpsCallable<{ featureId: string }, { voted: boolean }>(functions, "toggleFeatureVote");
  const result = await call({ featureId });
  return result.data.voted;
}

export async function submitFeatureRequest(input: {
  title: string;
  description: string;
  whyUseful: string;
  category: FeatureVotingCategory;
  creatorName: string;
}): Promise<string> {
  const call = httpsCallable<typeof input, { id: string }>(functions, "submitFeatureRequest");
  const result = await call(input);
  return result.data.id;
}

export async function updateFeatureRequestStatus(featureId: string, status: FeatureVotingStatus, adminNote?: string) {
  const call = httpsCallable<{ featureId: string; status: FeatureVotingStatus; adminNote?: string }, { success: boolean }>(functions, "updateFeatureRequestStatus");
  await call({ featureId, status, adminNote });
}

export async function deleteFeatureRequest(featureId: string) {
  const call = httpsCallable<{ featureId: string }, { success: boolean }>(functions, "deleteFeatureRequest");
  await call({ featureId });
}
