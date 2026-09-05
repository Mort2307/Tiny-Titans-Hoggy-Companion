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
 * Targets are cumulative lifetime support milestones, not separate charges or
 * claims that one payment buys one feature. Amounts are intentionally tied to
 * plausible project/infrastructure work so the roadmap explains what funding
 * unlocks without pretending a milestone is a supplier invoice.
 */
export const TITAN_GOALS: readonly TitanGoal[] = [
  {
    id: "infrastructure",
    targetGbp: 250,
    title: "Keep Tiny Titans Online",
    shortTitle: "Servers & Infrastructure",
    icon: "🖥️",
    description: "Cover the core hosting, database, storage and service costs that keep Tiny Titans reliable while the platform grows.",
    fundingUse: ["Firebase and hosting infrastructure", "Database and media storage", "Essential monitoring and maintenance"],
  },
  {
    id: "keeper-intelligence",
    targetGbp: 750,
    title: "Improve Keeper Intelligence",
    shortTitle: "Keeper Intelligence",
    icon: "🧠",
    description: "Turn more of the records keepers already enter into useful, transparent patterns, trends and warnings.",
    fundingUse: ["Intelligence engine development", "Trend and benchmark analysis", "Testing, explainability and reliability"],
  },
  {
    id: "species-intelligence",
    targetGbp: 1500,
    title: "Expand Species Intelligence",
    shortTitle: "Species Intelligence",
    icon: "🐍",
    description: "Research, review and progressively map more species-specific husbandry, evidence and genetics instead of relying on generic reptile rules.",
    fundingUse: ["Species research and source review", "Evidence mapping and audit tooling", "Expanded husbandry and genetics coverage"],
  },
  {
    id: "mobile-app",
    targetGbp: 2500,
    title: "Launch the Tiny Titans App",
    shortTitle: "Mobile App Launch",
    icon: "📱",
    description: "Move the polished web experience towards store-distributed Android and iOS apps with dedicated mobile QA and release preparation.",
    fundingUse: ["Android and iOS packaging", "Mobile-device testing and QA", "Store submission, release and compliance work"],
  },
  {
    id: "security-reliability",
    targetGbp: 3500,
    title: "Harden Security & Backups",
    shortTitle: "Security & Reliability",
    icon: "🛡️",
    description: "Strengthen the foundations as Tiny Titans becomes responsible for more keeper records, media and community activity.",
    fundingUse: ["Backup and recovery improvements", "Security and permission audits", "Performance, observability and failure testing"],
  },
  {
    id: "community-creator",
    targetGbp: 5000,
    title: "Build the Titan Community",
    shortTitle: "Community & Creator Tools",
    icon: "🌍",
    description: "Develop the community, contribution and Creator systems that let keepers help improve Tiny Titans without sacrificing moderation or data quality.",
    fundingUse: ["Community contribution workflows", "Creator review and moderation tooling", "Better community discovery and collaboration"],
  },
  {
    id: "marketplace",
    targetGbp: 7500,
    title: "Build the Keeper Marketplace",
    shortTitle: "Marketplace Foundation",
    icon: "🛒",
    description: "Create the foundations for a serious keeper-to-breeder marketplace with safer discovery, listings and supporting infrastructure.",
    fundingUse: ["Breeder and seller profiles", "Listings, discovery and enquiry tools", "Marketplace safety, moderation and infrastructure"],
  },
  {
    id: "next-generation",
    targetGbp: 10000,
    title: "Tiny Titans: Next Generation",
    shortTitle: "Next Generation",
    icon: "🚀",
    description: "Fund a larger development push across the features, research and platform improvements that matter most to the keeper community.",
    fundingUse: ["Major feature development", "Deep performance and architecture work", "Larger research, community and mobile roadmap"],
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
