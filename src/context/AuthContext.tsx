import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getAuth,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import app from "../firebase/config";

export type UserRole = "user" | "admin" | "moderator";
export type UserCategory = "adult" | "child";
export type ExperienceLevel = "beginner" | "intermediate" | "pro";
export type UserInterest = "keeper" | "breeder" | "breeder-seller" | "learner";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  category: UserCategory;
  experienceLevel: ExperienceLevel;
  interests: UserInterest[];
  role: UserRole;
  setupComplete: boolean;
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

function isValidInterest(value: unknown): value is UserInterest {
  return value === "keeper" || value === "breeder" || value === "breeder-seller" || value === "learner";
}

async function loadUserProfile(firebaseUser: User): Promise<UserProfile | null> {
  const profileRef = doc(db, "users", firebaseUser.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (!profileSnapshot.exists()) return null;

  const profileData = profileSnapshot.data();
  const rawInterests = Array.isArray(profileData.interests) ? profileData.interests : [];
  const interests = rawInterests.filter(isValidInterest);

  return {
    uid: String(profileData.uid ?? firebaseUser.uid),
    displayName: String(profileData.displayName ?? firebaseUser.displayName ?? ""),
    email: String(profileData.email ?? firebaseUser.email ?? ""),
    category: profileData.category === "child" ? "child" : "adult",
    experienceLevel:
      profileData.experienceLevel === "intermediate"
        ? "intermediate"
        : profileData.experienceLevel === "pro"
          ? "pro"
          : "beginner",
    interests,
    role:
      profileData.role === "admin"
        ? "admin"
        : profileData.role === "moderator"
          ? "moderator"
          : "user",
    setupComplete: profileData.setupComplete === true,
    createdAt: profileData.createdAt,
    updatedAt: profileData.updatedAt,
  };
}

async function recordActivity(firebaseUser: User): Promise<void> {
  try {
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      lastActiveAt: serverTimestamp(),
    });
  } catch (error) {
    // Activity tracking must never prevent a user from entering the app.
    console.warn("Tiny Titans: unable to update activity timestamp", error);
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function refreshProfile(): Promise<UserProfile | null> {
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const loadedProfile = await loadUserProfile(currentUser);
      setProfile(loadedProfile);
      await recordActivity(currentUser);
      return loadedProfile;
    } catch (error) {
      console.error("Tiny Titans: unable to refresh user profile", error);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setProfile(null);

      if (!firebaseUser) {
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const loadedProfile = await loadUserProfile(firebaseUser);
        setProfile(loadedProfile);
        await recordActivity(firebaseUser);
      } catch (error) {
        console.error("Tiny Titans: unable to load user profile", error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated: user !== null,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}
