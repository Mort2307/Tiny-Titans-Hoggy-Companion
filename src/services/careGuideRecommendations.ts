import type { CareGuide } from '../types/CareGuide';
import { getPublishedCareGuides } from './careGuideRegistry';

export interface CareGuideRecommendationContext {
  snakeAgeMonths?: number;
  isHatchling?: boolean;
  isBreedingProject?: boolean;
  isShedding?: boolean;
  hasFeedingConcern?: boolean;
  hasHealthConcern?: boolean;
}

export function getRelevantCareGuides(context: CareGuideRecommendationContext): CareGuide[] {
  const guides = getPublishedCareGuides();
  const ids = new Set<string>();

  if (context.isHatchling || (context.snakeAgeMonths !== undefined && context.snakeAgeMonths < 12)) {
    ids.add('hatchling-care');
  }

  if (context.isShedding) ids.add('shedding');
  if (context.hasFeedingConcern) ids.add('feeding-fundamentals');
  if (context.hasHealthConcern) ids.add('health-and-red-flags');
  if (context.isBreedingProject) ids.add('breeding-and-reproduction');

  return guides.filter((guide) => ids.has(guide.id));
}
