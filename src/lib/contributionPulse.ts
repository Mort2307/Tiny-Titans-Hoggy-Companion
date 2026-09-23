import type { ContributionSourceData, PersonalContribution } from "../types/contributionPulse";
import type { KeeperObservation } from "../types/keeperObservation";
import type { Feedback } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";
import type { MorphImageSubmission } from "../types/morphSubmission";

export function safeContributionCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normaliseContributionStatus(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function contributionTimestamp(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatContributionDate(value: unknown): string {
  const millis = contributionTimestamp(value);
  if (!millis) return "Date not recorded";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(millis);
}

export function buildContributionCounts(data: ContributionSourceData) {
  const { observations, feedback, bugs, morphSubmissions, morphImageSubmissions, founderApplications, snakes, privacy } = data;
  const weights = snakes.reduce((total, snake) => total + safeContributionCount(snake.weightHistory?.length), 0);
  const feedings = snakes.reduce((total, snake) => total + safeContributionCount(snake.feedingHistory?.length), 0);
  const sheds = snakes.reduce((total, snake) => total + safeContributionCount(snake.shedHistory?.length), 0);
  const health = snakes.reduce((total, snake) => total + safeContributionCount(snake.healthHistory?.length), 0);
  const intelligenceRecords = privacy?.communityHusbandryData === true ? weights + feedings + sheds + health : 0;
  const contributions = observations.length + feedback.length + bugs.length + morphSubmissions.length + morphImageSubmissions.length + founderApplications.length;
  return { contributions, observations: observations.length, feedback: feedback.length, bugs: bugs.length, morphs: morphSubmissions.length, morphImages: morphImageSubmissions.length, founders: founderApplications.length, intelligenceRecords, snakes: snakes.length, weights, feedings, sheds, health };
}

export function buildPersonalContributions(data: ContributionSourceData, counts: ReturnType<typeof buildContributionCounts>): PersonalContribution[] {
  const items: PersonalContribution[] = [];
  const { observations, feedback, bugs, morphSubmissions, morphImageSubmissions, founderApplications } = data;
  observations.forEach((item) => {
    const value = item as KeeperObservation & Record<string, unknown>;
    items.push({ id: `observation-${String(item.id)}`, category: "Behaviour Observatory", title: String(value.title || value.behaviourName || value.observationTitle || value.primaryCategory || "Behaviour observation"), snippet: String(value.description || value.observation || "Keeper-submitted observation."), status: normaliseContributionStatus(item.status), link: "/behaviour-observatory", createdAt: value.createdAt || value.submittedAt || value.updatedAt });
  });
  feedback.forEach((item) => {
    const value = item as Feedback & Record<string, unknown>;
    items.push({ id: `feedback-${String(value.id || value.createdAt || items.length)}`, category: "Feedback", title: String(value.subject || value.title || "Feedback sent to Tiny Titans"), snippet: String(value.message || value.description || "Feedback contribution."), status: normaliseContributionStatus(value.status), link: "/feedback", createdAt: value.createdAt || value.updatedAt });
  });
  bugs.forEach((item) => {
    const value = item as ReportIssue & Record<string, unknown>;
    items.push({ id: `bug-${String(value.id || value.createdAt || items.length)}`, category: "Bug report", title: String(value.title || value.subject || "Bug report"), snippet: String(value.description || value.details || "Issue reported to Tiny Titans."), status: normaliseContributionStatus(value.status), link: "/my-issue-reports", createdAt: value.createdAt || value.updatedAt });
  });
  morphSubmissions.forEach((item) => items.push({ id: `morph-${item.id}`, category: "Morph Library", title: item.submittedName, snippet: item.description || "Keeper-submitted Morph Library evidence or terminology.", status: normaliseContributionStatus(item.status), link: "/morph-library", createdAt: item.createdAt }));
  morphImageSubmissions.forEach((item) => {
    const value = item as MorphImageSubmission & Record<string, unknown>;
    items.push({ id: `morph-image-${item.id}`, category: "Morph image", title: String(value.morphName || value.morphId || "Morph image submission"), snippet: String(value.description || "Community reference image submitted to the Morph Library."), status: normaliseContributionStatus(value.status), link: "/morph-library", createdAt: value.createdAt || value.submittedAt || value.reviewedAt });
  });
  founderApplications.forEach((item) => items.push({ id: `founder-${item.id}`, category: "Founder / Support", title: "Founder application", snippet: "Your Founder/support contribution to Tiny Titans.", status: normaliseContributionStatus(item.status), link: "/founder", createdAt: item.createdAt || item.updatedAt }));
  if (counts.intelligenceRecords > 0) items.push({ id: "intelligence-aggregate", category: "Tiny Titans Intelligence", title: `${counts.intelligenceRecords} records contributing globally`, snippet: `${counts.weights} weight, ${counts.feedings} feeding, ${counts.sheds} shed and ${counts.health} health records are contributing to community intelligence because you enabled optional husbandry contribution. The individual records remain yours and are not publicly displayed.`, status: "Enabled by you", link: "/account/data-privacy" });
  return items.sort((a,b)=>contributionTimestamp(b.createdAt)-contributionTimestamp(a.createdAt)).slice(0,80);
}
