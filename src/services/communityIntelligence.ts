import type { CommunityContent } from "../types/communityEcosystem";

export type CommunitySignal = {
  label: string;
  reason: string;
  score: number;
};

export function getCommunitySignals(item: CommunityContent): CommunitySignal[] {
  const signals: CommunitySignal[] = [];
  const engagement = item.engagement ?? {};
  if ((engagement.helpful ?? 0) >= 3) signals.push({ label: "Helpful", reason: "Community members have marked this contribution as useful.", score: 3 });
  if ((engagement.comments ?? 0) >= 5) signals.push({ label: "Active discussion", reason: "This contribution has attracted an active conversation.", score: 2 });
  if (item.imageUrl) signals.push({ label: "Visual", reason: "This contribution includes imagery that helps the community understand it.", score: 1 });
  if (item.permissions?.includes("featured")) signals.push({ label: "Creator opted in", reason: "The creator explicitly allowed Tiny Titans to feature this content.", score: 2 });
  return signals.sort((a, b) => b.score - a.score);
}

export function scoreCommunityRelevance(item: CommunityContent, interests: string[]): number {
  const terms = interests.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!terms.length) return 0;
  const searchable = [item.title, item.summary, item.body, item.species, item.morph, ...(item.tags ?? []), item.board].filter(Boolean).join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0);
}

export function rankForKeeper(items: CommunityContent[], interests: string[]): CommunityContent[] {
  return items
    .map((item, index) => ({ item, score: scoreCommunityRelevance(item, interests) * 10 + (item.engagement?.helpful ?? 0) * 2 + (item.imageUrl ? 1 : 0) - index * 0.01 }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
