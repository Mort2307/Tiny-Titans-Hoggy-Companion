import type { CreatorCommunityIntelligence } from "../services/creatorCommunityIntelligenceService";

export type CommunityTileKey =
  | "consent" | "activity" | "network" | "locations"
  | "engagement" | "operations" | "mentors" | "contributions";

export type CommunityTile = {
  key: CommunityTileKey;
  icon: import("../types/tinyTitansIcon").TinyTitansIconName;
  value: string;
  label: string;
};

export type CommunityRoute = { label: string; path: string };

const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";

export const COMMUNITY_QUEUE_ROUTES: Partial<Record<CommunityTileKey, CommunityRoute>> = {
  operations: { label: "Open Community Operations", path: "/creator/issues" },
  contributions: { label: "Open Morph Submission Review", path: "/creator/submissions" },
  mentors: { label: "Open Mentor Review", path: "/creator/mentor-review" },
  network: { label: "Open Mentor Review", path: "/creator/mentor-review" },
};

export function buildCommunityTiles(data: CreatorCommunityIntelligence): CommunityTile[] {
  const { consent, network, activity } = data;
  return [
    { key: "consent", icon: "health", value: pct(consent.anyCommunityConsent, consent.registered), label: "Community consent" },
    { key: "activity", icon: "timeline", value: fmt(consent.activeWeek), label: "Active this week" },
    { key: "network", icon: "mentorship", value: fmt(network.mentors), label: "Mentor network" },
    { key: "locations", icon: "community", value: fmt(consent.locations), label: "Map-represented users" },
    { key: "engagement", icon: "reptiles", value: fmt(consent.contributorsWithSnakes), label: "Contributing keepers" },
    { key: "operations", icon: "testing", value: fmt(activity.openBugReports), label: "Community operations" },
    { key: "mentors", icon: "mentorship", value: fmt(network.mentorshipRequests), label: "Mentorship pipeline" },
    { key: "contributions", icon: "contribution", value: fmt(activity.feedback + activity.morphSubmissions), label: "Community contributions" },
  ];
}

export type CommunityDetail = {
  title: string;
  why: string;
  rows: Array<[string, number]>;
};

export function buildCommunityDetail(
  data: CreatorCommunityIntelligence,
  key: CommunityTileKey,
): CommunityDetail {
  const { consent, network, activity } = data;
  const definitions: Record<CommunityTileKey, CommunityDetail> = {
    consent: {
      title: "Permission & data coverage",
      why: "Shows the population eligible for each intelligence layer. A permission being OFF is not an error; it means that data must not be used for that purpose.",
      rows: [
        ["Registered users", consent.registered], ["Setup complete", consent.setupComplete], ["Incomplete setup", consent.incomplete],
        ["Analytics consent ON", consent.analytics], ["Analytics consent OFF", consent.analyticsOff],
        ["Location consent ON", consent.location], ["Location consent OFF", consent.locationOff],
        ["Location records requiring repair", consent.locationInvalid], ["Product updates ON", consent.productUpdates],
        ["Community husbandry ON", consent.communityHusbandry], ["Community husbandry OFF", consent.communityHusbandryOff],
        ["Any community consent", consent.anyCommunityConsent], ["Eligible keepers with reptile data", consent.contributorsWithSnakes],
      ],
    },
    activity: {
      title: "Community activity",
      why: "Activity is an engagement signal, not a statement about husbandry quality. It helps identify whether Tiny Titans is being used regularly.",
      rows: [
        ["Active today", consent.activeToday], ["Active this week", consent.activeWeek], ["Active this month", consent.activeMonth],
        ["Registered users", consent.registered], ["Setup complete", consent.setupComplete],
        ["Contributing keepers", consent.contributorsWithSnakes],
      ],
    },
    network: {
      title: "Mentor & mentorship network",
      why: "Shows the health of the keeper-to-keeper support network and where creator intervention may be useful.",
      rows: [
        ["Mentor profiles", network.mentors], ["Verified mentors", network.verifiedMentors],
        ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications],
        ["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests],
        ["Accepted mentorships", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces],
      ],
    },
    locations: {
      title: "Community map coverage",
      why: "A map-represented user has location consent, a usable city/country and either stored valid coordinates or a successfully geocodable city-level fallback. Multiple users may share one community area.",
      rows: [
        ["Location consent ON", consent.location], ["Map-represented users", consent.locations],
        ["Location records requiring repair", consent.locationInvalid], ["Location permission OFF", consent.locationOff],
        ["Registered users", consent.registered],
      ],
    },
    engagement: {
      title: "Keeper participation",
      why: "Identifies the population that can legitimately contribute husbandry intelligence without exposing individual husbandry records here.",
      rows: [
        ["Contributing keepers", consent.contributorsWithSnakes], ["Community husbandry consent", consent.communityHusbandry],
        ["Community husbandry not enabled", consent.communityHusbandryOff], ["Registered users", consent.registered],
        ["Setup complete", consent.setupComplete],
      ],
    },
    operations: {
      title: "Community operations",
      why: "These are live workflow queues. They tell you what is arriving and what still needs attention without exposing private user records.",
      rows: [
        ["Bug / issue reports", activity.bugReports], ["Open bug reports", activity.openBugReports],
        ["Feedback records", activity.feedback], ["New feedback", activity.newFeedback],
        ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions],
        ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications],
      ],
    },
    mentors: {
      title: "Mentorship pipeline",
      why: "Shows demand versus available mentorship capacity so you can spot bottlenecks, unanswered requests and opportunities to recruit or support mentors.",
      rows: [
        ["Mentorship requests", network.mentorshipRequests], ["Pending requests", network.pendingMentorshipRequests],
        ["Accepted", network.acceptedMentorships], ["Active workspaces", network.activeWorkspaces],
        ["Mentor applications", network.mentorApplications], ["Pending mentor applications", network.pendingMentorApplications],
        ["Verified mentors", network.verifiedMentors],
      ],
    },
    contributions: {
      title: "Community contribution footprint",
      why: "Combines the main creator-facing contribution streams so you can see where the community is actually feeding information back into Tiny Titans.",
      rows: [
        ["Feedback items", activity.feedback], ["New feedback", activity.newFeedback],
        ["Morph submissions", activity.morphSubmissions], ["Pending morph submissions", activity.pendingMorphSubmissions],
        ["Founder applications", activity.founderApplications], ["Pending founder applications", activity.pendingFounderApplications],
        ["Bug reports", activity.bugReports],
      ],
    },
  };
  return definitions[key];
}

export const formatCommunityNumber = (value: number) => fmt(Number(value));
