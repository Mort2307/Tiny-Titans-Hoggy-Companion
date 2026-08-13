import type { CareGuide } from '../types/CareGuide';
import { getPublishedCareGuides } from './careGuideRegistry';

const relatedCategories: Record<CareGuide['category'], CareGuide['category'][]> = {
  'getting-started': ['housing', 'heating', 'feeding', 'handling'],
  housing: ['heating', 'humidity', 'safety'],
  heating: ['housing', 'lighting', 'humidity'],
  lighting: ['heating', 'housing'],
  humidity: ['housing', 'shedding', 'safety'],
  substrate: ['housing', 'humidity', 'cleaning'],
  feeding: ['health', 'getting-started'],
  handling: ['getting-started', 'safety'],
  shedding: ['humidity', 'health'],
  health: ['feeding', 'shedding', 'safety'],
  brumation: ['heating', 'health', 'breeding'],
  breeding: ['brumation', 'health', 'feeding'],
  safety: ['housing', 'health', 'cleaning'],
  troubleshooting: ['health', 'heating', 'feeding', 'humidity'],
};

export function getRelatedCareGuides(guide: CareGuide, limit = 4): CareGuide[] {
  const preferred = relatedCategories[guide.category] ?? [];
  return getPublishedCareGuides()
    .filter((candidate) => candidate.id !== guide.id)
    .sort((a, b) => {
      const aScore = preferred.includes(a.category) ? 1 : 0;
      const bScore = preferred.includes(b.category) ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, limit);
}
