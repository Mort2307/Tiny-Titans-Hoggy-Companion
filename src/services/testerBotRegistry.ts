import { hasCreatorTesterClaim } from "./creatorTesterAuthService";
import { createCoreDiagnosticChecks, type TesterCheck } from "./testerBotService";
import { createTrackerRegressionChecks } from "./testerSuitesService";
import { createAccountJourneyChecks, createFeedingChecks, createShedJourneyChecks, createSnakeProfileChecks, createWeightChecks } from "./testerJourneySuitesService";
import { createGeneticsJourneyChecks, createMorphLibraryChecks } from "./testerGeneticsSuitesService";
import { createFeedbackAttachmentChecks } from "./testerFeedbackSuitesService";
import { createNotificationMicroSystemChecks } from "./testerNotificationSuitesService";
import { createCreatorFunctionChecks } from "./testerCreatorSuitesService";
import { createApplicationCoverageChecks, createBreedingPlannerChecks } from "./testerApplicationSuitesService";
import { createFamilyAccountChecks } from "./testerFamilySuitesService";
import { createVisualUxChecks } from "./visualUxBotService";
import { createOverlordIntelligenceChecks } from "./botIntelligenceService";

export type TesterBotId = "creator" | "user" | "app" | "security" | "overlord" | "visual";

export type BotSuiteDefinition = {
  id: string;
  label: string;
  description: string;
  category: string;
  safety: "read-only" | "sandbox";
  build: (uid: string) => Promise<TesterCheck[]> | TesterCheck[];
};

export type BotDefinition = {
  id: TesterBotId;
  label: string;
  icon: string;
  description: string;
  purpose: string;
  suites: BotSuiteDefinition[];
};

const creatorSuites: BotSuiteDefinition[] = [
  { id: "core-diagnostics", label: "Core Diagnostics", description: "Authentication, creator claim, profile and Firebase access.", category: "System", safety: "read-only", build: async (uid) => createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: await hasCreatorTesterClaim(true) }) },
  { id: "creator-functions", label: "Creator Functions", description: "Creator Centre queues, moderation data, community data and approved records.", category: "Creator", safety: "read-only", build: async () => createCreatorFunctionChecks() },
  { id: "notifications", label: "Notifications", description: "Feeding-preparation notification logic, permissions and de-duplication checks.", category: "Notifications", safety: "read-only", build: createNotificationMicroSystemChecks },
  { id: "feedback", label: "Feedback / Attachments", description: "Feedback text, mock image and mock video validation paths.", category: "Feedback", safety: "read-only", build: createFeedbackAttachmentChecks },
  { id: "regression", label: "Tracker Regression", description: "Shared tracker totals and Firebase data-model regression checks.", category: "Regression", safety: "read-only", build: createTrackerRegressionChecks },
  { id: "family-account", label: "Family Account", description: "Owner, invitation, membership, Allow/Deny/Verify permissions, approvals and sandbox isolation checks.", category: "Family", safety: "read-only", build: createFamilyAccountChecks },
  { id: "visual-ux", label: "Visual UX & Design", description: "Rendered visual auditing, Tiny Titans brand consistency, responsive evidence and alternative page concepts.", category: "Visual UX", safety: "read-only", build: createVisualUxChecks },
];

const userSuites: BotSuiteDefinition[] = [
  { id: "account", label: "Account Journey", description: "Account document and setup integrity from a user's perspective.", category: "Account", safety: "read-only", build: createAccountJourneyChecks },
  { id: "snakes", label: "Snake Management", description: "Snake profile readability, required fields and persistence safety.", category: "Snakes", safety: "read-only", build: createSnakeProfileChecks },
  { id: "weights", label: "Weight Tracker", description: "Weight values, dates, units and chronology.", category: "Weights", safety: "read-only", build: createWeightChecks },
  { id: "feeding", label: "Feeding Tracker", description: "Feeding dates, responses and parent-snake links.", category: "Feeding", safety: "read-only", build: createFeedingChecks },
  { id: "shedding", label: "Shed Tracker", description: "Shed dates, status and retained-area integrity.", category: "Sheds", safety: "read-only", build: createShedJourneyChecks },
  { id: "genetics", label: "Genetics", description: "Genetics event tracking and database integrity.", category: "Genetics", safety: "read-only", build: createGeneticsJourneyChecks },
  { id: "morphs", label: "Morph Library", description: "Stable morph IDs, classifications and verification guards.", category: "Morphs", safety: "read-only", build: async () => createMorphLibraryChecks() },
  { id: "breeding", label: "Breeding Planner", description: "Projects, pairings, clutches, hatchlings and safe optional fields.", category: "Breeding", safety: "read-only", build: createBreedingPlannerChecks },
  { id: "trackers", label: "All Tracker Regression", description: "Cross-tracker totals and shared data-model consistency.", category: "Trackers", safety: "read-only", build: createTrackerRegressionChecks },
];

