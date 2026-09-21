import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";

export type SetupInterest = "keeper" | "breeder" | "breeder-seller" | "learner";

export const ACCOUNT_SETUP_CONSENT_VERSION = "2026-09-02-community-location-v4";

export const PROFILE_OPTIONS: Array<{ id: ProfileType; title: string; description: string; icon: import("../types/tinyTitansIcon").TinyTitansIconName }> = [
  { id: "keeper", icon: "reptile", title: "Keeper", description: "I keep and care for reptiles." },
  { id: "learner", icon: "academy", title: "Learner", description: "I'm here to learn about reptiles and biology." },
  { id: "educator", icon: "educator", title: "Educator / Teacher", description: "I want to use Tiny Titans for teaching or classes." },
  { id: "professional", icon: "observatory", title: "Professional / Advanced", description: "I want deeper husbandry, genetics and data tools." },
];

export const AGE_OPTIONS: Array<{ id: AgeBand; title: string; description: string; icon: import("../types/tinyTitansIcon").TinyTitansIconName }> = [
  { id: "7-10", title: "Explorer", description: "Approx. ages 7–10", icon: "husbandry" },
  { id: "11-14", title: "Learner", description: "Approx. ages 11–14", icon: "search" },
  { id: "15-18", title: "Student", description: "Approx. ages 15–18", icon: "observatory" },
  { id: "adult", title: "Adult", description: "Adult learner / keeper", icon: "titan" },
];

export const EDUCATOR_LEVELS: Array<{ id: EducatorTeachingLevel; title: string }> = [
  { id: "primary", title: "Primary" },
  { id: "secondary", title: "Secondary" },
  { id: "college", title: "College" },
  { id: "university", title: "University" },
  { id: "homeschool", title: "Homeschool" },
  { id: "club", title: "Club / Group" },
  { id: "other", title: "Other" },
];

export const INTEREST_OPTIONS: Array<{ id: SetupInterest; icon: import("../types/tinyTitansIcon").TinyTitansIconName; title: string; description: string }> = [
  { id: "keeper", icon: "reptile", title: "Keeper", description: "I keep and care for reptiles." },
  { id: "breeder", icon: "genetics", title: "Breeder", description: "I breed reptiles and work with genetics." },
  { id: "breeder-seller", icon: "marketplace", title: "Breeder & Seller", description: "I breed and sell reptiles." },
  { id: "learner", icon: "knowledge", title: "Learner", description: "I'm here to learn." },
];

export const getLearningLevelForAge = (ageBand: AgeBand): LearningLevel =>
  ageBand === "7-10" ? "explorer" :
  ageBand === "11-14" ? "learner" :
  ageBand === "15-18" ? "student" :
  "adult";
