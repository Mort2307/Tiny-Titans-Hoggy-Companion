import type { TinyTitansIconName } from "../components/TinyTitansIcon";

export type TinyTitansPageGroup = "overview" | "care" | "genetics" | "learning" | "community" | "account" | "intelligence";

export interface TinyTitansPageDefinition {
  id: string;
  path: string;
  label: string;
  icon: TinyTitansIconName;
  group: TinyTitansPageGroup;
  description: string;
  navigation: "route";
}

export const tinyTitansPageRegistry: readonly TinyTitansPageDefinition[] = [
  { id: "home", path: "/", label: "Home", icon: "home", group: "overview", description: "Your keeper command centre.", navigation: "route" },
  { id: "snakes", path: "/snakes", label: "My Snakes", icon: "reptile", group: "overview", description: "Your animals and their living records.", navigation: "route" },
  { id: "room", path: "/reptile-room", label: "Reptile Room", icon: "reptileRoom", group: "overview", description: "Your enclosures and reptile space.", navigation: "route" },
  { id: "intelligence", path: "/titan-intelligence", label: "Titan Intelligence", icon: "titanIntelligence", group: "intelligence", description: "The connected intelligence layer across your Tiny Titans data.", navigation: "route" },
  { id: "reminders", path: "/reminders", label: "Reminder Hub", icon: "reminders", group: "care", description: "Contextual keeper reminders.", navigation: "route" },
  { id: "husbandry", path: "/husbandry", label: "Husbandry", icon: "husbandry", group: "care", description: "Species-aware husbandry and care.", navigation: "route" },
  { id: "weights", path: "/weights", label: "Weight", icon: "weight", group: "care", description: "Weight records and growth history.", navigation: "route" },
  { id: "feeding", path: "/feeding", label: "Feeding", icon: "feeding", group: "care", description: "Feeding records and preparation.", navigation: "route" },
  { id: "shedding", path: "/shedding", label: "Shed Intelligence", icon: "reptile", group: "care", description: "Shed records and observations.", navigation: "route" },
  { id: "behaviour", path: "/behaviour", label: "Behaviour", icon: "behaviour", group: "care", description: "Behaviour journal and patterns.", navigation: "route" },
  { id: "health", path: "/health", label: "Health & Vet", icon: "health", group: "care", description: "Health records and professional summaries.", navigation: "route" },
  { id: "enclosure", path: "/enclosure-intelligence", label: "Enclosure Intelligence", icon: "habitatBuilder", group: "care", description: "Species-aware enclosure intelligence.", navigation: "route" },
  { id: "morphs", path: "/morph-library", label: "Morph Library", icon: "morph", group: "genetics", description: "Morphs, aliases, evidence and recognised combinations.", navigation: "route" },
  { id: "calculator", path: "/calculator", label: "Genetics Calculator", icon: "genetics", group: "genetics", description: "Calculate and explore genetic outcomes.", navigation: "route" },
  { id: "breeding", path: "/breeding", label: "Breeding Planner", icon: "breeding", group: "genetics", description: "Breeding projects and outcomes.", navigation: "route" },
  { id: "academy", path: "/breeding/academy", label: "Breeding Academy", icon: "academy", group: "genetics", description: "Learn breeding and genetics.", navigation: "route" },
  { id: "knowledge", path: "/knowledge-base", label: "Knowledge Base", icon: "knowledge", group: "learning", description: "Species and keeper knowledge.", navigation: "route" },
  { id: "challenge", path: "/challenge", label: "Titans Challenge", icon: "challenge", group: "learning", description: "Adaptive learning challenges.", navigation: "route" },
  { id: "community", path: "/community", label: "Community Hub", icon: "community", group: "community", description: "Keeper community and contributions.", navigation: "route" },
  { id: "mentorship", path: "/community/mentorship", label: "Mentorship", icon: "mentorship", group: "community", description: "Keeper-to-keeper mentorship.", navigation: "route" },
  { id: "wall", path: "/community/wall-of-titans", label: "Wall of Titans", icon: "wall", group: "community", description: "Community showcase.", navigation: "route" },
  { id: "submission-messages", path: "/conversations/submissions", label: "Submission Messages", icon: "messages", group: "community", description: "Private conversations with Tiny Titans about your submissions.", navigation: "route" },
  { id: "account", path: "/account", label: "My Account", icon: "account", group: "account", description: "Account, preferences and privacy.", navigation: "route" },
  { id: "family", path: "/account/family", label: "My Family", icon: "family", group: "account", description: "Controlled shared access.", navigation: "route" },
  { id: "become", path: "/become-a-titan", label: "Become a Titan", icon: "husbandry", group: "account", description: "Support and contribution goals.", navigation: "route" },
];

export function getTinyTitansPage(path: string): TinyTitansPageDefinition | undefined {
  return tinyTitansPageRegistry.find((page) => page.path === path);
}

export function getTinyTitansPages(group: TinyTitansPageGroup): readonly TinyTitansPageDefinition[] {
  return tinyTitansPageRegistry.filter((page) => page.group === group);
}
