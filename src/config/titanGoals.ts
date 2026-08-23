export type TitanGoal = {
  id: string;
  targetGbp: number;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  fundingUse: string[];
};

/**
 * Public Titan Fund roadmap.
 * Targets are cumulative lifetime support milestones, not promises that every
 * pound is spent exclusively on the named item. The copy deliberately explains
 * the intended use without pretending that store/platform costs equal the goal.
 */
export const TITAN_GOALS: readonly TitanGoal[] = [
  {
    id: "keep-growing",
    targetGbp: 100,
    title: "Keep Tiny Titans Growing",
    shortTitle: "Keep Growing",
    icon: "🌱",
    description: "Keep the core app, infrastructure and ongoing development moving.",
    fundingUse: ["Hosting and Firebase infrastructure", "Storage and essential services", "Bug fixes and maintenance"],
  },
  {
    id: "genetics-knowledge",
    targetGbp: 250,
    title: "Expand Genetics & Knowledge",
    shortTitle: "Genetics & Knowledge",
    icon: "🧬",
    description: "Expand the morph/genetics knowledge base and educational material.",
    fundingUse: ["Morph and genetics database work", "Verified educational content", "Better keeper learning tools"],
  },
  {
    id: "marketplace",
    targetGbp: 500,
    title: "Build the Marketplace",
    shortTitle: "Marketplace",
    icon: "🛒",
    description: "Push the keeper-to-breeder marketplace towards the polished experience we want it to be.",
    fundingUse: ["Seller profiles and stock tools", "Buyer discovery and safety features", "Marketplace infrastructure"],
  },
  {
    id: "keeper-intelligence",
    targetGbp: 750,
    title: "Power Keeper Intelligence",
    shortTitle: "Keeper Intelligence",
    icon: "🧠",
    description: "Expand the intelligent systems that turn keeper records into useful, transparent patterns.",
    fundingUse: ["Intelligence engine development", "Community benchmark tooling", "Testing and reliability work"],
  },
  {
    id: "native-mobile",
    targetGbp: 1000,
    title: "Launch Tiny Titans Mobile",
    shortTitle: "Native App Launch",
    icon: "📱",
    description: "Help move Tiny Titans from a web app into polished store-distributed Android and iOS apps.",
    fundingUse: ["Google Play developer and release costs", "Apple Developer and iOS release costs", "Native packaging, testing and store preparation"],
  },
  {
    id: "next-generation",
    targetGbp: 1500,
    title: "Tiny Titans: Next Generation",
    shortTitle: "Next Generation",
    icon: "🚀",
    description: "Fund a larger development push across the features that matter most to the keeper community.",
    fundingUse: ["Major feature development", "Performance and reliability improvements", "New community and creator tooling"],
  },
];

export function getCurrentTitanGoal(totalReceivedGbp: number): TitanGoal | null {
  return TITAN_GOALS.find((goal) => totalReceivedGbp < goal.targetGbp) ?? null;
}

export function getCompletedTitanGoals(totalReceivedGbp: number): TitanGoal[] {
  return TITAN_GOALS.filter((goal) => totalReceivedGbp >= goal.targetGbp);
}

export function getPreviousTitanGoal(totalReceivedGbp: number): TitanGoal | null {
  const completed = getCompletedTitanGoals(totalReceivedGbp);
  return completed[completed.length - 1] ?? null;
}
