export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legendary";

export const ACHIEVEMENT_TIERS: Array<{ tier: AchievementTier; icon: string; label: string; description: string }> = [
  { tier: "bronze", icon: "🥉", label: "Bronze", description: "You've started." },
  { tier: "silver", icon: "🥈", label: "Silver", description: "You're regularly using this." },
  { tier: "gold", icon: "🥇", label: "Gold", description: "You're seriously engaged." },
  { tier: "platinum", icon: "💎", label: "Platinum", description: "You're a power user." },
  { tier: "diamond", icon: "💠", label: "Diamond", description: "That's dedication." },
  { tier: "legendary", icon: "👑", label: "Legendary", description: "Holy shit, you've been using Tiny Titans for ages." },
];

export type AchievementTrigger = "questions" | "lessons" | "perfectBanks" | "knowledgeScore" | "streak" | "confirmedBugReports" | "snakes" | "weightLogs" | "feedingLogs" | "shedLogs";

export type AchievementDefinition = {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  trigger: AchievementTrigger;
  thresholds: [number, number, number, number, number, number];
};

export const achievementDefinitions: AchievementDefinition[] = [
  { id: "snake-keeper", category: "husbandry", title: "Snake Keeper", description: "Build your Tiny Titans collection.", icon: "🐍", trigger: "snakes", thresholds: [1, 3, 5, 10, 20, 30] },
  { id: "weight-tracker", category: "weight", title: "Weight Tracker", description: "Keep meaningful growth records.", icon: "⚖️", trigger: "weightLogs", thresholds: [5, 25, 50, 100, 250, 500] },
  { id: "feeding-tracker", category: "feeding", title: "Feeding Keeper", description: "Build a useful feeding history.", icon: "🍽️", trigger: "feedingLogs", thresholds: [10, 50, 100, 250, 500, 1000] },
  { id: "shed-tracker", category: "shed", title: "Shed Logger", description: "Build a long-term shedding record.", icon: "💧", trigger: "shedLogs", thresholds: [5, 25, 50, 100, 250, 500] },
  { id: "challenge-questions", category: "challenge", title: "Challenge Titan", description: "Complete Titans Challenge questions.", icon: "🧠", trigger: "questions", thresholds: [1, 25, 75, 150, 300, 500] },
  { id: "lessons-mastered", category: "challenge", title: "Knowledge Seeker", description: "Master complete learning topics.", icon: "📚", trigger: "lessons", thresholds: [1, 5, 15, 30, 60, 100] },
  { id: "perfect-banks", category: "challenge", title: "Perfect Bank", description: "Master complete question banks with 100%.", icon: "💯", trigger: "perfectBanks", thresholds: [1, 5, 15, 30, 60, 100] },
  { id: "knowledge-score", category: "challenge", title: "Knowledge Titan", description: "Reach a demonstrated knowledge score.", icon: "🏆", trigger: "knowledgeScore", thresholds: [15, 30, 50, 70, 85, 95] },
  { id: "learning-streak", category: "special", title: "Learning Streak", description: "Learn on consecutive days.", icon: "🔥", trigger: "streak", thresholds: [3, 7, 14, 30, 60, 100] },
  { id: "bug-hunter", category: "bug", title: "Bug Hunter", description: "Have confirmed bug reports accepted by the Tiny Titans team.", icon: "🐛", trigger: "confirmedBugReports", thresholds: [1, 5, 15, 30, 60, 100] },
];

export const achievementTierId = (definitionId: string, tierIndex: number) => `${definitionId}-${ACHIEVEMENT_TIERS[tierIndex].tier}`;
