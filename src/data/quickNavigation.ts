export type QuickNavCapability = "everyone" | "creator" | "tester" | "educator";

export type QuickNavItem = {
  id: string;
  label: string;
  icon: import("../types/tinyTitansIcon").TinyTitansIconName;
  path: string;
  group: string;
  description: string;
  keywords?: string[];
  capability?: QuickNavCapability;
};

/**
 * Quick View is intentionally backed by a complete feature registry.
 * Stable feature destinations live here; dynamic record/profile routes remain
 * discoverable from their parent feature so Quick View never becomes a dead-end.
 */
export const QUICK_NAV_ITEMS: QuickNavItem[] = [
  { id: "home", label: "Home / At a Glance", icon: "home", path: "/", group: "Overview", description: "Your keeper command centre." },
  { id: "animals", label: "My Animals", icon: "animals", path: "/animals", group: "Overview", description: "Your individual animals across supported species.", keywords: ["animals", "pets", "collection", "individuals"] },
  { id: "species", label: "Species Explorer", icon: "animals", path: "/species", group: "Overview", description: "Explore the universal Tiny Titans animal catalogue.", keywords: ["species", "lizards", "turtles", "amphibians", "spiders", "insects", "exotics"] },
  { id: "conversations", label: "Message Centre", icon: "messages", path: "/conversations", group: "Overview", description: "Your community conversations." },

  { id: "reminders", label: "Reminder Hub", icon: "reminders", path: "/reminders", group: "Care", description: "See what is due next.", keywords: ["due", "notifications", "feeding reminder", "weight reminder"] },
  { id: "husbandry", label: "Husbandry & Care", icon: "husbandry", path: "/husbandry", group: "Care", description: "Species-aware care guidance." },
  { id: "weights", label: "Weight Records", icon: "weight", path: "/weights", group: "Care", description: "Record and review growth.", keywords: ["weight", "weigh"] },
  { id: "feeding", label: "Feeding Tracker", icon: "feeding", path: "/feeding", group: "Care", description: "Log meals and feeding history.", keywords: ["feed", "feeding", "meal", "food", "prey", "dinner"] },
  { id: "feeding-preparation", label: "Feeding Preparation", icon: "feeding", path: "/feeding/preparation", group: "Care", description: "Prepare feeding workflows and records." },
  { id: "shedding", label: "Shed Intelligence", icon: "shed", path: "/shedding", group: "Care", description: "Track shed cycles and outcomes.", keywords: ["shed", "shedding"] },
  { id: "health", label: "Health & Vet", icon: "health", path: "/health", group: "Care", description: "Health and veterinary records.", keywords: ["vet", "veterinary", "medicine", "medication", "ill", "sick", "treatment"] },
  { id: "behaviour", label: "Behaviour Journal", icon: "behaviour", path: "/behaviour", group: "Care", description: "Record behaviour and observations.", keywords: ["behavior", "behaviour", "observation"] },
  { id: "behaviour-observatory", label: "Behaviour Observatory", icon: "observatory", path: "/behaviour-observatory", group: "Care", description: "Explore structured behaviour observations." },
  { id: "enclosure", label: "Enclosure Intelligence", icon: "enclosure", path: "/enclosure-intelligence", group: "Care", description: "Review enclosure conditions and care.", keywords: ["viv", "vivarium", "tank", "habitat", "enclosure", "temperature", "temps", "humidity"] },

  { id: "morphs", label: "Morph Library", icon: "morph", path: "/morph-library", group: "Genetics & Breeding", description: "Species-aware morphs and genetics.", keywords: ["morph", "gene", "genetics", "traits", "albino", "arctic", "conda"] },
  { id: "morph-evidence", label: "Morph Evidence Audit", icon: "observatory", path: "/morph-library/evidence", group: "Genetics & Breeding", description: "Review evidence supporting morph records." },
  { id: "calculator", label: "Genetics Calculator", icon: "genetics", path: "/calculator", group: "Genetics & Breeding", description: "Calculate documented inheritance outcomes." },
  { id: "breeding", label: "Breeding Planner", icon: "breeding", path: "/breeding", group: "Genetics & Breeding", description: "Plan pairings and projects.", keywords: ["pairing", "offspring", "litter", "clutch"] },
  { id: "breeding-academy", label: "Breeding Academy", icon: "academy", path: "/breeding/academy", group: "Genetics & Breeding", description: "Learn breeding fundamentals and workflows." },
  { id: "breeding-readiness", label: "Breeding Readiness", icon: "check", path: "/breeding/readiness", group: "Genetics & Breeding", description: "Review readiness intelligence." },
  { id: "breeding-timeline", label: "Breeding Timeline", icon: "timeline", path: "/breeding/timeline", group: "Genetics & Breeding", description: "Track breeding timelines." },
  { id: "breeding-cycle", label: "Breeding Cycle", icon: "breeding", path: "/breeding/cycle", group: "Genetics & Breeding", description: "Manage active breeding cycles." },
  { id: "breeding-production", label: "Production Manager", icon: "marketplace", path: "/breeding/production", group: "Genetics & Breeding", description: "Manage breeding production." },

  { id: "intelligence", label: "Titan Intelligence", icon: "titan", path: "/titan-intelligence", group: "Learn & Intelligence", description: "Open the intelligence command centre." },
  { id: "this-week", label: "This Week", icon: "timeline", path: "/titan-intelligence/feature/this-week", group: "Learn & Intelligence", description: "Open the full This Week command centre." },
  { id: "keeper-handbook", label: "Keeper Behaviour Handbook", icon: "handbook", path: "/keeper-handbook", group: "Learn & Intelligence", description: "Understand animal behaviour." },
  { id: "knowledge", label: "Knowledge Base", icon: "knowledge", path: "/knowledge-base", group: "Learn & Intelligence", description: "Find evidence-backed answers.", keywords: ["learn", "question", "help", "information"] },
  { id: "learn", label: "Learning Hub", icon: "academy", path: "/learn", group: "Learn & Intelligence", description: "Explore learning topics." },
  { id: "adaptive-learning", label: "Adaptive Learning", icon: "titan", path: "/adaptive-learning", group: "Learn & Intelligence", description: "Continue personalised learning." },
  { id: "challenge", label: "Titans Challenge", icon: "challenge", path: "/challenge", group: "Learn & Intelligence", description: "Test your knowledge." },
  { id: "achievements", label: "Achievements", icon: "wall", path: "/learn/achievements", group: "Learn & Intelligence", description: "View your keeper achievements." },

  { id: "rescue", label: "Rescue Centre", icon: "vet", path: "/rescue", group: "Rescue", description: "Species-agnostic rescue operations, animal passports and QR identity.", keywords: ["rescue","animals","QR","passport","rehoming"] },
  { id: "rescue-animals", label: "Rescue Animal Register", icon: "animals", path: "/rescue/animals", group: "Rescue", description: "Search rescue animals and open read-only passports.", keywords: ["rescue","animals","register"] },
  { id: "rescue-scan", label: "Rescue QR Scanner", icon: "observatory", path: "/rescue/scan", group: "Rescue", description: "Open an animal passport from a TinyTitans QR identity.", keywords: ["QR","scan","passport"] },
  { id: "rescue-incubator", label: "Species Incubator", icon: "morph", path: "/rescue/species-incubator", group: "Rescue", description: "Turn unsupported rescue species into verified evidence candidates.", keywords: ["species","discovery","verification"] },

  { id: "community", label: "Community Hub", icon: "community", path: "/community", group: "Community", description: "News, updates and community features.", keywords: ["updates", "news", "community"] },
  { id: "marketplace", label: "Marketplace", icon: "marketplace", path: "/marketplace", group: "Community", description: "Browse active animal marketplace listings.", keywords: ["market", "marketplace", "seller", "listing", "shop"] },
  { id: "feature-voting", label: "Feature Voting", icon: "challenge", path: "/community/features", group: "Community", description: "Vote on what Tiny Titans builds next." },
  { id: "vivarium-showcase", label: "Vivarium Showcase", icon: "enclosure", path: "/community/vivarium-showcase", group: "Community", description: "Explore keeper setups." },
  { id: "mentorship", label: "Mentorship", icon: "mentorship", path: "/community/mentorship", group: "Community", description: "Connect with experienced keepers." },
  { id: "mentor-directory", label: "Mentor Directory", icon: "community", path: "/community/mentorship/mentors", group: "Community", description: "Browse available mentors." },
  { id: "become-mentor", label: "Become a Mentor", icon: "mentorship", path: "/community/mentorship/become-a-mentor", group: "Community", description: "Apply to become a community mentor." },
  { id: "mentor-dashboard", label: "Mentor Dashboard", icon: "academy", path: "/community/mentorship/mentor-dashboard", group: "Community", description: "Open your mentor workspace." },
  { id: "my-mentees", label: "My Mentees", icon: "account", path: "/community/mentorship/my-mentees", group: "Community", description: "Review your current mentees." },
  { id: "mentorship-intelligence", label: "Mentorship Intelligence", icon: "titan", path: "/community/mentorship/intelligence", group: "Community", description: "Open mentorship intelligence tools." },
  { id: "wall-of-titans", label: "Wall of Titans", icon: "wall", path: "/community/wall-of-titans", group: "Community", description: "Recognised community supporters." },
  { id: "contribute", label: "Make a Contribution", icon: "add", path: "/make-contribution", group: "Community", description: "Help improve Tiny Titans." },
  { id: "submit-species", label: "Submit a Species", icon: "animals", path: "/submit-species", group: "Community", description: "Suggest species data for review." },
  { id: "report", label: "Report an Issue", icon: "creator", path: "/report-bug", group: "Community", description: "Report bugs and problems." },
  { id: "feedback", label: "Send Feedback", icon: "messages", path: "/feedback", group: "Community", description: "Share product feedback." },
  { id: "my-issue-reports", label: "My Issue Reports", icon: "contribution", path: "/my-issue-reports", group: "Community", description: "Track the issues you have reported." },
  { id: "submission-messages", label: "Submission Messages", icon: "messages", path: "/conversations/submissions", group: "Community", description: "Follow submission-related conversations." },

  { id: "account", label: "My Account", icon: "account", path: "/account", group: "Account", description: "Profile, settings and account tools." },
  { id: "profile", label: "Edit Profile", icon: "account", path: "/account/profile", group: "Account", description: "Edit your keeper profile." },
  { id: "settings", label: "Settings", icon: "account", path: "/account/settings", group: "Account", description: "Configure app preferences." },
  { id: "personalise", label: "Personalise Quick View", icon: "titan", path: "/account/personalise", group: "Account", description: "Customise At a Glance, weekly metrics and your Tiny Titans experience." },
  { id: "family", label: "My Family", icon: "family", path: "/account/family", group: "Account", description: "Manage family sharing." },
  { id: "security", label: "Security", icon: "lock", path: "/account/security", group: "Account", description: "Account security controls." },
  { id: "privacy", label: "Data & Privacy", icon: "health", path: "/account/data-privacy", group: "Account", description: "Privacy and data controls." },
  { id: "intelligence-contribution", label: "Intelligence Contribution", icon: "titan", path: "/account/intelligence", group: "Account", description: "Review intelligence contribution settings." },
  { id: "become-titan", label: "Become a Titan", icon: "titan", path: "/become-a-titan", group: "Account", description: "Support Tiny Titans and see supporter goals." },

  { id: "founder", label: "Founder", icon: "husbandry", path: "/founder", group: "About", description: "Tiny Titans founder information." },
  { id: "sandbox", label: "Sandbox", icon: "testing", path: "/sandbox", group: "About", description: "Safe experimentation workspace." },

  { id: "creator", label: "Creator Centre", icon: "creator", path: "/creator", group: "Creator", description: "Creator administration and tools.", capability: "creator" },
  { id: "creator-preview", label: "Species Preview", icon: "behaviour", path: "/creator/species-preview", group: "Creator", description: "Preview species data before publishing.", capability: "creator" },
  { id: "creator-morph", label: "Morph Library Editor", icon: "morph", path: "/creator/morph-library", group: "Creator", description: "Review and manage morph submissions.", capability: "creator" },
  { id: "creator-privacy", label: "Creator Privacy & Data", icon: "health", path: "/creator/privacy-data", group: "Creator", description: "Creator-side privacy and data controls.", capability: "creator" },
  { id: "creator-benchmarks", label: "Creator Benchmarks", icon: "weight", path: "/creator/benchmarks", group: "Creator", description: "Review creator and app benchmarks.", capability: "creator" },
  { id: "creator-submissions", label: "Creator Submissions", icon: "messages", path: "/creator/submissions", group: "Creator", description: "Review submitted content.", capability: "creator" },
  { id: "creator-species-submissions", label: "Species Submissions", icon: "animals", path: "/creator/species-submissions", group: "Creator", description: "Review species submissions.", capability: "creator" },
  { id: "creator-vivarium", label: "Vivarium Showcase Manager", icon: "enclosure", path: "/creator/vivarium-showcase", group: "Creator", description: "Moderate showcase submissions.", capability: "creator" },
  { id: "creator-observations", label: "Observation Review", icon: "observatory", path: "/creator/observations", group: "Creator", description: "Review behaviour observations.", capability: "creator" },
  { id: "creator-terminology", label: "Morph Terminology Audit", icon: "morph", path: "/creator/morph-terminology", group: "Creator", description: "Review morph terminology evidence.", capability: "creator" },
  { id: "creator-issues", label: "Issue Queues", icon: "creator", path: "/creator/issues", group: "Creator", description: "Manage app issue queues.", capability: "creator" },
  { id: "creator-community", label: "Community Manager", icon: "community", path: "/creator/community", group: "Creator", description: "Publish official Community Hub content.", capability: "creator" },
  { id: "creator-conversations", label: "Creator Conversations", icon: "messages", path: "/creator/conversations", group: "Creator", description: "Creator-side conversations.", capability: "creator" },
  { id: "creator-submission-conversations", label: "Submission Conversations", icon: "messages", path: "/creator/submission-conversations", group: "Creator", description: "Review submission conversations.", capability: "creator" },
  { id: "creator-mentor", label: "Mentor Review", icon: "mentorship", path: "/creator/mentor-review", group: "Creator", description: "Review mentor applications.", capability: "creator" },
  { id: "educator", label: "Educator Centre", icon: "academy", path: "/educator", group: "Educator", description: "Teaching and classroom tools.", capability: "educator" },
  { id: "tester", label: "Tester Centre", icon: "plans", path: "/creator/tester", group: "Testing", description: "Tester tools and focused test flows.", capability: "tester" },
];

