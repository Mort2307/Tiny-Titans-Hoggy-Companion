export interface KeeperReputationInput {
  approvedContributions: number;
  helpfulMarks: number;
  comments: number;
  featuredContributions: number;
}

export interface KeeperReputationResult {
  score: number;
  tier: "New Keeper" | "Helpful Keeper" | "Trusted Keeper" | "Community Expert" | "Titan Steward";
  factors: readonly { id: string; label: string; points: number; explanation: string }[];
  note: string;
}

export function calculateTitanKeeperReputation(input: KeeperReputationInput): KeeperReputationResult {
  const contributions = Math.max(0, Math.floor(input.approvedContributions));
  const helpful = Math.max(0, Math.floor(input.helpfulMarks));
  const comments = Math.max(0, Math.floor(input.comments));
  const featured = Math.max(0, Math.floor(input.featuredContributions));
  const factors = [
    { id: "contributions", label: "Approved contributions", points: Math.min(50, contributions * 8), explanation: "Approved community contributions demonstrate participation after moderation." },
    { id: "helpful", label: "Helpful feedback", points: Math.min(25, helpful * 2), explanation: "Helpful marks represent utility to other keepers, capped so popularity cannot dominate the score." },
    { id: "discussion", label: "Constructive discussion", points: Math.min(15, comments), explanation: "Comment activity adds a small collaboration signal; it is intentionally capped." },
    { id: "featured", label: "Opted-in featured work", points: Math.min(10, featured * 5), explanation: "Featured content contributes only when the keeper explicitly opted into featuring it." },
  ];
  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
  const tier = score >= 90 ? "Titan Steward" : score >= 70 ? "Community Expert" : score >= 45 ? "Trusted Keeper" : score >= 20 ? "Helpful Keeper" : "New Keeper";
  return { score, tier, factors, note: "Reputation reflects transparent community contribution signals. It does not measure animal welfare, keeper competence, or scientific authority." };
}
