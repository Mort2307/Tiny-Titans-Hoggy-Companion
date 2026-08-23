import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";

export type ConsentCensus = { registered: number; setupComplete: number; incomplete: number; analytics: number; location: number; productUpdates: number; communityHusbandry: number; anyCommunityConsent: number; contributorsWithSnakes: number; activeToday: number; activeWeek: number; activeMonth: number; locations: number };
export type NetworkCensus = { mentors: number; verifiedMentors: number; mentorApplications: number; pendingMentorApplications: number; mentorshipRequests: number; pendingMentorshipRequests: number; acceptedMentorships: number; activeWorkspaces: number };
export type CommunityActivityCensus = { morphSubmissions: number; pendingMorphSubmissions: number; bugReports: number; openBugReports: number; feedback: number; newFeedback: number; founderApplications: number; pendingFounderApplications: number };
export type CreatorCommunityIntelligence = { consent: ConsentCensus; network: NetworkCensus; activity: CommunityActivityCensus; generatedAt: number; unavailableSources: string[] };
type AnyRecord = Record<string, unknown>;
function truthy(record: AnyRecord, key: string): boolean { return record[key] === true; }
function timestampMillis(value: unknown): number | null { if (!value) return null; if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") { const millis = value.toMillis(); return Number.isFinite(millis) ? millis : null; } if (typeof value === "number" && Number.isFinite(value)) return value; const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
function statusOpen(status: unknown): boolean { return !["Resolved", "Closed", "Archived", "Rejected", "Declined", "cancelled", "completed"].includes(String(status)); }

async function safeCollection(path: string, unavailableSources: string[]) {
  try { return await getDocs(collection(db, path)); }
  catch { unavailableSources.push(path); return null; }
}

export async function getCreatorCommunityIntelligence(): Promise<CreatorCommunityIntelligence> {
  const unavailableSources: string[] = [];
  const usersSnapshot = await getDocs(collection(db, "users"));
  const results = await Promise.all([
    safeCollection("mentors", unavailableSources),
    safeCollection("mentorApplications", unavailableSources),
    safeCollection("mentorshipRequests", unavailableSources),
    safeCollection("morphImageSubmissions", unavailableSources),
    safeCollection("issueReports", unavailableSources),
    safeCollection("feedback", unavailableSources),
    safeCollection("founderApplications", unavailableSources),
  ]);
  const [mentorsSnapshot, mentorApplicationsSnapshot, requestsSnapshot, morphSnapshot, reportsSnapshot, feedbackSnapshot, founderSnapshot] = results;
  const now = Date.now(); const day = now - 86400000; const week = now - 7 * 86400000; const month = now - 30 * 86400000;
  let setupComplete = 0, analytics = 0, location = 0, productUpdates = 0, communityHusbandry = 0, anyCommunityConsent = 0, contributorsWithSnakes = 0, activeToday = 0, activeWeek = 0, activeMonth = 0, locations = 0;
  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const user = userDoc.data() as AnyRecord;
    let privacy;
    try { privacy = await getPrivacyPreferences(userDoc.id); } catch { privacy = null; }
    if (truthy(user, "setupComplete")) setupComplete += 1;
    if (privacy?.anonymousAnalytics === true) analytics += 1;
    if (privacy?.communityLocation === true) location += 1;
    if (privacy?.productUpdates === true) productUpdates += 1;
    if (privacy?.communityHusbandryData === true) communityHusbandry += 1;
    if (privacy && (privacy.anonymousAnalytics === true || privacy.communityLocation === true || privacy.communityHusbandryData === true)) anyCommunityConsent += 1;
    const lastActive = timestampMillis(user.lastActiveAt);
    if (lastActive !== null) { if (lastActive >= day) activeToday += 1; if (lastActive >= week) activeWeek += 1; if (lastActive >= month) activeMonth += 1; }
    try {
      const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
      if (privacy?.communityHusbandryData === true && !snakesSnapshot.empty) contributorsWithSnakes += 1;
    } catch { if (!unavailableSources.includes("users/{uid}/snakes")) unavailableSources.push("users/{uid}/snakes"); }
    const approx = user.approximateLocation as AnyRecord | undefined;
    if (privacy?.communityLocation === true && truthy(approx ?? {}, "visibleToCreator") && String(approx?.city ?? "").trim() && String(approx?.country ?? "").trim()) locations += 1;
  }));
  const mentors = mentorsSnapshot?.docs.filter((doc) => statusOpen((doc.data() as AnyRecord).status)) ?? [];
  const mentorApplications = mentorApplicationsSnapshot?.docs ?? []; const requests = requestsSnapshot?.docs ?? []; const morph = morphSnapshot?.docs ?? []; const reports = reportsSnapshot?.docs ?? []; const feedback = feedbackSnapshot?.docs ?? []; const founder = founderSnapshot?.docs ?? [];
  return {
    consent: { registered: usersSnapshot.size, setupComplete, incomplete: Math.max(0, usersSnapshot.size - setupComplete), analytics, location, productUpdates, communityHusbandry, anyCommunityConsent, contributorsWithSnakes, activeToday, activeWeek, activeMonth, locations },
    network: { mentors: mentors.length, verifiedMentors: mentors.filter((doc) => { const data = doc.data() as AnyRecord; return truthy(data, "verified") || truthy(data, "verificationApproved"); }).length, mentorApplications: mentorApplications.length, pendingMentorApplications: mentorApplications.filter((doc) => String((doc.data() as AnyRecord).status) === "Pending").length, mentorshipRequests: requests.length, pendingMentorshipRequests: requests.filter((doc) => ["sent", "pending"].includes(String((doc.data() as AnyRecord).status))).length, acceptedMentorships: requests.filter((doc) => String((doc.data() as AnyRecord).status) === "accepted").length, activeWorkspaces: 0 },
    activity: { morphSubmissions: morph.length, pendingMorphSubmissions: morph.filter((doc) => ["Pending", "NeedsInfo"].includes(String((doc.data() as AnyRecord).status))).length, bugReports: reports.length, openBugReports: reports.filter((doc) => (doc.data() as AnyRecord).archived !== true && statusOpen((doc.data() as AnyRecord).status)).length, feedback: feedback.length, newFeedback: feedback.filter((doc) => !((doc.data() as AnyRecord).status) || String((doc.data() as AnyRecord).status) === "New").length, founderApplications: founder.length, pendingFounderApplications: founder.filter((doc) => String((doc.data() as AnyRecord).status) === "Pending").length },
    generatedAt: now,
    unavailableSources,
  };
}
