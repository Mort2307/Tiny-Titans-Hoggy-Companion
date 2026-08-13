import type { CareGuide } from '../types/CareGuide';
import { getPublishedCareGuides, searchCareGuides } from './careGuideRegistry';

export interface CareGuideSearchResult {
  guide: CareGuide;
  score: number;
}

export function searchPublishedCareGuides(query: string): CareGuideSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return getPublishedCareGuides().map((guide) => ({ guide, score: 0 }));
  }

  return searchCareGuides(normalized)
    .map((guide) => {
      const title = guide.title.toLowerCase();
      const summary = guide.summary.toLowerCase();
      let score = 1;
      if (title === normalized) score += 100;
      else if (title.includes(normalized)) score += 25;
      if (summary.includes(normalized)) score += 10;
      return { guide, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function getCareGuideCategories(): CareGuide['category'][] {
  return Array.from(new Set(getPublishedCareGuides().map((guide) => guide.category)));
}
