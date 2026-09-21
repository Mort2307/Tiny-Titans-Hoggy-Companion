import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "../firebase/config";
import { resolveCommunityLocation } from "./communityLocationResolver";
import { savePrivacyPreferences } from "./privacyService";
import { ACCOUNT_SETUP_CONSENT_VERSION } from "../config/accountSetup";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import type { UserCategory, ExperienceLevel, UserProfile } from "../context/AuthContextValue";

const db = getFirestore(app);

export type AccountSetupPayload = {
  displayName: string;
  category: UserCategory;
  profileType: ProfileType;
  ageBand: AgeBand;
  experienceLevel: ExperienceLevel;
  learningLevel: LearningLevel;
  interests: Array<"keeper" | "breeder" | "breeder-seller" | "learner">;
  teachingLevel: EducatorTeachingLevel | "";
  subjects: string;
  studentAgeBands: AgeBand[];
  reptileExperience: "beginner" | "intermediate" | "advanced";
  organisationName: string;
  city: string;
  country: string;
  approximateLocationConsent: boolean;
  analyticsConsent: boolean;
  productUpdatesConsent: boolean;
};

export async function saveAccountSetupProfile(user: {
  uid: string;
  email: string | null;
}, payload: AccountSetupPayload, refreshProfile: () => Promise<UserProfile | null>) {
  const canonicalLocation = payload.approximateLocationConsent
    ? await resolveCommunityLocation(payload.city, payload.country)
    : null;

  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  const profileData = {
    uid: user.uid,
    displayName: payload.displayName.trim(),
    email: user.email ?? "",
    category: payload.category,
    ageBand: payload.ageBand,
    learningLevel: payload.learningLevel,
    profileType: payload.profileType,
    experienceLevel: payload.experienceLevel,
    interests: payload.interests,
    role: "user" as const,
    setupComplete: true,
    ...(canonicalLocation
      ? { approximateLocation: { ...canonicalLocation, visibleToCreator: true, updatedAt: serverTimestamp() } }
      : { approximateLocation: null }),
    dataCollectionPreferences: {
      approximateLocation: payload.approximateLocationConsent,
      analytics: payload.analyticsConsent,
      productUpdates: payload.productUpdatesConsent,
      consentVersion: ACCOUNT_SETUP_CONSENT_VERSION,
      consentUpdatedAt: serverTimestamp(),
    },
    ...(payload.profileType === "educator"
      ? {
          educatorProfile: {
            teachingLevel: payload.teachingLevel,
            subjects: payload.subjects.split(",").map((item) => item.trim()).filter(Boolean),
            studentAgeBands: payload.studentAgeBands,
            reptileExperience: payload.reptileExperience,
            organisationName: payload.organisationName.trim() || undefined,
            verified: false,
          },
        }
      : {}),
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(userRef, { ...profileData, createdAt: serverTimestamp() });
  } else {
    await setDoc(userRef, profileData, { merge: true });
  }

  await savePrivacyPreferences(user.uid, {
    communityLocation: payload.approximateLocationConsent,
    anonymousAnalytics: payload.analyticsConsent,
    communityHusbandryData: false,
    productUpdates: payload.productUpdatesConsent,
  });

  return refreshProfile();
}
