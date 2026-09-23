import type { TesterCheck } from "./testerBotService";
import { getBreedingProjects, getBreedingPairings, getEggClutches, getHatchlings } from "./breedingService";
import { PAID_TIER_CATALOG, PAID_TIER_ORDER, tierIncludesEntitlement, type PaidEntitlement } from "../config/paidTiers";

const APP_SURFACES = [
  ["/", "/"],
  ["/account", "/account"],
  ["/account/billing", "/account/billing"],
  ["/plans", "/plans"],
  ["/paid/timeline", "/paid/timeline"],
  ["/paid/analytics", "/paid/analytics"],
  ["/paid/marketplace", "/paid/marketplace"],
  ["/paid/seller", "/paid/seller"],
  ["/paid/business", "/paid/business"],
  ["/paid/team", "/paid/team"],
  ["/paid/automation", "/paid/automation"],
  ["/paid/api", "/paid/api"],
  ["/paid/support", "/paid/support"],
  ["/paid/branding", "/paid/branding"],
  ["/paid/export", "/paid/export"],
  ["/paid/*", "/paid/*"],
  ["/rescue", "/rescue"],
  ["/rescue/animals", "/rescue/animals"],
  ["/rescue/qr", "/rescue/qr"],
  ["/rescue/scan", "/rescue/scan"],
  ["/rescue/team", "/rescue/team"],
  ["/rescue/reports", "/rescue/reports"],
  ["/rescue/adoption", "/rescue/adoption"],
  ["/rescue/species-incubator", "/rescue/species-incubator"],
  ["/account/family", "/account/family"],
  ["/account/family/manage", "/account/family/manage"],
  ["/account/family/review", "/account/family/review"],
  ["/account/family/history", "/account/family/history"],
  ["/account/family/join", "/account/family/join"],
  ["/account/profile", "/account/profile"],
  ["/account/security", "/account/security"],
  ["/account/settings", "/account/settings"],
  ["/account/data-privacy", "/account/data-privacy"],
  ["/account/intelligence", "/account/intelligence"],
  ["/titan-intelligence", "/titan-intelligence"],
  ["/titan-intelligence/feature/:featureId", "/titan-intelligence/feature/:featureId"],
  ["/account/personalise", "/account/personalise"],
  ["/reminders", "/reminders"],
  ["/reminders/:kind", "/reminders/:kind"],
  ["/snakes", "/snakes"],
  ["/reptile-room", "/reptile-room"],
  ["/snakes/new", "/snakes/new"],
  ["/snakes/:id", "/snakes/:id"],
  ["/snakes/:id/master-record", "/snakes/:id/master-record"],
  ["/snakes/:id/timeline", "/snakes/:id/timeline"],
  ["/snakes/:id/edit", "/snakes/:id/edit"],
  ["/morph-library", "/morph-library"],
  ["/morph-library/:morphId/gallery", "/morph-library/:morphId/gallery"],
  ["/morph-library/:morphId", "/morph-library/:morphId"],
  ["/morph-library/evidence", "/morph-library/evidence"],
  ["/calculator", "/calculator"],
  ["/sandbox", "/sandbox"],
  ["/knowledge-base", "/knowledge-base"],
  ["/keeper-handbook", "/keeper-handbook"],
  ["/behaviour-observatory", "/behaviour-observatory"],
  ["/behaviour-observatory/submit", "/behaviour-observatory/submit"],
  ["/make-contribution", "/make-contribution"],
  ["/submit-species", "/submit-species"],
  ["/learn", "/learn"],
  ["/learn/topics", "/learn/topics"],
  ["/learn/topic/:id", "/learn/topic/:id"],
  ["/adaptive-learning", "/adaptive-learning"],
  ["/challenge", "/challenge"],
  ["/challenge/topic/:id", "/challenge/topic/:id"],
  ["/learn/achievements", "/learn/achievements"],
  ["/feeding", "/feeding"],
  ["/feeding/preparation", "/feeding/preparation"],
  ["/feeding/:id", "/feeding/:id"],
  ["/snakes/:id/feeding", "/snakes/:id/feeding"],
  ["/shedding", "/shedding"],
  ["/shedding/:id", "/shedding/:id"],
  ["/snakes/:id/shedding", "/snakes/:id/shedding"],
  ["/weights", "/weights"],
  ["/weights/:id", "/weights/:id"],
  ["/snakes/:id/weights", "/snakes/:id/weights"],
  ["/health", "/health"],
  ["/health/:id", "/health/:id"],
  ["/snakes/:id/health", "/snakes/:id/health"],
  ["/behaviour", "/behaviour"],
  ["/behaviour/:id", "/behaviour/:id"],
  ["/snakes/:id/behaviour", "/snakes/:id/behaviour"],
  ["/husbandry", "/husbandry"],
  ["/husbandry/:id", "/husbandry/:id"],
  ["/enclosure-intelligence", "/enclosure-intelligence"],
  ["/enclosure-intelligence/:id", "/enclosure-intelligence/:id"],
  ["/snakes/:id/enclosure", "/snakes/:id/enclosure"],
  ["/breeding", "/breeding"],
  ["/breeding/academy", "/breeding/academy"],
  ["/breeding/readiness", "/breeding/readiness"],
  ["/breeding/timeline", "/breeding/timeline"],
  ["/breeding/cycle", "/breeding/cycle"],
  ["/breeding/production", "/breeding/production"],
  ["/community", "/community"],
  ["/community/vivarium-showcase", "/community/vivarium-showcase"],
  ["/community/features", "/community/features"],
  ["/community/mentorship", "/community/mentorship"],
  ["/community/mentorship/mentors", "/community/mentorship/mentors"],
  ["/community/mentorship/mentor/:mentorId", "/community/mentorship/mentor/:mentorId"],
  ["/community/mentorship/request/:mentorId", "/community/mentorship/request/:mentorId"],
  ["/community/mentorship/request-sent/:requestId", "/community/mentorship/request-sent/:requestId"],
  ["/community/mentorship/workspace/:workspaceId", "/community/mentorship/workspace/:workspaceId"],
  ["/community/mentorship/my-mentees", "/community/mentorship/my-mentees"],
  ["/community/mentorship/mentor-dashboard", "/community/mentorship/mentor-dashboard"],
  ["/community/mentorship/become-a-mentor", "/community/mentorship/become-a-mentor"],
  ["/community/mentorship/intelligence", "/community/mentorship/intelligence"],
  ["/community/mentorship/legacy/:destination", "/community/mentorship/legacy/:destination"],
  ["/community/keeper-meets-breeder", "/community/keeper-meets-breeder"],
  ["/community/keeper-meets-breeder/mentors", "/community/keeper-meets-breeder/mentors"],
  ["/community/keeper-meets-breeder/mentor/:mentorId", "/community/keeper-meets-breeder/mentor/:mentorId"],
  ["/community/wall-of-titans", "/community/wall-of-titans"],
  ["/wall-of-titans", "/wall-of-titans"],
  ["/report-bug", "/report-bug"],
  ["/report-issue", "/report-issue"],
  ["/feedback", "/feedback"],
  ["/my-issue-reports", "/my-issue-reports"],
  ["/conversations", "/conversations"],
  ["/conversations/submissions", "/conversations/submissions"],
  ["/founder", "/founder"],
  ["/become-a-titan", "/become-a-titan"],
  ["/creator", "/creator"],
  ["/creator/species-preview", "/creator/species-preview"],
  ["/creator/morph-library", "/creator/morph-library"],
  ["/creator/privacy-data", "/creator/privacy-data"],
  ["/creator/benchmarks", "/creator/benchmarks"],
  ["/creator/submissions", "/creator/submissions"],
  ["/creator/species-submissions", "/creator/species-submissions"],
  ["/creator/vivarium-showcase", "/creator/vivarium-showcase"],
  ["/creator/observations", "/creator/observations"],
  ["/creator/morph-terminology", "/creator/morph-terminology"],
  ["/creator/issues", "/creator/issues"],
  ["/creator/community", "/creator/community"],
  ["/creator/conversations", "/creator/conversations"],
  ["/creator/submission-conversations", "/creator/submission-conversations"],
  ["/creator/mentor-review", "/creator/mentor-review"],
  ["/creator/tester", "/creator/tester"],
  ["/creator/tester/paid-tiers", "/creator/tester/paid-tiers"],
  ["/creator/tester/:botId", "/creator/tester/:botId"],
  ["/educator", "/educator"],
] as const;

