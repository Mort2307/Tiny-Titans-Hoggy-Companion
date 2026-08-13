import type { CareGuide } from '../types/CareGuide';

export interface CareGuideReviewState {
  status: 'draft' | 'published' | 'needs-review' | 'archived';
  version: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export function getCareGuideReviewState(guide: CareGuide): CareGuideReviewState {
  if (!guide.published) {
    return {
      status: 'draft',
      version: guide.version,
      reviewedAt: guide.reviewedAt,
      reviewedBy: guide.reviewedBy,
    };
  }

  return {
    status: 'published',
    version: guide.version,
    reviewedAt: guide.reviewedAt,
    reviewedBy: guide.reviewedBy,
  };
}

export function isCareGuideReviewOverdue(
  guide: CareGuide,
  now: Date = new Date(),
  reviewIntervalDays = 180,
): boolean {
  if (!guide.published || !guide.reviewedAt) return false;

  const reviewed = new Date(guide.reviewedAt).getTime();
  if (Number.isNaN(reviewed)) return true;

  const ageMs = now.getTime() - reviewed;
  return ageMs >= reviewIntervalDays * 86400000;
}
