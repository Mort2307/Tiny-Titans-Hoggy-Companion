export type FoundingFollowerPlatform = "facebook" | "instagram";

export const FOUNDING_FOLLOWER_CAMPAIGN = {
  id: "founding_follower_pro_30",
  name: "Founding Follower Reward",
  tier: "titan_pro" as const,
  tierName: "Titan Pro",
  durationDays: 30,
  enabled: true,
  maxScreenshotBytes: 5 * 1024 * 1024,
  platforms: ["facebook", "instagram"] as FoundingFollowerPlatform[],
  description: "A thank-you for the early Tiny Titans community: one free 30-day Titan Pro reward for followers of Tiny Titans on Facebook or Instagram.",
} as const;

export const FOUNDING_FOLLOWER_PLATFORM_LABELS: Record<FoundingFollowerPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};