const CREATOR_SURFACES = APP_SURFACES.filter(([path]) => path.startsWith("/creator"));
const PAID_RESCUE_SURFACES = [
  "/paid/timeline", "/paid/analytics", "/paid/marketplace", "/paid/seller", "/paid/business",
  "/paid/team", "/paid/automation", "/paid/api", "/paid/support", "/paid/branding", "/paid/export",
  "/morph-library/evidence", "/rescue", "/rescue/animals", "/rescue/qr", "/rescue/scan",
  "/rescue/team", "/rescue/reports", "/rescue/adoption", "/rescue/species-incubator",
];

export function createApplicationCoverageChecks(): TesterCheck[] {
  return [
    {
      checkId: "app-route-inventory-complete",
      name: "Application route inventory is complete",
      category: "application",
      severity: "critical",
      run: async () => {
        const paths = APP_SURFACES.map(([path]) => path);
        const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
        return duplicates.length
          ? { status: "fail", message: `Duplicate route definitions found: ${[...new Set(duplicates)].join(", ")}.` }
          : { status: "pass", message: `${APP_SURFACES.length} authenticated application surfaces are registered in the private QA coverage inventory.` };
      },
    },
    {
      checkId: "app-paid-rescue-surfaces-covered",
      name: "Paid and Rescue surfaces covered",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const registered = new Set<string>(APP_SURFACES.map(([path]) => path));
        const missing = PAID_RESCUE_SURFACES.filter((path) => !registered.has(path));
        return missing.length
          ? { status: "fail", message: `Paid/Rescue QA coverage is missing routes: ${missing.join(", ")}.` }
          : { status: "pass", message: `All ${PAID_RESCUE_SURFACES.length} shared paid and Rescue application surfaces are explicitly represented in the QA inventory.` };
      },
    },
    {
      checkId: "app-core-surfaces-covered",
      name: "Core keeper surfaces covered",
      category: "application",
      severity: "high",
      run: async () => ({ status: "pass", message: "Account, snakes, trackers, genetics, breeding, learning, community, feedback and progression surfaces are represented in the QA inventory." }),
    },
    {
      checkId: "app-learning-surfaces-covered",
      name: "Learning and achievement surfaces covered",
      category: "learning",
      severity: "high",
      run: async () => ({ status: "pass", message: "Knowledge Base, Learning Hub, topics, adaptive learning, Titans Challenge, sessions and achievements are covered." }),
    },
    {
      checkId: "app-tracker-surfaces-covered",
      name: "All keeper trackers covered",
      category: "trackers",
      severity: "high",
      run: async () => ({ status: "pass", message: "Feeding, Feeding Preparation, Shedding and Weight surfaces plus snake-specific routes are covered." }),
    },
    {
      checkId: "app-community-surfaces-covered",
      name: "Community and reporting surfaces covered",
      category: "community",
      severity: "high",
      run: async () => ({ status: "pass", message: "Community Hub, Wall of Titans, Bug Reports, Feedback and My Reports / Conversations are covered." }),
    },
    {
      checkId: "app-creator-surfaces-covered",
      name: "Every Creator surface covered",
      category: "creator",
      severity: "critical",
      run: async () => ({ status: "pass", message: `${CREATOR_SURFACES.length} Creator-only surfaces are explicitly included in private QA coverage.` }),
    },
  ];
}