function quickNavSearchScore(item: QuickNavItem, query: string): number {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return 1;

  const label = item.label.toLowerCase();
  const group = item.group.toLowerCase();
  const description = item.description.toLowerCase();
  const path = item.path.toLowerCase();
  const keywords = (item.keywords ?? []).map((keyword) => keyword.toLowerCase());
  const tokens = normalised.split(/\s+/).filter(Boolean);

  let score = 0;
  if (label === normalised) score += 140;
  else if (label.startsWith(normalised)) score += 110;
  else if (label.includes(normalised)) score += 85;

  if (keywords.some((keyword) => keyword === normalised)) score += 120;
  if (keywords.some((keyword) => keyword.startsWith(normalised))) score += 90;
  if (group === normalised) score += 65;
  else if (group.includes(normalised)) score += 35;
  if (description.includes(normalised)) score += 24;
  if (path.includes(normalised)) score += 14;

  for (const token of tokens) {
    if (label.includes(token)) score += 24;
    if (keywords.some((keyword) => keyword.includes(token))) score += 20;
    if (description.includes(token)) score += 6;
    if (group.includes(token)) score += 5;
  }

  return score;
}

export function quickNavSearchItems(query: string, authorisedCapabilities: Set<QuickNavCapability> = new Set(["everyone"])) {
  const available = QUICK_NAV_ITEMS.filter((item) => {
    const capability = item.capability ?? "everyone";
    return capability === "everyone" || authorisedCapabilities.has(capability);
  });
  const normalised = query.trim().toLowerCase();
  if (!normalised) return available;

  return available
    .map((item) => ({ item, score: quickNavSearchScore(item, normalised) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .map(({ item }) => item);
}
