import type { UserCategory } from "../context/useAuth";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import type { WeekStartDay } from "../types/easyNav";

export type PersonalisationProfile = {
  profileType: ProfileType;
  category: UserCategory;
  ageBand: AgeBand;
  learningLevel: LearningLevel;
  experience: string;
  teachingLevel: EducatorTeachingLevel;
  subjects: string;
  organisationName: string;
};

export function parseWeekStart(value: string): WeekStartDay | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed as WeekStartDay : null;
}

export function toggleOrderedId<T extends string>(
  items: T[],
  id: T,
  minimum: number,
  maximum: number,
): T[] {
  if (items.includes(id)) {
    if (items.length <= minimum) return items;
    return items.filter((item) => item !== id);
  }
  if (items.length >= maximum) return items;
  return [...items, id];
}

export function moveId<T extends string>(
  items: T[],
  index: number,
  direction: -1 | 1,
): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function buildPersonalisationProfileData(
  form: PersonalisationProfile,
  existingEducatorProfile?: {
    studentAgeBands?: string[];
    reptileExperience?: string;
    verified?: boolean;
  },
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    profileType: form.profileType,
    category: form.category,
    ageBand: form.ageBand,
    learningLevel: form.learningLevel,
    experienceLevel: form.experience,
  };

  if (form.profileType === "educator") {
    data.educatorProfile = {
      teachingLevel: form.teachingLevel,
      subjects: form.subjects.split(",").map((item) => item.trim()).filter(Boolean),
      studentAgeBands:
        existingEducatorProfile?.studentAgeBands?.length
          ? existingEducatorProfile.studentAgeBands
          : ["11-14"],
      reptileExperience:
        form.experience === "pro" ? "advanced" : form.experience,
      organisationName: form.organisationName.trim() || undefined,
      verified: existingEducatorProfile?.verified === true,
    };
  }

  return data;
}
