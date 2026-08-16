import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore";
import app from "../firebase/config";
import type { AgeBand, ApproximateLocation, DataCollectionPreferences, EducatorProfile, LearningLevel, ProfileType } from "../types/Profile";
import type { UnitSystem } from "./UnitContext";
import packageJson from "../../package.json";

export type UserRole = "user" | "admin" | "moderator";
export type UserCategory = "adult" | "child";
export type ExperienceLevel = "beginner" | "intermediate" | "pro";
export type UserInterest = "keeper" | "breeder" | "breeder-seller" | "learner";
export type UserPlatform = "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  category: UserCategory;
  ageBand?: AgeBand;
  learningLevel?: LearningLevel;
  profileType: ProfileType;
  experienceLevel: ExperienceLevel;
  interests: UserInterest[];
  role: UserRole;
  isTester: boolean;
  setupComplete: boolean;
  unitSystem: UnitSystem;
  educatorProfile?: EducatorProfile;
  approximateLocation?: ApproximateLocation;
  dataCollectionPreferences?: DataCollectionPreferences;
  platform?: UserPlatform;
  appVersion?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
type AuthProviderProps = { children: ReactNode };
const db = getFirestore(app);

function detectPlatform(): UserPlatform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iOS";
  if (/android/.test(ua)) return "Android";
  if (/windows/.test(ua)) return "Windows";
  if (/macintosh|mac os x/.test(ua)) return "macOS";
  if (/linux/.test(ua)) return "Linux";
  return "Other";
}

function getAppVersion(): string {
  return String(packageJson.version || "unknown");
}

function isValidInterest(value: unknown): value is UserInterest {
  return value === "keeper" || value === "breeder" || value === "breeder-seller" || value === "learner";
}
function isProfileType(value: unknown): value is ProfileType {
  return value === "keeper" || value === "learner" || value === "educator" || value === "professional" || value === "creator";
}
function isAgeBand(value: unknown): value is AgeBand {
  return value === "7-10" || value === "11-14" || value === "15-18" || value === "adult";
}
function isLearningLevel(value: unknown): value is LearningLevel {
  return value === "explorer" || value === "learner" || value === "student" || value === "adult";
}
function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "imperial" || value === "metric";
}
function loadEducatorProfile(value: unknown): EducatorProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  const teachingLevel = ["primary", "secondary", "college", "university", "homeschool", "club", "other"].includes(String(data.teachingLevel)) ? data.teachingLevel as EducatorProfile["teachingLevel"] : "other";
  const subjects = Array.isArray(data.subjects) ? data.subjects.filter((item): item is string => typeof item === "string") : [];
  const studentAgeBands = Array.isArray(data.studentAgeBands) ? data.studentAgeBands.filter(isAgeBand) : [];
  const reptileExperience = data.reptileExperience === "advanced" ? "advanced" : data.reptileExperience === "intermediate" ? "intermediate" : "beginner";
  return { teachingLevel, subjects, studentAgeBands, reptileExperience, organisationName: typeof data.organisationName === "string" ? data.organisationName : undefined, country: typeof data.country === "string" ? data.country : undefined, verified: data.verified === true };
}
function loadApproximateLocation(value: unknown): ApproximateLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  if (typeof data.city !== "string" || typeof data.country !== "string") return undefined;
  return { city: data.city, country: data.country, source: data.source === "coarse-geolocation" ? "coarse-geolocation" : "user-provided", visibleToCreator: data.visibleToCreator === true, updatedAt: data.updatedAt };
}
function loadDataCollectionPreferences(value: unknown): DataCollectionPreferences | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  return { approximateLocation: data.approximateLocation === true, analytics: data.analytics === true, productUpdates: data.productUpdates === true, consentVersion: typeof data.consentVersion === "string" ? data.consentVersion : "unknown", consentUpdatedAt: data.consentUpdatedAt };
}

async function loadUserProfile(firebaseUser: User): Promise<UserProfile | null> {
  const profileSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
  if (!profileSnapshot.exists()) return null;
  const profileData = profileSnapshot.data();
  const rawInterests = Array.isArray(profileData.interests) ? profileData.interests : [];
  const interests = rawInterests.filter(isValidInterest);
  const profileType: ProfileType = isProfileType(profileData.profileType) ? profileData.profileType : interests.includes("learner") && interests.length === 1 ? "learner" : "keeper";
  return {
    uid: String(profileData.uid ?? firebaseUser.uid), displayName: String(profileData.displayName ?? firebaseUser.displayName ?? ""), email: String(profileData.email ?? firebaseUser.email ?? ""),
    category: profileData.category === "child" ? "child" : "adult", ageBand: isAgeBand(profileData.ageBand) ? profileData.ageBand : undefined, learningLevel: isLearningLevel(profileData.learningLevel) ? profileData.learningLevel : undefined,
    profileType, experienceLevel: profileData.experienceLevel === "intermediate" ? "intermediate" : profileData.experienceLevel === "pro" ? "pro" : "beginner", interests,
    role: profileData.role === "admin" ? "admin" : profileData.role === "moderator" ? "moderator" : "user", isTester: profileData.isTester === true || profileData.role === "tester",
    setupComplete: profileData.setupComplete === true, unitSystem: isUnitSystem(profileData.unitSystem) ? profileData.unitSystem : "metric", educatorProfile: loadEducatorProfile(profileData.educatorProfile),
    approximateLocation: loadApproximateLocation(profileData.approximateLocation), dataCollectionPreferences: loadDataCollectionPreferences(profileData.dataCollectionPreferences),
    platform: profileData.platform === "iOS" || profileData.platform === "Android" || profileData.platform === "Windows" || profileData.platform === "macOS" || profileData.platform === "Linux" || profileData.platform === "Other" ? profileData.platform : undefined,
    appVersion: typeof profileData.appVersion === "string" ? profileData.appVersion : undefined,
    createdAt: profileData.createdAt, updatedAt: profileData.updatedAt,
  };
}

async function recordActivity(firebaseUser: User): Promise<void> {
  try {
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      lastActiveAt: serverTimestamp(),
      platform: detectPlatform(),
      appVersion: getAppVersion(),
    });
  } catch (error) { console.warn("Tiny Titans: unable to update activity timestamp", error); }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null); const [profile, setProfile] = useState<UserProfile | null>(null); const [loading, setLoading] = useState(true); const [profileLoading, setProfileLoading] = useState(false);
  async function refreshProfile(): Promise<UserProfile | null> { const auth = getAuth(app); const currentUser = auth.currentUser; if (!currentUser) { setProfile(null); return null; } setProfileLoading(true); try { const loadedProfile = await loadUserProfile(currentUser); setProfile(loadedProfile); await recordActivity(currentUser); return loadedProfile; } catch (error) { console.error("Tiny Titans: unable to refresh user profile", error); setProfile(null); return null; } finally { setProfileLoading(false); } }
  useEffect(() => { const auth = getAuth(app); const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => { setUser(firebaseUser); setProfile(null); if (!firebaseUser) { setProfileLoading(false); setLoading(false); return; } setProfileLoading(true); try { const loadedProfile = await loadUserProfile(firebaseUser); setProfile(loadedProfile); await recordActivity(firebaseUser); } catch (error) { console.error("Tiny Titans: unable to load user profile", error); setProfile(null); } finally { setProfileLoading(false); setLoading(false); } }); return unsubscribe; }, []);
  return <AuthContext.Provider value={{ user, profile, loading, profileLoading, isAuthenticated: user !== null, refreshProfile }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context; }
