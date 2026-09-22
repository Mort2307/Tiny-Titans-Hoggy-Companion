import type { TinyTitansIconName } from "../types/tinyTitansIcon";

export type FreeKeeperNavigationItem = {
  id: string;
  label: string;
  icon: TinyTitansIconName;
  path: string;
  group: string;
  description: string;
};

type FreeKeeperNavigationDefinition = Omit<FreeKeeperNavigationItem, "group">;

/**
 * Canonical baseline for the ordinary Tiny Titans keeper sidebar.
 *
 * Paid workspaces add capability on top of this surface. They must not replace
 * or hide these core Free routes. The sidebar itself consumes these groups so
 * the Plans comparison and live navigation cannot drift apart.
 */
export const FREE_KEEPER_NAVIGATION_GROUPS = [
  {
    group: "Overview",
    items: [
      { id: "home", label: "Home", icon: "home", path: "/", description: "Your keeper command centre." },
      { id: "snakes", label: "My Animals", icon: "reptiles", path: "/snakes", description: "View, add and manage every Titan." },
      { id: "species", label: "Species Explorer", icon: "animals", path: "/species", description: "Explore the canonical species catalogue that connects your animals, care and genetics." },
      { id: "conversations", label: "Message Centre", icon: "messages", path: "/conversations", description: "Your community conversations." },
    ],
  },
  {
    group: "Care",
    items: [
      { id: "reminders", label: "Reminder Hub", icon: "reminders", path: "/reminders", description: "See what is due next." },
      { id: "husbandry", label: "Husbandry & Care", icon: "husbandry", path: "/husbandry", description: "Species-aware care guidance." },
      { id: "weights", label: "Weight Records", icon: "weight", path: "/weights", description: "Record and review growth." },
      { id: "feeding", label: "Feeding Tracker", icon: "feeding", path: "/feeding", description: "Log meals and feeding history." },
      { id: "shedding", label: "Shed Intelligence", icon: "shed", path: "/shedding", description: "Track shed cycles and outcomes." },
      { id: "behaviour", label: "Behaviour Journal", icon: "behaviour", path: "/behaviour", description: "Record behaviour and observations." },
      { id: "health", label: "Health & Vet", icon: "health", path: "/health", description: "Health and veterinary records." },
      { id: "enclosure", label: "Enclosure Intelligence", icon: "enclosure", path: "/enclosure-intelligence", description: "Review enclosure conditions and care." },
    ],
  },
  {
    group: "Genetics & Breeding",
    items: [
      { id: "morphs", label: "Morph Library", icon: "morph", path: "/morph-library", description: "Species-aware morphs and genetics." },
      { id: "calculator", label: "Genetics Calculator", icon: "genetics", path: "/calculator", description: "Calculate documented inheritance outcomes." },
      { id: "breeding", label: "Breeding Planner", icon: "breeding", path: "/breeding", description: "Plan pairings and projects." },
      { id: "breeding-academy", label: "Breeding Academy", icon: "academy", path: "/breeding/academy", description: "Learn breeding fundamentals and workflows." },
    ],
  },
  {
    group: "Learn & Community",
    items: [
      { id: "keeper-handbook", label: "Keeper Behaviour Handbook", icon: "handbook", path: "/keeper-handbook", description: "Understand reptile behaviour." },
      { id: "behaviour-observatory", label: "Behaviour Observatory", icon: "observatory", path: "/behaviour-observatory", description: "Explore structured behaviour observations." },
      { id: "contribute", label: "Make a Contribution", icon: "contribution", path: "/make-contribution", description: "Help improve Tiny Titans." },
      { id: "knowledge", label: "Knowledge Base", icon: "knowledge", path: "/knowledge-base", description: "Find evidence-backed answers." },
      { id: "challenge", label: "Titans Challenge", icon: "challenge", path: "/challenge", description: "Test your keeper knowledge." },
      { id: "community", label: "Community Hub", icon: "community", path: "/community", description: "News, updates and community features." },
      { id: "marketplace", label: "Marketplace", icon: "marketplace", path: "/marketplace", description: "Browse active reptile marketplace listings." },
      { id: "mentorship", label: "Mentorship", icon: "mentorship", path: "/community/mentorship", description: "Connect with experienced keepers." },
      { id: "wall-of-titans", label: "Wall of Titans", icon: "wall", path: "/community/wall-of-titans", description: "Recognised community supporters." },
    ],
  },
  {
    group: "Rescue",
    items: [
      { id: "rescue", label: "Rescue Centre", icon: "health", path: "/rescue", description: "Access rescue discovery and rescue workspace entry points." },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "account", label: "My Account", icon: "account", path: "/account", description: "Profile, settings and account tools." },
      { id: "plans", label: "Plans & Features", icon: "plans", path: "/plans", description: "Compare Free and paid workspaces." },
      { id: "billing", label: "Billing & Subscription", icon: "billing", path: "/account/billing", description: "Manage subscriptions and billing." },
      { id: "family", label: "My Family", icon: "family", path: "/account/family", description: "Manage family sharing." },
      { id: "become-titan", label: "Become a Titan", icon: "titan", path: "/become-a-titan", description: "Support Tiny Titans and see supporter goals." },
    ],
  },
] as const satisfies readonly { group: string; items: readonly FreeKeeperNavigationDefinition[] }[];

export const FREE_KEEPER_NAVIGATION_IDS = FREE_KEEPER_NAVIGATION_GROUPS.flatMap(({ items }) =>
  items.map((item) => item.id),
);

export type FreeKeeperNavigationId = (typeof FREE_KEEPER_NAVIGATION_IDS)[number];

export const FREE_KEEPER_NAVIGATION_ITEMS = FREE_KEEPER_NAVIGATION_GROUPS.flatMap(({ group, items }) =>
  items.map((item) => ({ ...item, group })),
);

export function getFreeKeeperNavigationItems(): readonly FreeKeeperNavigationItem[] {
  return FREE_KEEPER_NAVIGATION_ITEMS;
}

export function getFreeKeeperNavigationGroups() {
  return FREE_KEEPER_NAVIGATION_GROUPS;
}
