import type { CareGuide } from '../types/CareGuide';
import { westernHognoseEssentials } from '../data/careGuides/westernHognoseEssentials';
import { heatingAndTemperatureGuide } from '../data/careGuides/heatingAndTemperature';
import { handlingAndBehaviourGuide } from '../data/careGuides/handlingAndBehaviour';

export const careGuides: CareGuide[] = [
  westernHognoseEssentials,
  heatingAndTemperatureGuide,
  handlingAndBehaviourGuide,
];

export function getCareGuideById(id: string): CareGuide | undefined {
  return careGuides.find((guide) => guide.id === id);
}

export function getPublishedCareGuides(): CareGuide[] {
  return careGuides.filter((guide) => guide.published);
}

export function getCareGuidesByCategory(category: CareGuide['category']): CareGuide[] {
  return careGuides.filter((guide) => guide.category === category);
}

export function searchCareGuides(query: string): CareGuide[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getPublishedCareGuides();

  return getPublishedCareGuides().filter((guide) => {
    const haystack = [
      guide.title,
      guide.summary,
      guide.category,
      guide.audience,
      ...guide.sections.map((section) => `${section.title} ${section.body}`),
    ].join(' ').toLowerCase();

    return haystack.includes(normalized);
  });
}
