import { getMorphImageSubmissions } from "./creatorService";
import { getAllUserMorphSubmissions } from "./creatorUserMorphSubmissionService";
import { getAllSpeciesSubmissions } from "./speciesSubmissionService";
import { getCreatorVivariumShowcases } from "./vivariumShowcaseService";
import { getCreatorKeeperObservations } from "./keeperObservationService";
import { getCreatorUserDisplayNames } from "./creatorUserDirectoryService";
import { ensureSubmissionConversation, getUserSubmissionConversations, getSubmissionConversationMessages, sendSubmissionConversationMessage, type SubmissionConversationType } from "./submissionConversationService";

export type ContributorSource = { submissionType: SubmissionConversationType; submissionId: string; title: string; submittedAt: unknown; status?: string };
export type HistoricalContributor = { uid: string; displayName: string; latestSubmission: ContributorSource; submissionCount: number };
function clean(value: unknown): string { return String(value ?? "").trim(); }
function timestampToMillis(value: unknown): number { if (!value) return 0; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis(); if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") return value.toDate().getTime(); const parsed = new Date(String(value)).getTime(); return Number.isNaN(parsed) ? 0 : parsed; }
function addSource(map: Map<string, ContributorSource[]>, uid: unknown, source: ContributorSource) { const id = clean(uid); if (!id || !clean(source.submissionId)) return; const existing = map.get(id) ?? []; existing.push(source); map.set(id, existing); }

export async function getHistoricalContributors(excludeUid?: string): Promise<HistoricalContributor[]> {
  const [photoSubmissions, terminologySubmissions, speciesSubmissions, vivariumSubmissions, observations] = await Promise.all([getMorphImageSubmissions(), getAllUserMorphSubmissions(), getAllSpeciesSubmissions(), getCreatorVivariumShowcases(), getCreatorKeeperObservations()]);
  const byUser = new Map<string, ContributorSource[]>();
  for (const item of photoSubmissions) addSource(byUser, item.userId, { submissionType: "morph-image", submissionId: item.id, title: clean(item.morphName) || "Morph image submission", submittedAt: item.submittedAt, status: clean(item.status) });
  for (const item of terminologySubmissions) addSource(byUser, item.userId, { submissionType: "morph-terminology", submissionId: item.id, title: clean(item.submittedName) || "Morph terminology submission", submittedAt: item.createdAt, status: clean(item.status) });
  for (const item of speciesSubmissions) addSource(byUser, item.userId, { submissionType: "species", submissionId: item.id, title: clean(item.commonName) || clean(item.scientificName) || "Species submission", submittedAt: item.submittedAt, status: clean(item.status) });
  for (const item of vivariumSubmissions) addSource(byUser, item.userId, { submissionType: "vivarium-showcase", submissionId: item.id, title: clean(item.title) || "Vivarium showcase", submittedAt: item.submittedAt, status: clean(item.status) });
  for (const item of observations) addSource(byUser, item.userId, { submissionType: "observation", submissionId: item.id, title: clean(item.title) || "Keeper observation", submittedAt: item.submittedAt, status: clean(item.status) });
  const excluded = clean(excludeUid); const contributorIds = [...byUser.keys()].filter((uid) => uid !== excluded); const displayNames = await getCreatorUserDisplayNames(contributorIds);
  return contributorIds.map((uid) => { const submissions = (byUser.get(uid) ?? []).sort((a, b) => timestampToMillis(b.submittedAt) - timestampToMillis(a.submittedAt)); return { uid, displayName: displayNames[uid] || "Anonymous keeper", latestSubmission: submissions[0], submissionCount: submissions.length }; }).filter((item) => Boolean(item.latestSubmission)).sort((a, b) => timestampToMillis(b.latestSubmission.submittedAt) - timestampToMillis(a.latestSubmission.submittedAt));
}

async function contributorAlreadyThanked(uid: string): Promise<boolean> {
  const conversations = await getUserSubmissionConversations(uid); if (!conversations.length) return false;
  const checks = await Promise.all(conversations.map(async (conversation) => { try { const messages = await getSubmissionConversationMessages(conversation.id); return messages.some((message) => message.senderRole === "creator" && message.message.startsWith("🐍 Thank you for helping build Tiny Titans!")); } catch { return false; } }));
  return checks.some(Boolean);
}

export async function thankContributor(contributor: HistoricalContributor, senderId: string): Promise<"sent" | "already-sent"> {
  if (await contributorAlreadyThanked(contributor.uid)) return "already-sent";
  const source = contributor.latestSubmission; const conversation = await ensureSubmissionConversation({ submissionType: source.submissionType, submissionId: source.submissionId, submitterUid: contributor.uid, submissionTitle: source.title, submissionStatus: source.status });
  const message = `🐍 Thank you for helping build Tiny Titans!\n\nYour contribution${contributor.submissionCount > 1 ? "s" : ""} has helped us make the reptile knowledge base more useful for keepers. We genuinely appreciate you taking the time to share your experience, evidence or knowledge with us.\n\nThank you for being part of the community. ❤️\n\n— Tiny Titans`;
  const messageId = await sendSubmissionConversationMessage({ conversationId: conversation.id, senderId, senderRole: "creator", message });
  return messageId ? "sent" : "sent";
}
