import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";
import { resolveCommunityLocation } from "./communityLocationResolver";

export type ConsentCensus = {
  registered: number;
  setupComplete: number;
  incomplete: number;
  analytics: number;
  analyticsOff: number;
  analyticsUnknown: number;
  location: number;
  locationOff: number;
  locationUnknown: number;
  locationInvalid: number;
  productUpdates: number;
  productUpdatesUnknown: number;
  communityHusbandry: number;
  communityHusbandryOff: number;
  communityHusbandryUnknown: number;
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

export type IntelligenceSource = {
  source: string;
  available: boolean;
  reason: string;
  count?: number;
};

export type CreatorCommunityIntelligence = {
  consent: ConsentCensus;
  network: NetworkCensus;
  activity: CommunityActivityCensus;
  sources: IntelligenceSource[];
  generatedAt: number;
  unavailableSources: string[];
};

type AnyRecord = Record<string, unknown>;

function truthy(record: AnyRecord, key: string): boolean { return record[key] === true; }

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

function hasValidCoordinates(location: AnyRecord | undefined): boolean {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

async function isMapEligibleLocation(location: AnyRecord | undefined): Promise<boolean> {
  if (!location?.visibleToCreator) return false;
  const city = String(location.city ?? "").trim();
  const country = String(location.country ?? "").trim();
  if (!city || !country) return false;
  if (hasValidCoordinates(location)) return true;
  try {
    await resolveCommunityLocation(city, country);
    return true;
  } catch {
    return false;
  }
}

async function safeCollection(path: string, unavailableSources: string[]) {
  try { return await getDocs(collection(db, path)); }
  catch { unavailableSources.push(path); return null; }
}

const emptyResult = (unavailableSources: string[]): CreatorCommunityIntelligence => ({
  consent: {
    registered: 0, setupComplete: 0, incomplete: 0, analytics: 0, analyticsOff: 0, analyticsUnknown: 0,
    location: 0, locationOff: 0, locationUnknown: 0, locationInvalid: 0, productUpdates: 0, productUpdatesUnknown: 0,
    communityHusbandry: 0, communityHusbandryOff: 0, communityHusbandryUnknown: 0,
    anyCommunityConsent: 0, contributorsWithSnakes: 0, activeToday: 0, activeWeek: 0, activeMonth: 0, locations: 0,
  },
  network: { mentors: 0, verifiedMentors: 0, mentorApplications: 0, pendingMentorApplications: 0, mentorshipRequests: 0, pendingMentorshipRequests: 0, acceptedMentorships: 0, activeWorkspaces: 0 },
  activity: { morphSubmissions: 0, pendingMorphSubmissions: 0, bugReports: 0, openBugReports: 0, feedback: 0, newFeedback: 0, founderApplications: 0, pendingFounderApplications: 0 },
  sources: [{ source: "users", available: false, reason: "Creator account cannot currently read the registered-user aggregate." }],
  generatedAt: Date.now(),
  unavailableSources,
});

export async function getCreatorCommunityIntelligence(): Promise<CreatorCommunityIntelligence> {
  const unavailableSources: string[] = [];
  let usersSnapshot;
  try { usersSnapshot = await getDocs(collection(db, "users")); }
  catch { unavailableSources.push("users"); return emptyResult(unavailableSources); }

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
  const now = Date.now();
  const day = now - 86400000;
  const week = now - 7 * 86400000;
  const month = now - 30 * 86400000;

  let setupComplete = 0;
  let analytics = 0;
  let analyticsUnknown = 0;
  let location = 0;
  let locationUnknown = 0;
  let locationInvalid = 0;
  let productUpdates = 0;
  let productUpdatesUnknown = 0;
  let communityHusbandry = 0;
  let communityHusbandryUnknown = 0;
  let anyCommunityConsent = 0;
  let contributorsWithSnakes = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let activeMonth = 0;
  let locations = 0;
  let privacyReadable = 0;

  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const user = userDoc.data() as AnyRecord;
    let privacy: Awaited<ReturnType<typeof getPrivacyPreferences>> | null = null;
    try { privacy = await getPrivacyPreferences(userDoc.id); privacyReadable += 1; }
    catch { unavailableSources.push("users/{uid}/settings/privacy"); }

    if (truthy(user, "setupComplete")) setupComplete += 1;

    if (privacy) {
      if (privacy.anonymousAnalytics === true) analytics += 1;
      if (privacy.communityLocation === true) {
        location += 1;
        const approx = user.approximateLocation as AnyRecord | undefined;
        if (await isMapEligibleLocation(approx)) locations += 1;
        else locationInvalid += 1;
      }
      if (privacy.productUpdates === true) productUpdates += 1;
      if (privacy.communityHusbandryData === true) communityHusbandry += 1;
      if (privacy.anonymousAnalytics === true || privacy.communityLocation === true || privacy.communityHusbandryData === true) anyCommunityConsent += 1;

      if (privacy.communityHusbandryData === true) {
        try {
          const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes"));
          if (!snakesSnapshot.empty) contributorsWithSnakes += 1;
        } catch {
          if (!unavailableSources.includes("users/{uid}/snakes")) unavailableSources.push("users/{uid}/snakes");
        }
      }
    } else {
      analyticsUnknown += 1;
      locationUnknown += 1;
      productUpdatesUnknown += 1;
      communityHusbandryUnknown += 1;
    }

    const lastActive = timestampMillis(user.lastActiveAt);
    if (lastActive !== null) {
      if (lastActive >= day) activeToday += 1;
      if (lastActive >= week) activeWeek += 1;
      if (lastActive >= month) activeMonth += 1;
    }
  }));

  const mentors = mentorsSnapshot?.docs.filter((doc) => statusOpen((doc.data() as AnyRecord).status)) ?? [];
  const mentorApplications = mentorApplicationsSnapshot?.docs ?? [];
  const requests = requestsSnapshot?.docs ?? [];
  const morph = morphSnapshot?.docs ?? [];
  const reports = reportsSnapshot?.docs ?? [];
  const feedback = feedbackSnapshot?.docs ?? [];
  const founder = founderSnapshot?.docs ?? [];

  const sources: IntelligenceSource[] = [
    { source: "users", available: true, reason: "Registered-account aggregate is available to Creator Centre.", count: usersSnapshot.size },
    { source: "users/{uid}/settings/privacy", available: privacyReadable === usersSnapshot.size, reason: privacyReadable === usersSnapshot.size ? "Privacy records are readable for the registered population." : `${privacyReadable} of ${usersSnapshot.size} privacy records were readable; restricted records are shown as unknown, not opted-out.`, count: privacyReadable },
    { source: "users/{uid}/snakes", available: !unavailableSources.includes("users/{uid}/snakes"), reason: unavailableSources.includes("users/{uid}/snakes") ? "One or more snake subcollections were restricted or unavailable." : "Snake profile availability is readable for eligible community contributors." },
    { source: "community locations", available: true, reason: "Location coverage uses the same city/country plus valid-coordinate or geocodable-location rules as the community globe.", count: locations },
    { source: "mentors", available: Boolean(mentorsSnapshot), reason: mentorsSnapshot ? "Mentor records available." : "Mentor collection is restricted or unavailable.", count: mentors.length },
    { source: "mentorApplications", available: Boolean(mentorApplicationsSnapshot), reason: mentorApplicationsSnapshot ? "Mentor application records available." : "Mentor applications are restricted or unavailable.", count: mentorApplications.length },
    { source: "mentorshipRequests", available: Boolean(requestsSnapshot), reason: requestsSnapshot ? "Mentorship request records available." : "Mentorship requests are restricted or unavailable.", count: requests.length },
    { source: "morphImageSubmissions", available: Boolean(morphSnapshot), reason: morphSnapshot ? "Morph submission records available to Creator Centre." : "Morph submissions are restricted or unavailable.", count: morph.length },
    { source: "issueReports", available: Boolean(reportsSnapshot), reason: reportsSnapshot ? "Bug and issue records available." : "Bug reports are restricted or unavailable.", count: reports.length },
    { source: "feedback", available: Boolean(feedbackSnapshot), reason: feedbackSnapshot ? "Feedback records available." : "Feedback records are restricted or unavailable.", count: feedback.length },
    { source: "founderApplications", available: Boolean(founderSnapshot), reason: founderSnapshot ? "Founder application records available." : "Founder applications are restricted or unavailable.", count: founder.length },
  ];

  return {
    consent: {
      registered: usersSnapshot.size,
      setupComplete,
      incomplete: Math.max(0, usersSnapshot.size - setupComplete),
      analytics,
      analyticsOff: Math.max(0, usersSnapshot.size - analytics - analyticsUnknown),
      analyticsUnknown,
      location,
      locationOff: Math.max(0, usersSnapshot.size - location - locationUnknown),
      locationUnknown,
      locationInvalid,
      productUpdates,
      productUpdatesUnknown,
      communityHusbandry,
      communityHusbandryOff: Math.max(0, usersSnapshot.size - communityHusbandry - communityHusbandryUnknown),
      communityHusbandryUnknown,
      anyCommunityConsent,
      contributorsWithSnakes,
      activeToday,
      activeWeek,
      activeMonth,
      locations,
    },
    network: {
      mentors: mentors.length,
      verifiedMentors: mentors.filter((doc) => {
        const record = doc.data() as AnyRecord;
        return truthy(record, "verified") || truthy(record, "verificationApproved");
      }).length,
      mentorApplications: mentorApplications.length,
      pendingMentorApplications: mentorApplications.filter((doc) => String((doc.data() as AnyRecord).status) === "Pending").length,
      mentorshipRequests: requests.length,
      pendingMentorshipRequests: requests.filter((doc) => ["sent", "pending"].includes(String((doc.data() as AnyRecord).status))).length,
      acceptedMentorships: requests.filter((doc) => String((doc.data() as AnyRecord).status) === "accepted").length,
      activeWorkspaces: 0,
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
    sources,
    generatedAt: now,
    unavailableSources: [...new Set(unavailableSources)],
  };
}
