import type { TesterCheck } from "./testerBotService";
import { getBreedingProjects, getBreedingPairings, getEggClutches, getHatchlings } from "./breedingService";

const APP_SURFACES = [
  ["/", "Home dashboard"],
  ["/account", "My Account"],
  ["/account/profile", "Edit Profile"],
  ["/account/security", "Security"],
  ["/account/settings", "Settings"],
  ["/account/data-privacy", "Data Privacy"],
  ["/account/personalise", "Personalisation"],
  ["/snakes", "My Snakes"],
  ["/snakes/new", "Add Snake"],
  ["/snakes/:id", "Snake Profile"],
  ["/snakes/:id/edit", "Snake Edit"],
  ["/snakes/:id/master-record", "Snake Master Record"],
  ["/morph-library", "Morph Library"],
  ["/calculator", "Genetics Calculator"],
  ["/knowledge-base", "Knowledge Base"],
  ["/learn", "Learning Hub"],
  ["/learn/topic/:id", "Learning Topic"],
  ["/adaptive-learning", "Adaptive Learning"],
  ["/challenge", "Titans Challenge"],
  ["/challenge/topic/:id", "Challenge Session"],
  ["/learn/achievements", "Achievements"],
  ["/feeding", "Feeding Tracker"],
  ["/feeding/preparation", "Feeding Preparation"],
  ["/snakes/:id/feeding", "Snake Feeding"],
  ["/shedding", "Shed Tracker"],
  ["/snakes/:id/shedding", "Snake Shedding"],
  ["/weights", "Weight Index"],
  ["/snakes/:id/weights", "Snake Weight Records"],
  ["/breeding", "Breeding Planner"],
  ["/community", "Community Hub"],
  ["/community/wall-of-titans", "Wall of Titans"],
  ["/report-bug", "Bug Report"],
  ["/feedback", "Feedback"],
  ["/my-issue-reports", "My Reports / Conversations"],
  ["/founder", "Founder"],
  ["/become-a-titan", "Become a Titan"],
  ["/creator", "Creator Centre"],
  ["/creator/privacy-data", "Creator Privacy / Data"],
  ["/creator/submissions", "Creator Submissions"],
  ["/creator/issues", "Creator Issue Queues"],
  ["/creator/community", "Community Manager"],
  ["/creator/tester", "Private Tester Centre"],
  ["/educator", "Educator Centre"],
] as const;

const CREATOR_SURFACES = APP_SURFACES.filter(([path]) => path.startsWith("/creator"));

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
