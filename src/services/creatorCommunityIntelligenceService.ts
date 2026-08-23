import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export type ConsentCensus = {
  registered: number;
  setupComplete: number;
  incomplete: number;
  analytics: number;
  location: number;
  productUpdates: number;
  communityHusbandry: number;
  anyCommunityConsent: number;
  contributorsWithSnakes: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  locations: number;
};

export type NetworkCensus = {
  mentors: number;
  verifiedMentors: number;
  mentorApplications: number;
  pendingMentorApplications: number;
  mentorshipRequests: number;
  pendingMentorshipRequests: number;
  acceptedMentorships: number;
  activeWorkspaces: number;
};

export type CommunityActivityCensus = {
  morphSubmissions: number;
  pendingMorphSubmissions: number;
  bugReports: number;
  openBugReports: number;
  feedback: number;
  newFeedback: number;
  founderApplications: number;
  pendingFounderApplications: number;
};

export type CreatorCommunityIntelligence = {
  consent: ConsentCensus;
  network: NetworkCensus;
  activity: CommunityActivityCensus;
  generatedAt: number;
};

type AnyRecord = Record<string, unknown>;

function truthy(record: AnyRecord, key: string): boolean {
  return record[key] === true;
}

function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function statusOpen(status: unknown): boolean {
  return !["Resolved", "Closed", "Archived", "Rejected", "Declined", "cancelled", "completed"].includes(String(status));
}

export async function getCreatorCommunityIntelligence(): Promise<CreatorCommunityIntelligence> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const [mentorsSnapshot, mentorApplicationsSnapshot, requestsSnapshot, workspacesSnapshot, morphSnapshot, reportsSnapshot, feedbackSnapshot, founderSnapshot] = await Promise.all([
    getDocs(collection(db, "mentors")),
    getDocs(collection(db, "mentorApplications")),
    getDocs(collection(db, "mentorshipRequests")),
    getDocs(collection(db, "mentorshipWorkspaces")),
    getDocs(collection(db, "morphImageSubmissions")),
    getDocs(collection(db, "issueReports")),
    getDocs(collection(db, "feedback")),
    getDocs(collection(db, "founderApplications")),
  ]);

  const now = Date.now();
  const day = now - 86400000;
  const week = now - 7 * 86400000;
  const month = now - 30 * 86400000;
  let setupComplete = 0;
  let analytics = 0;
  let location = 0;
  let productUpdates = 0;
  let communityHusbandry = 0;
  let anyCommunityConsent = 0;
  let contributorsWithSnakes = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let activeMonth = 0;
  let locations = 0;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const user = userDoc.data() as AnyRecord;
    const preferences = (user.dataCollectionPreferences as AnyRecord | undefined) ?? {};
    const lastActive = timestampMillis(user.lastActiveAt);
    if (truthy(user, "setupComplete")) setupComplete += 1;
    if (truthy(preferences, "analytics")) analytics += 1;
    if (truthy(preferences, "approximateLocation")) location += 1;
    if (truthy(preferences, "productUpdates")) productUpdates += 1;
    if (truthy(preferences, "communityHusbandryData")) communityHusbandry += 1;
    if (truthy(preferences, "communityHusbandryData") || truthy(preferences, "analytics") || truthy(preferences, "approximateLocation")) anyCommunityConsent += 1;
    if (lastActive !== null) {
      if (lastActive >= day) activeToday += 1;
      if (lastActive >= week) activeWeek += 1;
      if (lastActive >= month) activeMonth += 1;
    }
    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
    if (truthy(preferences, "communityHusbandryData") && !snakesSnapshot.empty) contributorsWithSnakes += 1;
    const approx = user.approximateLocation as AnyRecord | undefined;
    if (truthy(preferences, "approximateLocation") && truthy(approx ?? {}, "visibleToCreator") && String(approx?.city ?? "").trim() && String(approx?.country ?? "").trim()) locations += 1;
  }));

  const mentors = mentorsSnapshot.docs.filter((doc) => statusOpen((doc.data() as AnyRecord).status));
  const mentorApplications = mentorApplicationsSnapshot.docs;
  const requests = requestsSnapshot.docs;
  const workspaces = workspacesSnapshot.docs;
  const morph = morphSnapshot.docs;
  const reports = reportsSnapshot.docs;
  const feedback = feedbackSnapshot.docs;
  const founder = founderSnapshot.docs;

  return {
    consent: {
      registered: usersSnapshot.size,
      setupComplete,
      incomplete: Math.max(0, usersSnapshot.size - setupComplete),
      analytics,
      location,
      productUpdates,
      communityHusbandry,
      anyCommunityConsent,
      contributorsWithSnakes,
      activeToday,
      activeWeek,
      activeMonth,
      locations,
    },
    network: {
      mentors: mentors.length,
      verifiedMentors: mentors.filter((doc) => truthy(doc.data() as AnyRecord, "verified") || truthy(doc.data() as AnyRecord, "verificationApproved")).length,
      mentorApplications: mentorApplications.length,
      pendingMentorApplications: mentorApplications.filter((doc) => String((doc.data() as AnyRecord).status) === "Pending").length,
      mentorshipRequests: requests.length,
      pendingMentorshipRequests: requests.filter((doc) => ["sent", "pending"].includes(String((doc.data() as AnyRecord).status))).length,
      acceptedMentorships: requests.filter((doc) => String((doc.data() as AnyRecord).status) === "accepted").length,
      activeWorkspaces: workspaces.filter((doc) => String((doc.data() as AnyRecord).status) === "active").length,
    },
    activity: {
      morphSubmissions: morph.length,
      pendingMorphSubmissions: morph.filter((doc) => ["Pending", "NeedsInfo"].includes(String((doc.data() as AnyRecord).status))).length,
      bugReports: reports.length,
      openBugReports: reports.filter((doc) => (doc.data() as AnyRecord).archived !== true && statusOpen((doc.data() as AnyRecord).status)).length,
      feedback: feedback.length,
      newFeedback: feedback.filter((doc) => !((doc.data() as AnyRecord).status) || String((doc.data() as AnyRecord).status) === "New").length,
      founderApplications: founder.length,
      pendingFounderApplications: founder.filter((doc) => String((doc.data() as AnyRecord).status) === "Pending").length,
    },
    generatedAt: now,
  };
}
