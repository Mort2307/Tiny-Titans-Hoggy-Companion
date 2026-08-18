export type ProfileType =
  | "keeper"
  | "learner"
  | "educator"
  | "professional"
  | "creator";

export type LearningLevel =
  | "explorer"
  | "learner"
  | "student"
  | "adult";

export type AgeBand =
  | "7-10"
  | "11-14"
  | "15-18"
  | "adult";

export type EducatorTeachingLevel =
  | "primary"
  | "secondary"
  | "college"
  | "university"
  | "homeschool"
  | "club"
  | "other";

export type EducatorProfile = {
  teachingLevel: EducatorTeachingLevel;
  subjects: string[];
  studentAgeBands: AgeBand[];
  reptileExperience: "beginner" | "intermediate" | "advanced";
  organisationName?: string;
  country?: string;
  verified: boolean;
};

/**
 * Deliberately coarse community location. Raw browser GPS coordinates are
 * never part of this persisted model. The stored point is the centre of a
 * privacy cell of roughly five miles across/under in normal UK latitudes.
 */
export type ApproximateLocation = {
  city: string;
  country: string;
  source: "user-provided" | "coarse-geolocation";
  visibleToCreator: boolean;
  areaId?: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: unknown;
};

export type DataCollectionPreferences = {
  approximateLocation: boolean;
  analytics: boolean;
  productUpdates: boolean;
  consentVersion: string;
  consentUpdatedAt?: unknown;
};
