import { hasCreatorTesterClaim } from "./creatorTesterAuthService";
import { createCoreDiagnosticChecks, type TesterCheck } from "./testerBotService";
import { createTrackerRegressionChecks } from "./testerSuitesService";
import { createAccountJourneyChecks, createFeedingChecks, createShedJourneyChecks, createSnakeProfileChecks, createWeightChecks } from "./testerJourneySuitesService";
import { createGeneticsJourneyChecks, createMorphLibraryChecks } from "./testerGeneticsSuitesService";
import { createFeedbackAttachmentChecks } from "./testerFeedbackSuitesService";
import { createNotificationMicroSystemChecks } from "./testerNotificationSuitesService";
import { createCreatorFunctionChecks } from "./testerCreatorSuitesService";
import { createApplicationCoverageChecks, createBreedingPlannerChecks } from "./testerApplicationSuitesService";

export type TesterBotId = "creator" | "user" | "app" | "security";

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

const appSuites: BotSuiteDefinition[] = [
  { id: "route-inventory", label: "Route Inventory", description: "Checks the registered application route inventory for duplicates and missing core surfaces.", category: "Routes", safety: "read-only", build: async () => createApplicationCoverageChecks() },
  { id: "tracker-surfaces", label: "Tracker Surfaces", description: "Confirms feeding, preparation, shedding and weight surfaces are represented in QA coverage.", category: "Trackers", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-tracker-surfaces-covered") },
  { id: "navigation-coverage", label: "Navigation Coverage", description: "Current application topology coverage. Browser-level click/path automation will be added to the sandbox runner rather than falsely reported as complete here.", category: "Navigation", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => ["app-route-inventory-complete", "app-core-surfaces-covered"].includes(check.checkId)) },
  { id: "learning-community", label: "Learning / Community", description: "Confirms learning, achievement, community and reporting surfaces remain represented.", category: "Surfaces", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => ["app-learning-surfaces-covered", "app-community-surfaces-covered"].includes(check.checkId)) },
  { id: "creator-surfaces", label: "Creator Routes", description: "Confirms Creator-only surfaces are explicitly represented in the application QA inventory.", category: "Creator", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-creator-surfaces-covered") },
];

const securitySuites: BotSuiteDefinition[] = [
  { id: "auth-boundary", label: "Authentication Boundary", description: "Read-only verification of the current authenticated security boundary and token freshness.", category: "Authentication", safety: "read-only", build: async (uid) => createCoreDiagnosticChecks({ uid, authenticated: true, creatorClaim: await hasCreatorTesterClaim(true) }).filter((check) => ["auth-current-user", "auth-token-refresh"].includes(check.checkId)) },
  { id: "data-scope", label: "User Data Scope", description: "Verifies the bot can read its own user scope without granting it any write capability. Cross-user attack simulation is deliberately blocked until an isolated security sandbox/test identity is wired.", category: "Authorisation", safety: "sandbox", build: async () => [{ checkId: "security-cross-user-sandbox-required", name: "Cross-user data isolation attack simulation", category: "firebase", severity: "critical", run: async () => ({ status: "blocked", message: "Not executed against live data. An isolated security sandbox/test identity is required before attempting cross-user access simulation." }) }] },
  { id: "route-protection", label: "Route Protection", description: "Read-only application route inventory used to identify protected/private surfaces for deeper security automation.", category: "Routes", safety: "read-only", build: async () => createApplicationCoverageChecks().filter((check) => check.checkId === "app-route-inventory-complete") },
  { id: "schema-safety", label: "Data Schema Safety", description: "Read-only checks from the existing tracker and breeding regression suites for unsafe persisted values.", category: "Data", safety: "read-only", build: async (uid) => [...await createSnakeProfileChecks(uid), ...await createBreedingPlannerChecks(uid)].filter((check) => check.severity === "critical") },
];

export const BOT_DEFINITIONS: BotDefinition[] = [
  { id: "creator", label: "Creator BOT", icon: "🛠️", description: "Deep creator and system diagnostics.", purpose: "Creator tools, permissions, Firebase paths and regression coverage.", suites: creatorSuites },
  { id: "user", label: "User BOT", icon: "👤", description: "Keeper-facing health and workflow coverage.", purpose: "Checks the data and tracker journeys a normal user depends on, without writing to real records.", suites: userSuites },
  { id: "app", label: "App BOT", icon: "🧭", description: "Route and application-topology auditing.", purpose: "Checks route inventory and identifies where browser-level journey automation still needs the isolated runner.", suites: appSuites },
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
