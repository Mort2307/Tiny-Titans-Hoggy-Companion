export type QuickNavCapability = "everyone" | "creator" | "tester" | "educator";

export type QuickNavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  group: string;
  description: string;
  keywords?: string[];
  capability?: QuickNavCapability;
};

/**
 * Quick Mode is intentionally backed by a complete feature registry.
 * These are stable feature destinations, not individual transient routes.
 * Dynamic animal detail routes remain available from the feature itself.
 */
export const QUICK_NAV_ITEMS: QuickNavItem[] = [
  { id: "home", label: "Home / At a Glance", icon: "🏠", path: "/", group: "Overview", description: "Your keeper command centre." },
  { id: "snakes", label: "My Snakes", icon: "🐍", path: "/snakes", group: "Overview", description: "View, add and manage every Titan." },
  { id: "room", label: "Reptile Room", icon: "▦", path: "/reptile-room", group: "Overview", description: "Manage your reptile room and vivariums." },
  { id: "conversations", label: "Message Centre", icon: "💬", path: "/conversations", group: "Overview", description: "Your community conversations." },

  { id: "reminders", label: "Reminder Hub", icon: "🔔", path: "/reminders", group: "Care", description: "See what is due next." },
  { id: "husbandry", label: "Husbandry & Care", icon: "🌡️", path: "/husbandry", group: "Care", description: "Species-aware care guidance." },
  { id: "weights", label: "Weight Records", icon: "⚖️", path: "/weights", group: "Care", description: "Record and review growth." },
  { id: "feeding", label: "Feeding Tracker", icon: "🍽️", path: "/feeding", group: "Care", description: "Log meals and feeding history." },
  { id: "shedding", label: "Shed Intelligence", icon: "🐍", path: "/shedding", group: "Care", description: "Track shed cycles and outcomes." },
  { id: "health", label: "Health & Vet", icon: "❤️", path: "/health", group: "Care", description: "Health and veterinary records." },
  { id: "behaviour", label: "Behaviour Journal", icon: "◉", path: "/behaviour", group: "Care", description: "Record behaviour and observations." },
  { id: "enclosure", label: "Enclosure Intelligence", icon: "⌘", path: "/enclosure-intelligence", group: "Care", description: "Review enclosure conditions and care." },

  { id: "morphs", label: "Morph Library", icon: "🧬", path: "/morph-library", group: "Genetics & Breeding", description: "Species-aware morphs and genetics." },
  { id: "calculator", label: "Genetics Calculator", icon: "∑", path: "/calculator", group: "Genetics & Breeding", description: "Calculate documented inheritance outcomes." },
  { id: "breeding", label: "Breeding Planner", icon: "🥚", path: "/breeding", group: "Genetics & Breeding", description: "Plan pairings and projects." },
  { id: "breeding-academy", label: "Breeding Academy", icon: "▣", path: "/breeding/academy", group: "Genetics & Breeding", description: "Learn breeding fundamentals and workflows." },
  { id: "breeding-readiness", label: "Breeding Readiness", icon: "✓", path: "/breeding/readiness", group: "Genetics & Breeding", description: "Review readiness intelligence." },
  { id: "breeding-timeline", label: "Breeding Timeline", icon: "📅", path: "/breeding/timeline", group: "Genetics & Breeding", description: "Track breeding timelines." },
  { id: "breeding-cycle", label: "Breeding Cycle", icon: "🔄", path: "/breeding/cycle", group: "Genetics & Breeding", description: "Manage active breeding cycles." },
  { id: "breeding-production", label: "Production Manager", icon: "📦", path: "/breeding/production", group: "Genetics & Breeding", description: "Manage breeding production." },

  { id: "intelligence", label: "Titan Intelligence", icon: "🧠", path: "/titan-intelligence", group: "Learn & Intelligence", description: "Open the intelligence command centre." },
  { id: "keeper-handbook", label: "Keeper Behaviour Handbook", icon: "📖", path: "/keeper-handbook", group: "Learn & Intelligence", description: "Understand reptile behaviour." },
  { id: "observatory", label: "Behaviour Observatory", icon: "🔭", path: "/behaviour-observatory", group: "Learn & Intelligence", description: "Explore keeper behaviour observations." },
  { id: "knowledge", label: "Knowledge Base", icon: "📚", path: "/knowledge-base", group: "Learn & Intelligence", description: "Find evidence-backed answers." },
  { id: "learn", label: "Learning Hub", icon: "🎓", path: "/learn", group: "Learn & Intelligence", description: "Explore learning topics." },
  { id: "adaptive-learning", label: "Adaptive Learning", icon: "🧠", path: "/adaptive-learning", group: "Learn & Intelligence", description: "Continue personalised learning." },
  { id: "challenge", label: "Titans Challenge", icon: "◆", path: "/challenge", group: "Learn & Intelligence", description: "Test your knowledge." },
  { id: "achievements", label: "Achievements", icon: "🏆", path: "/learn/achievements", group: "Learn & Intelligence", description: "View your keeper achievements." },

  { id: "community", label: "Community Hub", icon: "🌍", path: "/community", group: "Community", description: "News, updates and community features." },
  { id: "feature-voting", label: "Feature Voting", icon: "💡", path: "/community/features", group: "Community", description: "Vote on what Tiny Titans builds next." },
  { id: "mentorship", label: "Mentorship", icon: "↔", path: "/community/mentorship", group: "Community", description: "Connect with experienced keepers." },
  { id: "vivarium-showcase", label: "Vivarium Showcase", icon: "🏡", path: "/community/vivarium-showcase", group: "Community", description: "Explore keeper setups." },
  { id: "wall-of-titans", label: "Wall of Titans", icon: "★", path: "/community/wall-of-titans", group: "Community", description: "Recognised community supporters." },
  { id: "contribute", label: "Make a Contribution", icon: "＋", path: "/make-contribution", group: "Community", description: "Help improve Tiny Titans." },
  { id: "report", label: "Report an Issue", icon: "🛠️", path: "/report-bug", group: "Community", description: "Report bugs and problems." },
  { id: "feedback", label: "Send Feedback", icon: "💬", path: "/feedback", group: "Community", description: "Share product feedback." },

  { id: "account", label: "My Account", icon: "⚙️", path: "/account", group: "Account", description: "Profile, settings and account tools." },
  { id: "personalise", label: "Personalise Experience", icon: "✨", path: "/account/personalise", group: "Account", description: "Choose Classic or Quick Mode and customise your experience." },
  { id: "family", label: "My Family", icon: "👨‍👩‍👧", path: "/account/family", group: "Account", description: "Manage family sharing." },
  { id: "security", label: "Security", icon: "🔐", path: "/account/security", group: "Account", description: "Account security controls.", },
  { id: "privacy", label: "Data & Privacy", icon: "🛡️", path: "/account/data-privacy", group: "Account", description: "Privacy and data controls." },
  { id: "intelligence-contribution", label: "Intelligence Contribution", icon: "🧠", path: "/account/intelligence", group: "Account", description: "Review intelligence contribution settings." },
  { id: "become-titan", label: "Become a Titan", icon: "✦", path: "/become-a-titan", group: "Account", description: "Support Tiny Titans and see supporter goals." },

  { id: "founder", label: "Founder", icon: "🌱", path: "/founder", group: "About", description: "Tiny Titans founder information." },
  { id: "sandbox", label: "Sandbox", icon: "🧪", path: "/sandbox", group: "About", description: "Safe experimentation workspace." },
];

export function quickNavSearchItems(query: string) {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return QUICK_NAV_ITEMS;
  return QUICK_NAV_ITEMS.filter((item) => [item.label, item.group, item.description, ...(item.keywords ?? [])].join(" ").toLowerCase().includes(normalised));
}