const browserRunnerPendingCheck = (): TesterCheck => ({
  checkId: "app-browser-journey-runner",
  name: "Real browser journey execution",
  category: "application",
  severity: "high",
  run: async () => ({
    status: "blocked",
    message: "Not executed: the real browser interaction runner is not wired yet. Static route inventory must never be reported as proof that a user can click, submit, persist and reach the correct destination.",
  }),
});

const appSuites: BotSuiteDefinition[] = [
  { id: "route-inventory", label: "Route Inventory", description: "Checks the registered application route inventory for duplicates and missing core surfaces.", category: "Routes", safety: "read-only", build: async () => createApplicationCoverageChecks() },
  { id: "tracker-surfaces", label: "Tracker Surfaces", description: "Confirms feeding, preparation, shedding and weight surfaces are represented in QA coverage.", category: "Trackers", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-tracker-surfaces-covered") },
  { id: "navigation-coverage", label: "Navigation Coverage", description: "Combines topology checks with an explicit browser-runner gate. Until real interaction automation is available, that portion remains blocked rather than being falsely marked as passed.", category: "Navigation", safety: "sandbox", build: async () => [...createApplicationCoverageChecks().filter((check) => ["app-route-inventory-complete", "app-core-surfaces-covered"].includes(check.checkId)), browserRunnerPendingCheck()] },
  { id: "learning-community", label: "Learning / Community", description: "Confirms learning, achievement, community and reporting surfaces remain represented.", category: "Surfaces", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => ["app-learning-surfaces-covered", "app-community-surfaces-covered"].includes(check.checkId)) },
  { id: "creator-surfaces", label: "Creator Routes", description: "Confirms Creator-only surfaces are explicitly represented in the application QA inventory.", category: "Creator", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-creator-surfaces-covered") },
];

const securitySuites: BotSuiteDefinition[] = [
  { id: "auth-boundary", label: "Authentication Boundary", description: "Read-only verification of the current authenticated security boundary and token freshness.", category: "Authentication", safety: "read-only", build: async (uid) => createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: await hasCreatorTesterClaim(true) }).filter((check) => ["auth-current-user", "auth-token-refresh"].includes(check.checkId)) },
  { id: "data-scope", label: "User Data Scope", description: "Verifies the bot can read its own user scope without granting it any write capability. Cross-user attack simulation is deliberately blocked until an isolated security sandbox/test identity is wired.", category: "Authorisation", safety: "sandbox", build: async () => [{ checkId: "security-cross-user-sandbox-required", name: "Cross-user data isolation attack simulation", category: "firebase", severity: "critical", run: async () => ({ status: "blocked", message: "Not executed against live data. An isolated security sandbox/test identity is required before attempting cross-user access simulation." }) }] },
  { id: "route-protection", label: "Route Protection", description: "Read-only application route inventory used to identify protected/private surfaces for deeper security automation.", category: "Routes", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-route-inventory-complete") },
  { id: "schema-safety", label: "Data Schema Safety", description: "Read-only checks from the existing tracker and breeding regression suites for unsafe persisted values.", category: "Data", safety: "read-only", build: async (uid) => [...await createSnakeProfileChecks(uid), ...await createBreedingPlannerChecks(uid)].filter((check) => check.severity === "critical") },
];

