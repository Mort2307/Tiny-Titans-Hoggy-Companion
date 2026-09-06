export type TinyTitansPageGroup = "overview" | "care" | "genetics" | "learning" | "community" | "account";

export interface TinyTitansPageDefinition {
  id: string;
  path: string;
  label: string;
  icon: string;
  group: TinyTitansPageGroup;
  description: string;
  navigation: "route";
}

export const tinyTitansPageRegistry: readonly TinyTitansPageDefinition[] = [
  { id: "home", path: "/", label: "Home", icon: "⌂", group: "overview", description: "Your keeper command centre.", navigation: "route" },
  { id: "snakes", path: "/snakes", label: "My Snakes", icon: "🐍", group: "overview", description: "Your animals and their living records.", navigation: "route" },
  { id: "room", path: "/reptile-room", label: "Reptile Room", icon: "▦", group: "overview", description: "Your enclosures and reptile space.", navigation: "route" },
  { id: "reminders", path: "/reminders", label: "Reminder Hub", icon: "🔔", group: "care", description: "Contextual keeper reminders.", navigation: "route" },
  { id: "husbandry", path: "/husbandry", label: "Husbandry", icon: "✦", group: "care", description: "Species-aware husbandry and care.", navigation: "route" },
  { id: "weights", path: "/weights", label: "Weight", icon: "⚖️", group: "care", description: "Weight records and growth history.", navigation: "route" },
  { id: "feeding", path: "/feeding", label: "Feeding", icon: "🍽️", group: "care", description: "Feeding records and preparation.", navigation: "route" },
  { id: "shedding", path: "/shedding", label: "Shed Intelligence", icon: "🐍", group: "care", description: "Shed records and observations.", navigation: "route" },
  { id: "behaviour", path: "/behaviour", label: "Behaviour", icon: "◉", group: "care", description: "Behaviour journal and patterns.", navigation: "route" },
  { id: "health", path: "/health", label: "Health & Vet", icon: "+", group: "care", description: "Health records and professional summaries.", navigation: "route" },
  { id: "enclosure", path: "/enclosure-intelligence", label: "Enclosure Intelligence", icon: "⌘", group: "care", description: "Species-aware enclosure intelligence.", navigation: "route" },
  { id: "morphs", path: "/morph-library", label: "Morph Library", icon: "🧬", group: "genetics", description: "Morphs, aliases, evidence and recognised combinations.", navigation: "route" },
  { id: "calculator", path: "/calculator", label: "Genetics Calculator", icon: "∑", group: "genetics", description: "Calculate and explore genetic outcomes.", navigation: "route" },
  { id: "breeding", path: "/breeding", label: "Breeding Planner", icon: "🥚", group: "genetics", description: "Breeding projects and outcomes.", navigation: "route" },
  { id: "academy", path: "/breeding/academy", label: "Breeding Academy", icon: "▣", group: "genetics", description: "Learn breeding and genetics.", navigation: "route" },
  { id: "knowledge", path: "/knowledge-base", label: "Knowledge Base", icon: "▤", group: "learning", description: "Species and keeper knowledge.", navigation: "route" },
  { id: "challenge", path: "/challenge", label: "Titans Challenge", icon: "◆", group: "learning", description: "Adaptive learning challenges.", navigation: "route" },
  { id: "community", path: "/community", label: "Community Hub", icon: "◌", group: "community", description: "Keeper community and contributions.", navigation: "route" },
  { id: "mentorship", path: "/community/mentorship", label: "Mentorship", icon: "↔", group: "community", description: "Keeper-to-keeper mentorship.", navigation: "route" },
  { id: "wall", path: "/community/wall-of-titans", label: "Wall of Titans", icon: "★", group: "community", description: "Community showcase.", navigation: "route" },
  { id: "account", path: "/account", label: "My Account", icon: "●", group: "account", description: "Account, preferences and privacy.", navigation: "route" },
  { id: "family", path: "/account/family", label: "My Family", icon: "👨‍👩‍👧", group: "account", description: "Controlled shared access.", navigation: "route" },
  { id: "become", path: "/become-a-titan", label: "Become a Titan", icon: "✦", group: "account", description: "Support and contribution goals.", navigation: "route" },
];

export function getTinyTitansPage(path: string): TinyTitansPageDefinition | undefined {
  return tinyTitansPageRegistry.find((page) => page.path === path);
}

export function getTinyTitansPages(group: TinyTitansPageGroup): readonly TinyTitansPageDefinition[] {
  return tinyTitansPageRegistry.filter((page) => page.group === group);
}
