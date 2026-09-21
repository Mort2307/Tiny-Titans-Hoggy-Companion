import type { TinyTitansIconName } from "../components/TinyTitansIcon";

export type QuickNavCapability = "everyone" | "creator" | "tester" | "educator";

export type QuickNavItem = {
  id: string;
  label: string;
  icon: TinyTitansIconName;
  path: string;
  group: string;
  description: string;
  keywords?: string[];
  capability?: QuickNavCapability;
};

/**
 * Quick Mode is intentionally backed by a complete feature registry.
 * Stable feature destinations live here; dynamic record/profile routes remain
 * discoverable from their parent feature so Quick Mode never becomes a dead-end.
 */
export const QUICK_NAV_ITEMS: QuickNavItem[] = [
  { id: "home", label: "Home / At a Glance", icon: "home", path: "/", group: "Overview", description: "Your keeper command centre." },
  { id: "snakes", label: "My Snakes", icon: "reptile", path: "/snakes", group: "Overview", description: "View, add and manage every Titan.", keywords: ["snake", "animals", "collection", "new snake"] },
  { id: "room", label: "Reptile Room", icon: "reptileRoom", path: "/reptile-room", group: "Overview", description: "Manage your reptile room and vivariums.", keywords: ["vivarium", "enclosure", "room"] },
  { id: "conversations", label: "Message Centre", icon: "messages", path: "/conversations", group: "Overview", description: "Your community conversations." },

  { id: "reminders", label: "Reminder Hub", icon: "reminders", path: "/reminders", group: "Care", description: "See what is due next.", keywords: ["due", "notifications", "feeding reminder", "weight reminder"] },
  { id: "husbandry", label: "Husbandry & Care", icon: "husbandry", path: "/husbandry", group: "Care", description: "Species-aware care guidance." },
  { id: "weights", label: "Weight Records", icon: "weight", path: "/weights", group: "Care", description: "Record and review growth.", keywords: ["weight", "weigh"] },
  { id: "feeding", label: "Feeding Tracker", icon: "feeding", path: "/feeding", group: "Care", description: "Log meals and feeding history.", keywords: ["feed", "meal", "food"] },
  { id: "feeding-preparation", label: "Feeding Preparation", icon: "water", path: "/feeding/preparation", group: "Care", description: "Prepare feeding workflows and records." },
  { id: "shedding", label: "Shed Intelligence", icon: "reptile", path: "/shedding", group: "Care", description: "Track shed cycles and outcomes.", keywords: ["shed", "shedding"] },
  { id: "health", label: "Health & Vet", icon: "veterinary", path: "/health", group: "Care", description: "Health and veterinary records.", keywords: ["vet", "medicine", "medication"] },
  { id: "behaviour", label: "Behaviour Journal", icon: "behaviour", path: "/behaviour", group: "Care", description: "Record behaviour and observations.", keywords: ["behavior", "behaviour", "observation"] },
  { id: "behaviour-observatory", label: "Behaviour Observatory", icon: "observatory", path: "/behaviour-observatory", group: "Care", description: "Explore structured behaviour observations." },
  { id: "enclosure", label: "Enclosure Intelligence", icon: "habitatBuilder", path: "/enclosure-intelligence", group: "Care", description: "Review enclosure conditions and care." },

  { id: "morphs", label: "Morph Library", icon: "genetics", path: "/morph-library", group: "Genetics & Breeding", description: "Species-aware morphs and genetics.", keywords: ["morph", "gene", "genetics", "traits", "albino", "arctic", "conda"] },
  { id: "morph-evidence", label: "Morph Evidence Audit", icon: "evidence", path: "/morph-library/evidence", group: "Genetics & Breeding", description: "Review evidence supporting morph records." },
  { id: "calculator", label: "Genetics Calculator", icon: "genetics", path: "/calculator", group: "Genetics & Breeding", description: "Calculate documented inheritance outcomes." },
  { id: "breeding", label: "Breeding Planner", icon: "breeding", path: "/breeding", group: "Genetics & Breeding", description: "Plan pairings and projects.", keywords: ["pairing", "offspring", "litter", "clutch"] },
  { id: "breeding-academy", label: "Breeding Academy", icon: "academy", path: "/breeding/academy", group: "Genetics & Breeding", description: "Learn breeding fundamentals and workflows." },
  { id: "breeding-readiness", label: "Breeding Readiness", icon: "breedingReadiness", path: "/breeding/readiness", group: "Genetics & Breeding", description: "Review readiness intelligence." },
  { id: "breeding-timeline", label: "Breeding Timeline", icon: "timeline", path: "/breeding/timeline", group: "Genetics & Breeding", description: "Track breeding timelines." },
  { id: "breeding-cycle", label: "Breeding Cycle", icon: "breedingCycle", path: "/breeding/cycle", group: "Genetics & Breeding", description: "Manage active breeding cycles." },
  { id: "breeding-production", label: "Production Manager", icon: "production", path: "/breeding/production", group: "Genetics & Breeding", description: "Manage breeding production." },

  { id: "intelligence", label: "Titan Intelligence", icon: "titanIntelligence", path: "/titan-intelligence", group: "Learn & Intelligence", description: "Open the intelligence command centre." },
  { id: "this-week", label: "This Week", icon: "timeline", path: "/titan-intelligence/feature/this-week", group: "Learn & Intelligence", description: "Open the full This Week command centre." },
  { id: "keeper-handbook", label: "Keeper Behaviour Handbook", icon: "handbook", path: "/keeper-handbook", group: "Learn & Intelligence", description: "Understand reptile behaviour." },
  { id: "knowledge", label: "Knowledge Base", icon: "knowledge", path: "/knowledge-base", group: "Learn & Intelligence", description: "Find evidence-backed answers.", keywords: ["learn", "question", "help", "information"] },
  { id: "learn", label: "Learning Hub", icon: "academy", path: "/learn", group: "Learn & Intelligence", description: "Explore learning topics." },
  { id: "adaptive-learning", label: "Adaptive Learning", icon: "titanIntelligence", path: "/adaptive-learning", group: "Learn & Intelligence", description: "Continue personalised learning." },
  { id: "challenge", label: "Titans Challenge", icon: "◆", path: "/challenge", group: "Learn & Intelligence", description: "Test your knowledge." },
  { id: "achievements", label: "Achievements", icon: "wall", path: "/learn/achievements", group: "Learn & Intelligence", description: "View your keeper achievements." },

  { id: "rescue", label: "Rescue Centre", icon: "veterinary", path: "/rescue", group: "Rescue", description: "Species-agnostic rescue operations, animal passports and QR identity.", keywords: ["rescue","animals","QR","passport","rehoming"] },
  { id: "rescue-animals", label: "Rescue Animal Register", icon: "reptile", path: "/rescue/animals", group: "Rescue", description: "Search rescue animals and open read-only passports.", keywords: ["rescue","animals","register"] },
  { id: "rescue-scan", label: "Rescue QR Scanner", icon: "evidence", path: "/rescue/scan", group: "Rescue", description: "Open an animal passport from a TinyTitans QR identity.", keywords: ["QR","scan","passport"] },
  { id: "rescue-incubator", label: "Species Incubator", icon: "genetics", path: "/rescue/species-incubator", group: "Rescue", description: "Turn unsupported rescue species into verified evidence candidates.", keywords: ["species","discovery","verification"] },

  { id: "community", label: "Community Hub", icon: "globe", path: "/community", group: "Community", description: "News, updates and community features.", keywords: ["updates", "news", "community"] },
  { id: "marketplace", label: "Marketplace", icon: "marketplaceTools", path: "/marketplace", group: "Community", description: "Browse active reptile marketplace listings.", keywords: ["market", "marketplace", "seller", "listing", "shop"] },
  { id: "feature-voting", label: "Feature Voting", icon: "add", path: "/community/features", group: "Community", description: "Vote on what Tiny Titans builds next." },
  { id: "vivarium-showcase", label: "Vivarium Showcase", icon: "habitatBuilder", path: "/community/vivarium-showcase", group: "Community", description: "Explore keeper setups." },
  { id: "mentorship", label: "Mentorship", icon: "mentorship", path: "/community/mentorship", group: "Community", description: "Connect with experienced keepers." },
  { id: "mentor-directory", label: "Mentor Directory", icon: "community", path: "/community/mentorship/mentors", group: "Community", description: "Browse available mentors." },
  { id: "become-mentor", label: "Become a Mentor", icon: "mentorship", path: "/community/mentorship/become-a-mentor", group: "Community", description: "Apply to become a community mentor." },
  { id: "mentor-dashboard", label: "Mentor Dashboard", icon: "analytics", path: "/community/mentorship/mentor-dashboard", group: "Community", description: "Open your mentor workspace." },
  { id: "my-mentees", label: "My Mentees", icon: "account", path: "/community/mentorship/my-mentees", group: "Community", description: "Review your current mentees." },
  { id: "mentorship-intelligence", label: "Mentorship Intelligence", icon: "titanIntelligence", path: "/community/mentorship/intelligence", group: "Community", description: "Open mentorship intelligence tools." },
  { id: "wall-of-titans", label: "Wall of Titans", icon: "titan", path: "/community/wall-of-titans", group: "Community", description: "Recognised community supporters." },
  { id: "contribute", label: "Make a Contribution", icon: "contribution", path: "/make-contribution", group: "Community", description: "Help improve Tiny Titans." },
  { id: "submit-species", label: "Submit a Species", icon: "upload", path: "/submit-species", group: "Community", description: "Suggest species data for review." },
  { id: "report", label: "Report an Issue", icon: "maintenance", path: "/report-bug", group: "Community", description: "Report bugs and problems." },
  { id: "feedback", label: "Send Feedback", icon: "messages", path: "/feedback", group: "Community", description: "Share product feedback." },
  { id: "my-issue-reports", label: "My Issue Reports", icon: "reporting", path: "/my-issue-reports", group: "Community", description: "Track the issues you have reported." },
  { id: "submission-messages", label: "Submission Messages", icon: "messages", path: "/conversations/submissions", group: "Community", description: "Follow submission-related conversations." },

  { id: "account", label: "My Account", icon: "settings", path: "/account", group: "Account", description: "Profile, settings and account tools." },
  { id: "profile", label: "Edit Profile", icon: "account", path: "/account/profile", group: "Account", description: "Edit your keeper profile." },
  { id: "settings", label: "Settings", icon: "settings", path: "/account/settings", group: "Account", description: "Configure app preferences." },
  { id: "personalise", label: "Personalise Experience", icon: "titanIntelligence", path: "/account/personalise", group: "Account", description: "Choose Classic or Quick Mode and customise your experience." },
  { id: "family", label: "My Family", icon: "family", path: "/account/family", group: "Account", description: "Manage family sharing." },
  { id: "security", label: "Security", icon: "lock", path: "/account/security", group: "Account", description: "Account security controls." },
  { id: "privacy", label: "Data & Privacy", icon: "lock", path: "/account/data-privacy", group: "Account", description: "Privacy and data controls." },
  { id: "intelligence-contribution", label: "Intelligence Contribution", icon: "titanIntelligence", path: "/account/intelligence", group: "Account", description: "Review intelligence contribution settings." },
  { id: "become-titan", label: "Become a Titan", icon: "titanIntelligence", path: "/become-a-titan", group: "Account", description: "Support Tiny Titans and see supporter goals." },

  { id: "founder", label: "Founder", icon: "plant", path: "/founder", group: "About", description: "Tiny Titans founder information." },
  { id: "sandbox", label: "Sandbox", icon: "testing", path: "/sandbox", group: "About", description: "Safe experimentation workspace." },

  { id: "creator", label: "Creator Centre", icon: "maintenance", path: "/creator", group: "Creator", description: "Creator administration and tools.", capability: "creator" },
  { id: "creator-preview", label: "Species Preview", icon: "eye", path: "/creator/species-preview", group: "Creator", description: "Preview species data before publishing.", capability: "creator" },
  { id: "creator-morph", label: "Morph Library Editor", icon: "morph", path: "/creator/morph-library", group: "Creator", description: "Review and manage morph submissions.", capability: "creator" },
  { id: "creator-privacy", label: "Creator Privacy & Data", icon: "lock", path: "/creator/privacy-data", group: "Creator", description: "Creator-side privacy and data controls.", capability: "creator" },
  { id: "creator-benchmarks", label: "Creator Benchmarks", icon: "📊", path: "/creator/benchmarks", group: "Creator", description: "Review creator and app benchmarks.", capability: "creator" },
  { id: "creator-submissions", label: "Creator Submissions", icon: "upload", path: "/creator/submissions", group: "Creator", description: "Review submitted content.", capability: "creator" },
  { id: "creator-species-submissions", label: "Species Submissions", icon: "reptile", path: "/creator/species-submissions", group: "Creator", description: "Review species submissions.", capability: "creator" },
  { id: "creator-vivarium", label: "Vivarium Showcase Manager", icon: "habitatBuilder", path: "/creator/vivarium-showcase", group: "Creator", description: "Moderate showcase submissions.", capability: "creator" },
  { id: "creator-observations", label: "Observation Review", icon: "observatory", path: "/creator/observations", group: "Creator", description: "Review behaviour observations.", capability: "creator" },
  { id: "creator-terminology", label: "Morph Terminology Audit", icon: "genetics", path: "/creator/morph-terminology", group: "Creator", description: "Review morph terminology evidence.", capability: "creator" },
  { id: "creator-issues", label: "Issue Queues", icon: "maintenance", path: "/creator/issues", group: "Creator", description: "Manage app issue queues.", capability: "creator" },
  { id: "creator-community", label: "Community Manager", icon: "community", path: "/creator/community", group: "Creator", description: "Publish official Community Hub content.", capability: "creator" },
  { id: "creator-conversations", label: "Creator Conversations", icon: "messages", path: "/creator/conversations", group: "Creator", description: "Creator-side conversations.", capability: "creator" },
  { id: "creator-submission-conversations", label: "Submission Conversations", icon: "messages", path: "/creator/submission-conversations", group: "Creator", description: "Review submission conversations.", capability: "creator" },
  { id: "creator-mentor", label: "Mentor Review", icon: "mentorship", path: "/creator/mentor-review", group: "Creator", description: "Review mentor applications.", capability: "creator" },
  { id: "educator", label: "Educator Centre", icon: "academy", path: "/educator", group: "Educator", description: "Teaching and classroom tools.", capability: "educator" },
  { id: "tester", label: "Tester Centre", icon: "◇", path: "/creator/tester", group: "Testing", description: "Tester tools and focused test flows.", capability: "tester" },
];

export function quickNavSearchItems(query: string, authorisedCapabilities: Set<QuickNavCapability> = new Set(["everyone"])) {
  const normalised = query.trim().toLowerCase();
  return QUICK_NAV_ITEMS.filter((item) => {
    const capability = item.capability ?? "everyone";
    if (capability !== "everyone" && !authorisedCapabilities.has(capability)) return false;
    if (!normalised) return true;
    return [item.label, item.group, item.description, item.path, ...(item.keywords ?? [])].join(" ").toLowerCase().includes(normalised);
  });
}
