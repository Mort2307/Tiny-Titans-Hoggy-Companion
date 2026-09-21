import type { AgeBand, ApproximateLocation, DataCollectionPreferences, EducatorProfile, LearningLevel, ProfileType } from "../types/Profile";
import type { UnitSystem } from "../context/UnitContext";
import type { UserInterest, UserPlatform, UserProfile } from "../context/AuthContextValue";
import type { User } from "firebase/auth";

export function isValidInterest(value: unknown): value is UserInterest {
  return value === "keeper" || value === "breeder" || value === "breeder-seller" || value === "learner";
}
export function isProfileType(value: unknown): value is ProfileType {
  return value === "keeper" || value === "learner" || value === "educator" || value === "professional" || value === "creator";
}
export function isAgeBand(value: unknown): value is AgeBand {
  return value === "7-10" || value === "11-14" || value === "15-18" || value === "adult";
}
export function isLearningLevel(value: unknown): value is LearningLevel {
  return value === "explorer" || value === "learner" || value === "student" || value === "adult";
}
export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "imperial" || value === "metric";
}
export function loadEducatorProfile(value: unknown): EducatorProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  return {
    teachingLevel: ["primary","secondary","college","university","homeschool","club","other"].includes(String(data.teachingLevel))
      ? data.teachingLevel as EducatorProfile["teachingLevel"] : "other",
    subjects: Array.isArray(data.subjects) ? data.subjects.filter((item): item is string => typeof item === "string") : [],
    studentAgeBands: Array.isArray(data.studentAgeBands) ? data.studentAgeBands.filter(isAgeBand) : [],
    reptileExperience: data.reptileExperience === "advanced" ? "advanced" : data.reptileExperience === "intermediate" ? "intermediate" : "beginner",
    organisationName: typeof data.organisationName === "string" ? data.organisationName : undefined,
    country: typeof data.country === "string" ? data.country : undefined,
    verified: data.verified === true,
  };
}
export function loadApproximateLocation(value: unknown): ApproximateLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  if (typeof data.city !== "string" || typeof data.country !== "string") return undefined;
  return {
    city:data.city,country:data.country,
    source:data.source === "coarse-geolocation" ? "coarse-geolocation" : "user-provided",
    visibleToCreator:data.visibleToCreator === true,updatedAt:data.updatedAt,
  };
}
export function loadDataCollectionPreferences(value: unknown): DataCollectionPreferences | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data=value as Record<string,unknown>;
  return {
    approximateLocation:data.approximateLocation===true,analytics:data.analytics===true,
    productUpdates:data.productUpdates===true,communityHusbandryData:data.communityHusbandryData===true,
    consentVersion:typeof data.consentVersion==="string"?data.consentVersion:"unknown",consentUpdatedAt:data.consentUpdatedAt,
  };
}
function platform(value: unknown): UserPlatform | undefined {
  return value === "iOS" || value === "Android" || value === "Windows" || value === "macOS" || value === "Linux" || value === "Other" ? value : undefined;
}
export function parseUserProfile(data: Record<string, any>, firebaseUser: User): UserProfile {
  const interests=(Array.isArray(data.interests)?data.interests:[]).filter(isValidInterest);
  const profileType:ProfileType=isProfileType(data.profileType)
    ? data.profileType
    : interests.includes("learner") && interests.length===1 ? "learner" : "keeper";
  return {
    uid:String(data.uid??firebaseUser.uid),
    displayName:String(data.displayName??firebaseUser.displayName??""),
    email:String(data.email??firebaseUser.email??""),
    category:data.category==="child"?"child":"adult",
    ageBand:isAgeBand(data.ageBand)?data.ageBand:undefined,
    learningLevel:isLearningLevel(data.learningLevel)?data.learningLevel:undefined,
    profileType,
    experienceLevel:data.experienceLevel==="intermediate"?"intermediate":data.experienceLevel==="pro"?"pro":"beginner",
    interests,
    role:data.role==="admin"?"admin":data.role==="moderator"?"moderator":"user",
    isTester:data.isTester===true || data.role==="tester",
    setupComplete:data.setupComplete===true,
    unitSystem:isUnitSystem(data.unitSystem)?data.unitSystem:"metric",
    educatorProfile:loadEducatorProfile(data.educatorProfile),
    approximateLocation:loadApproximateLocation(data.approximateLocation),
    dataCollectionPreferences:loadDataCollectionPreferences(data.dataCollectionPreferences),
    privacyConsentVersion:typeof data.privacyConsent?.version==="string"?data.privacyConsent.version:undefined,
    platform:platform(data.platform),
    appVersion:typeof data.appVersion==="string"?data.appVersion:undefined,
    timezone:typeof data.timezone==="string"?data.timezone:undefined,
    timezoneOffsetMinutes:typeof data.timezoneOffsetMinutes==="number"?data.timezoneOffsetMinutes:undefined,
    timezoneSource:data.timezoneSource==="device"?"device":undefined,
    timezoneObservedAt:data.timezoneObservedAt,
    familyId:typeof data.familyId==="string"?data.familyId:undefined,
    familyRole:data.familyRole==="owner"||data.familyRole==="adult"||data.familyRole==="child"?data.familyRole:undefined,
    createdAt:data.createdAt,updatedAt:data.updatedAt,
  };
}