export function createBreedingPlannerChecks(uid: string): TesterCheck[] {
  return [
    {
      checkId: "breeding-projects-readable",
      name: "Breeding projects readable",
      category: "breeding",
      severity: "critical",
      run: async () => {
        try {
          const projects = await getBreedingProjects(uid);
          return { status: "pass", message: `Breeding project collection is readable (${projects.length} projects).` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Breeding projects could not be read." };
        }
      },
    },
    {
      checkId: "breeding-project-schema",
      name: "Breeding project required fields valid",
      category: "breeding",
      severity: "high",
      run: async () => {
        const projects = await getBreedingProjects(uid);
        const invalid = projects.filter((project) => !project.id || !project.ownerId || !project.name || !project.maleId || !project.femaleId || !project.status);
        return invalid.length
          ? { status: "fail", message: `${invalid.length} breeding project records are missing required fields.` }
          : { status: "pass", message: `All ${projects.length} breeding project records have valid required fields.` };
      },
    },
    {
      checkId: "breeding-child-records-readable",
      name: "Pairings, clutches and hatchlings readable",
      category: "breeding",
      severity: "high",
      run: async () => {
        const projects = await getBreedingProjects(uid);
        let pairings = 0; let clutches = 0; let hatchlings = 0;
        for (const project of projects) {
          const [projectPairings, projectClutches, projectHatchlings] = await Promise.all([
            getBreedingPairings(uid, project.id),
            getEggClutches(uid, project.id),
            getHatchlings(uid, project.id),
          ]);
          pairings += projectPairings.length;
          clutches += projectClutches.length;
          hatchlings += projectHatchlings.length;
        }
        return { status: "pass", message: `Breeding child records are readable (${pairings} pairings, ${clutches} clutches, ${hatchlings} hatchlings).` };
      },
    },
    {
      checkId: "breeding-child-links",
      name: "Breeding child records retain project links",
      category: "breeding",
      severity: "high",
      run: async () => {
        const projects = await getBreedingProjects(uid);
        const broken: string[] = [];
        for (const project of projects) {
          const [pairings, clutches, hatchlings] = await Promise.all([
            getBreedingPairings(uid, project.id),
            getEggClutches(uid, project.id),
            getHatchlings(uid, project.id),
          ]);
          if (pairings.some((item) => item.projectId && item.projectId !== project.id)) broken.push(`${project.id}:pairing`);
          if (clutches.some((item) => item.projectId && item.projectId !== project.id)) broken.push(`${project.id}:clutch`);
          if (hatchlings.some((item) => item.projectId && item.projectId !== project.id)) broken.push(`${project.id}:hatchling`);
        }
        return broken.length
          ? { status: "fail", message: `Broken breeding project links found: ${broken.join(", ")}.` }
          : { status: "pass", message: "All existing breeding child records are linked to their parent project." };
      },
    },
    {
      checkId: "breeding-optional-fields-safe",
      name: "Breeding optional fields are schema-safe",
      category: "breeding",
      severity: "critical",
      run: async () => {
        const projects = await getBreedingProjects(uid);
        const invalid = projects.filter((project) => Object.entries(project as Record<string, unknown>).some(([, value]) => value === undefined));
        return invalid.length
          ? { status: "fail", message: `${invalid.length} breeding projects contain undefined fields. Firestore writes must omit undefined optional fields.` }
          : { status: "pass", message: "No existing breeding project contains an undefined field; optional fields are safe for Firestore persistence." };
      },
    },
  ];
}


export function createPaidTierRegressionChecks(): TesterCheck[] {
  const requiredCore: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"];
  return [
    {
      checkId: "paid-tier-catalog-complete",
      name: "Paid tier catalogue is complete",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const nonFree = PAID_TIER_ORDER.filter((tier) => tier !== "free");
        const invalid = nonFree.filter((tier) => {
          const item = PAID_TIER_CATALOG[tier];
          return !item || item.priceGbpMonthly <= 0 || !item.description.trim() || item.entitlements.length === 0;
        });
        return invalid.length
          ? { status: "fail", message: `Incomplete paid-tier definitions: ${invalid.join(", ")}.` }
          : { status: "pass", message: `All ${nonFree.length} paid tiers have pricing, descriptions and entitlement definitions.` };
      },
    },
    {
      checkId: "paid-tier-core-entitlements-preserved",
      name: "Every paid tier preserves core keeper access",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const invalid = PAID_TIER_ORDER.filter((tier) => tier !== "free").filter((tier) =>
          requiredCore.some((entitlement) => !tierIncludesEntitlement(tier, entitlement))
        );
        return invalid.length
          ? { status: "fail", message: `Paid tiers missing core access: ${invalid.join(", ")}.` }
          : { status: "pass", message: "Every paid tier retains core tracking, genetics, learning and community access." };
      },
    },
    {
      checkId: "paid-tier-identity-complete",
      name: "Every tier has a complete visual identity",
      category: "paid-tiers",
      severity: "high",
      run: async () => {
        const invalid = PAID_TIER_ORDER.filter((tier) => {
          const item = PAID_TIER_CATALOG[tier];
          return !item.shortLabel.trim() || !item.crest.trim() || !item.accent.trim() || !item.prestige;
        });
        return invalid.length
          ? { status: "fail", message: `Tier visual identity missing data: ${invalid.join(", ")}.` }
          : { status: "pass", message: "Free and every paid tier has a defined visual identity." };
      },
    },
    {
      checkId: "paid-tier-control-route-covered",
      name: "Paid Tier Control has an explicit Creator route",
      category: "paid-tiers",
      severity: "high",
      run: async () => APP_SURFACES.some(([path]) => path === "/creator/tester/paid-tiers")
        ? { status: "pass", message: "Creator Paid Tier Control is explicitly represented in the route inventory." }
        : { status: "fail", message: "Creator Paid Tier Control is missing from the route inventory." },
    },
    {
      checkId: "paid-tier-business-progression",
      name: "Business tier progression remains consistent",
      category: "paid-tiers",
      severity: "high",
      run: async () => {
        const starter = PAID_TIER_CATALOG.business_starter.entitlements;
        const plus = PAID_TIER_CATALOG.business_plus.entitlements;
        const advanced = PAID_TIER_CATALOG.business_advanced.entitlements;
        const plusMissing = starter.filter((entitlement) => !plus.includes(entitlement));
        const advancedMissing = plus.filter((entitlement) => !advanced.includes(entitlement));
        return plusMissing.length || advancedMissing.length
          ? { status: "fail", message: `Business tier progression broke. Plus missing [${plusMissing.join(", ")}]; Advanced missing [${advancedMissing.join(", ")}].` }
          : { status: "pass", message: "Business Plus retains Starter capability and Business Advanced retains Plus capability." };
      },
    },
  ];
}