const overlordSuites: BotSuiteDefinition[] = [
  { id: "full-functional", label: "Full Functional Sweep", description: "Application topology, core diagnostics, trackers, genetics, notifications, family, live rendered intelligence and browser-runner readiness.", category: "Functional", safety: "sandbox", build: async (uid) => [...await createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: false }), ...createApplicationCoverageChecks(), ...await createTrackerRegressionChecks(uid), ...createOverlordIntelligenceChecks(), browserRunnerPendingCheck()] },
  { id: "routes", label: "Routes & Navigation", description: "Route inventory plus an explicit gate for real browser navigation evidence.", category: "Routes", safety: "read-only", build: async () => createApplicationCoverageChecks() },
  { id: "morph-library", label: "Morph Library", description: "Morph database integrity and regional-library coverage checks.", category: "Morphs", safety: "read-only", build: async () => createMorphLibraryChecks() },
  { id: "health-medication", label: "Health & Medication", description: "Health and medication surfaces are included in the functional QA contract without modifying live keeper records.", category: "Health", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => /health|medication/i.test(`${check.checkId} ${check.name}`)) },
  { id: "notifications", label: "Notifications", description: "Notification logic, deduplication and permission-aware behaviour.", category: "Notifications", safety: "read-only", build: createNotificationMicroSystemChecks },
  { id: "permissions", label: "Permissions", description: "Permission contracts and safety boundaries; real browser allow/deny interaction remains explicitly blocked until the browser runner executes it.", category: "Permissions", safety: "sandbox", build: async () => [{ checkId: "permission-browser-flow", name: "Real permission allow/deny browser flow", category: "permissions", severity: "high", run: async () => ({ status: "blocked", message: "Not executed in this in-app diagnostic runner. Browser automation must perform the actual Allow/Deny/Change-later journey before it can be marked passed." }) }] },
];

const visualSuites: BotSuiteDefinition[] = [
  { id: "visual-ux", label: "Visual UX Audit", description: "Tiny Titans visual consistency, responsive concepts and live rendered UI intelligence.", category: "Visual", safety: "read-only", build: createVisualUxChecks },
  { id: "regional-ui", label: "Regional UI", description: "Checks that regional terminology and presentation remain represented in the application QA surface.", category: "Regionalisation", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => /region|locale|morph/i.test(`${check.checkId} ${check.name}`)) },
  { id: "screenshots", label: "Screenshot Evidence", description: "External Playwright screenshot evidence remains a CI/release layer; the in-app Visual BOT uses live DOM intelligence directly.", category: "Evidence", safety: "sandbox", build: async () => [{ checkId: "visual-browser-screenshot-runner", name: "Browser screenshot capture", category: "visual", severity: "medium", run: async () => ({ status: "blocked", message: "Screenshot capture is deliberately retained as external browser evidence. The in-app Visual BOT does not claim screenshots it has not captured." }) }] },
];

export const BOT_DEFINITIONS: BotDefinition[] = [
  { id: "overlord", label: "Overlord BOT", icon: "🤖", description: "Full functional, integration and application intelligence QA.", purpose: "Runs the broadest safe functional coverage and synthesises live rendered evidence into an evidence-based application verdict.", suites: overlordSuites },
  { id: "visual", label: "Visual BOT", icon: "👁️", description: "Intelligent visual, responsive and regional UI QA.", purpose: "Understands the rendered page, its interaction hierarchy and responsive behaviour instead of merely checking whether UI elements exist.", suites: visualSuites },
  { id: "creator", label: "Creator BOT", icon: "🛠️", description: "Deep creator and system diagnostics.", purpose: "Creator tools, permissions, Firebase paths and regression coverage.", suites: creatorSuites },
  { id: "user", label: "User BOT", icon: "👤", description: "Keeper-facing health and workflow coverage.", purpose: "Checks the data and tracker journeys a normal user depends on, without writing to real records.", suites: userSuites },
  { id: "app", label: "App BOT", icon: "🧭", description: "Route and application-topology auditing.", purpose: "Checks route inventory and refuses to claim browser journey coverage until the isolated runner actually executes it.", suites: appSuites },
  { id: "security", label: "Security BOT", icon: "🛡️", description: "Defensive application security checks.", purpose: "Tests safe security boundaries without attacking production or claiming unsupported antivirus capabilities.", suites: securitySuites },
];

export function getBotDefinition(id: string | undefined): BotDefinition | undefined {
  return BOT_DEFINITIONS.find((bot) => bot.id === id);
}

export async function buildBotChecks(bot: BotDefinition, suiteId: string, uid: string): Promise<TesterCheck[]> {
  const suite = bot.suites.find((item) => item.id === suiteId);
  if (!suite) throw new Error(`Unknown ${bot.label} test suite: ${suiteId}`);
  return suite.build(uid);
}

export async function buildFullBotChecks(bot: BotDefinition, uid: string): Promise<TesterCheck[]> {
  const batches = await Promise.all(bot.suites.map((suite) => suite.build(uid)));
  return batches.flat();
}
