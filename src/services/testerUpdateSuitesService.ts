import type { TesterCheck } from "./testerBotService";
import { createCoreDiagnosticChecks } from "./testerBotService";
import { createNotificationMicroSystemChecks } from "./testerNotificationSuitesService";
import { createMorphLibraryChecks } from "./testerGeneticsSuitesService";
import { createCreatorFunctionChecks } from "./testerCreatorSuitesService";
import { createFamilyAccountChecks } from "./testerFamilySuitesService";
import { createTrackerRegressionChecks } from "./testerSuitesService";
import { createApplicationCoverageChecks } from "./testerApplicationSuitesService";

export type UpdateTarget = { id: string; label: string; path: string };

/**
 * Explicit application page targets. Keep this list aligned with the application's
 * route inventory. Each target gets its own selectable QA section in Creator Centre.
 */
export const UPDATE_TARGETS: UpdateTarget[] = [
  ["/", "/"], ["/account", "/account"], ["/account/billing", "/account/billing"], ["/plans", "/plans"],
  ["/paid/marketplace", "/paid/marketplace"], ["/paid/support", "/paid/support"], ["/paid/timeline", "/paid/timeline"], ["/paid/*", "/paid/*"],
  ["/account/family", "/account/family"], ["/account/family/manage", "/account/family/manage"], ["/account/family/review", "/account/family/review"],
  ["/account/family/history", "/account/family/history"], ["/account/family/join", "/account/family/join"], ["/account/profile", "/account/profile"],
  ["/account/security", "/account/security"], ["/account/settings", "/account/settings"], ["/account/data-privacy", "/account/data-privacy"],
  ["/account/intelligence", "/account/intelligence"], ["/titan-intelligence", "/titan-intelligence"],
  ["/titan-intelligence/feature/:featureId", "/titan-intelligence/feature/:featureId"], ["/account/personalise", "/account/personalise"],
  ["/reminders", "/reminders"], ["/reminders/:kind", "/reminders/:kind"], ["/snakes", "/snakes"], ["/reptile-room", "/reptile-room"],
  ["/snakes/new", "/snakes/new"], ["/snakes/:id", "/snakes/:id"], ["/snakes/:id/master-record", "/snakes/:id/master-record"],
  ["/snakes/:id/timeline", "/snakes/:id/timeline"], ["/snakes/:id/edit", "/snakes/:id/edit"], ["/morph-library", "/morph-library"],
  ["/morph-library/:morphId/gallery", "/morph-library/:morphId/gallery"], ["/morph-library/:morphId", "/morph-library/:morphId"],
  ["/morph-library/evidence", "/morph-library/evidence"], ["/calculator", "/calculator"], ["/sandbox", "/sandbox"], ["/knowledge-base", "/knowledge-base"],
  ["/keeper-handbook", "/keeper-handbook"], ["/behaviour-observatory", "/behaviour-observatory"], ["/behaviour-observatory/submit", "/behaviour-observatory/submit"],
  ["/make-contribution", "/make-contribution"], ["/submit-species", "/submit-species"], ["/learn", "/learn"], ["/learn/topics", "/learn/topics"],
  ["/learn/topic/:id", "/learn/topic/:id"], ["/adaptive-learning", "/adaptive-learning"], ["/challenge", "/challenge"],
  ["/challenge/topic/:id", "/challenge/topic/:id"], ["/learn/achievements", "/learn/achievements"], ["/feeding", "/feeding"],
  ["/feeding/preparation", "/feeding/preparation"], ["/feeding/:id", "/feeding/:id"], ["/snakes/:id/feeding", "/snakes/:id/feeding"],
  ["/shedding", "/shedding"], ["/shedding/:id", "/shedding/:id"], ["/snakes/:id/shedding", "/snakes/:id/shedding"],
  ["/weights", "/weights"], ["/weights/:id", "/weights/:id"], ["/snakes/:id/weights", "/snakes/:id/weights"], ["/health", "/health"],
  ["/health/:id", "/health/:id"], ["/snakes/:id/health", "/snakes/:id/health"], ["/behaviour", "/behaviour"], ["/behaviour/:id", "/behaviour/:id"],
  ["/snakes/:id/behaviour", "/snakes/:id/behaviour"], ["/husbandry", "/husbandry"], ["/husbandry/:id", "/husbandry/:id"],
  ["/enclosure-intelligence", "/enclosure-intelligence"], ["/enclosure-intelligence/:id", "/enclosure-intelligence/:id"],
  ["/snakes/:id/enclosure", "/snakes/:id/enclosure"], ["/breeding", "/breeding"], ["/breeding/academy", "/breeding/academy"],
  ["/breeding/readiness", "/breeding/readiness"], ["/breeding/timeline", "/breeding/timeline"], ["/breeding/cycle", "/breeding/cycle"],
  ["/breeding/production", "/breeding/production"], ["/community", "/community"], ["/community/vivarium-showcase", "/community/vivarium-showcase"],
  ["/community/features", "/community/features"], ["/community/mentorship", "/community/mentorship"], ["/community/mentorship/mentors", "/community/mentorship/mentors"],
  ["/community/mentorship/mentor/:mentorId", "/community/mentorship/mentor/:mentorId"], ["/community/mentorship/request/:mentorId", "/community/mentorship/request/:mentorId"],
  ["/community/mentorship/request-sent/:requestId", "/community/mentorship/request-sent/:requestId"], ["/community/mentorship/workspace/:workspaceId", "/community/mentorship/workspace/:workspaceId"],
  ["/community/mentorship/my-mentees", "/community/mentorship/my-mentees"], ["/community/mentorship/mentor-dashboard", "/community/mentorship/mentor-dashboard"],
  ["/community/mentorship/become-a-mentor", "/community/mentorship/become-a-mentor"], ["/community/mentorship/intelligence", "/community/mentorship/intelligence"],
  ["/community/mentorship/legacy/:destination", "/community/mentorship/legacy/:destination"], ["/community/keeper-meets-breeder", "/community/keeper-meets-breeder"],
  ["/community/keeper-meets-breeder/mentors", "/community/keeper-meets-breeder/mentors"], ["/community/keeper-meets-breeder/mentor/:mentorId", "/community/keeper-meets-breeder/mentor/:mentorId"],
  ["/community/wall-of-titans", "/community/wall-of-titans"], ["/wall-of-titans", "/wall-of-titans"], ["/report-bug", "/report-bug"],
  ["/report-issue", "/report-issue"], ["/feedback", "/feedback"], ["/my-issue-reports", "/my-issue-reports"], ["/conversations", "/conversations"],
  ["/conversations/submissions", "/conversations/submissions"], ["/founder", "/founder"], ["/become-a-titan", "/become-a-titan"], ["/creator", "/creator"],
  ["/creator/species-preview", "/creator/species-preview"], ["/creator/morph-library", "/creator/morph-library"], ["/creator/privacy-data", "/creator/privacy-data"],
  ["/creator/benchmarks", "/creator/benchmarks"], ["/creator/submissions", "/creator/submissions"], ["/creator/species-submissions", "/creator/species-submissions"],
  ["/creator/vivarium-showcase", "/creator/vivarium-showcase"], ["/creator/observations", "/creator/observations"], ["/creator/morph-terminology", "/creator/morph-terminology"],
  ["/creator/issues", "/creator/issues"], ["/creator/community", "/creator/community"], ["/creator/conversations", "/creator/conversations"],
  ["/creator/submission-conversations", "/creator/submission-conversations"], ["/creator/mentor-review", "/creator/mentor-review"], ["/creator/tester", "/creator/tester"],
  ["/creator/tester/paid-tiers", "/creator/tester/paid-tiers"], ["/creator/tester/:botId", "/creator/tester/:botId"], ["/educator", "/educator"],
].map(([path, label]) => ({
  id: path.replace(/^\//, "root-").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "root",
  label: path === "/" ? "Home / Dashboard" : label,
  path,
}));

function buildTargetCheck(target: UpdateTarget): TesterCheck {
  return {
    checkId: `update-page-${target.id}`,
    name: `Update target: ${target.label}`,
    category: "application",
    severity: "high",
    run: async () => {
      const exact = UPDATE_TARGETS.filter((candidate) => candidate.path === target.path);
      return exact.length === 1
        ? { status: "pass", message: `${target.path} has a dedicated update QA target.` }
        : { status: "fail", message: `${target.path} expected one dedicated QA target but found ${exact.length}.` };
    },
  };
}

export function createAllPageTargetChecks(): TesterCheck[] {
  const paths = UPDATE_TARGETS.map((target) => target.path);
  const duplicatePaths = [...new Set(paths.filter((path, index) => paths.indexOf(path) !== index))];
  return [
    {
      checkId: "update-page-inventory",
      name: "Update page inventory is internally consistent",
      category: "application",
      severity: "critical",
      run: async () => duplicatePaths.length
        ? { status: "fail", message: `Duplicate update targets: ${duplicatePaths.join(", ")}.` }
        : { status: "pass", message: `${UPDATE_TARGETS.length} page-level update targets are registered.` },
    },
    ...UPDATE_TARGETS.map(buildTargetCheck),
  ];
}

export function createUpdateSmokeChecks(uid: string): TesterCheck[] {
  return [
    ...createApplicationCoverageChecks(),
    ...createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: true }).filter((check) =>
      ["auth-current-user", "auth-token-refresh", "account-profile-readable", "firebase-user-scope"].includes(check.checkId),
    ),
    ...createNotificationMicroSystemChecks(),
    ...createMorphLibraryChecks(),
    ...createTrackerRegressionChecks(uid),
    ...createCreatorFunctionChecks(),
    ...createFamilyAccountChecks(uid),
  ];
}
