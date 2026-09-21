import type { TinyTitansIconName } from "../types/tinyTitansIcon";

export const QUICK_ICON_MAP: Record<string, TinyTitansIconName> = {
  home: "home", snakes: "reptile", room: "enclosure", conversations: "messages", reminders: "reminders", husbandry: "husbandry",
  weights: "weight", feeding: "feeding", "feeding-preparation": "feeding", shedding: "shed", health: "health", behaviour: "behaviour",
  "behaviour-observatory": "observatory", enclosure: "enclosure", morphs: "morph", "morph-evidence": "observatory", calculator: "genetics",
  breeding: "breeding", "breeding-academy": "academy", "breeding-readiness": "challenge", "breeding-timeline": "reminders", "breeding-cycle": "breeding", "breeding-production": "marketplace",
  rescue: "health", "rescue-animals": "reptile", "rescue-scan": "observatory", "rescue-incubator": "genetics", log: "knowledge",
  intelligence: "titan", "this-week": "titan", "keeper-handbook": "handbook", knowledge: "knowledge", learn: "academy", "adaptive-learning": "titan", challenge: "challenge", achievements: "wall",
  community: "community", marketplace: "marketplace", "feature-voting": "challenge", "vivarium-showcase": "enclosure", mentorship: "mentorship", "mentor-directory": "community", "become-mentor": "titan", "mentor-dashboard": "account", "my-mentees": "community", "mentorship-intelligence": "titan", "wall-of-titans": "wall", contribute: "contribution", "submit-species": "reptile", report: "testing", feedback: "messages", "my-issue-reports": "knowledge", "submission-messages": "messages",
  account: "account", profile: "account", settings: "account", personalise: "titan", family: "family", security: "health", privacy: "health", "intelligence-contribution": "titan", "become-titan": "titan",
  founder: "titan", sandbox: "testing", creator: "creator", "creator-preview": "observatory", "creator-morph": "morph", "creator-privacy": "health", "creator-benchmarks": "weight", "creator-submissions": "contribution", "creator-species-submissions": "reptile", "creator-vivarium": "enclosure", "creator-observations": "observatory", "creator-terminology": "morph", "creator-issues": "testing", "creator-community": "community", "creator-conversations": "messages", "creator-submission-conversations": "messages", "creator-mentor": "mentorship",
};

export function quickIconFor(id: string): TinyTitansIconName {
  return QUICK_ICON_MAP[id] ?? "titan";
}
