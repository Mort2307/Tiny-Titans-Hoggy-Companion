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
} from "firebase/firestore";

import app from "../firebase/config";

/* =========================================
   USER TYPES
========================================= */

export type UserRole =
  | "user"
  | "admin"
  | "moderator";

export type UserCategory =
  | "adult"
  | "child";

export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "pro";

export type UserInterest =
  | "keeper"
  | "breeder"
  | "breeder-seller"
  | "learner";

/* =========================================
   USER PROFILE
========================================= */

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

/* =========================================
   AUTH CONTEXT
========================================= */

type AuthContextType = {
  user: User | null;

  profile: UserProfile | null;

  loading: boolean;

  profileLoading: boolean;

  isAuthenticated: boolean;

  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

/* =========================================
   PROVIDER PROPS
========================================= */

type AuthProviderProps = {
  children: ReactNode;
};

/* =========================================
   FIRESTORE
========================================= */

const db = getFirestore(app);

/* =========================================
   VALIDATION HELPERS
========================================= */

function isValidInterest(
  value: unknown
): value is UserInterest {
  return (
    value === "keeper" ||
    value === "breeder" ||
    value === "breeder-seller" ||
    value === "learner"
  );
}

/* =========================================
   PROFILE LOADER
========================================= */

async function loadUserProfile(
  firebaseUser: User
): Promise<UserProfile | null> {
  const profileRef = doc(
    db,
    "users",
    firebaseUser.uid
  );

  const profileSnapshot =
    await getDoc(profileRef);

  /*
   * No Firestore profile yet.
   *
   * This is expected for a newly registered
   * Firebase account before Account Setup.
   */

  if (!profileSnapshot.exists()) {
    return null;
  }

  const profileData =
    profileSnapshot.data();

  /* =======================================
     INTERESTS
  ======================================= */

  const rawInterests =
    Array.isArray(profileData.interests)
      ? profileData.interests
      : [];

  const interests =
    rawInterests.filter(
      isValidInterest
    );

  /* =======================================
     PROFILE
  ======================================= */

  const loadedProfile: UserProfile = {
    uid: String(
      profileData.uid ??
        firebaseUser.uid
    ),

    displayName: String(
      profileData.displayName ??
        firebaseUser.displayName ??
        ""
    ),

    email: String(
      profileData.email ??
        firebaseUser.email ??
        ""
    ),

    category:
      profileData.category === "child"
        ? "child"
        : "adult",

    experienceLevel:
      profileData.experienceLevel ===
      "intermediate"
        ? "intermediate"
        : profileData.experienceLevel ===
            "pro"
          ? "pro"
          : "beginner",

    interests,

    role:
      profileData.role === "admin"
        ? "admin"
        : profileData.role ===
            "moderator"
          ? "moderator"
          : "user",

    setupComplete:
      profileData.setupComplete === true,

    createdAt:
      profileData.createdAt,

    updatedAt:
      profileData.updatedAt,
  };

  return loadedProfile;
}

/* =========================================
   AUTH PROVIDER
========================================= */

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [profileLoading, setProfileLoading] =
    useState(false);

  /* =======================================
     REFRESH PROFILE
  ======================================= */

  async function refreshProfile(): Promise<UserProfile | null> {
    const auth = getAuth(app);

    const currentUser =
      auth.currentUser;

    /*
     * There is no authenticated Firebase user.
     */

    if (!currentUser) {
      setProfile(null);

      return null;
    }

    setProfileLoading(true);

    try {
      const loadedProfile =
        await loadUserProfile(
          currentUser
        );

      setProfile(
        loadedProfile
      );

      return loadedProfile;

    } catch (error) {
      console.error(
        "Tiny Titans: unable to refresh user profile",
        error
      );

      setProfile(null);

      return null;

    } finally {
      setProfileLoading(false);
    }
  }

  /* =======================================
     AUTH STATE
  ======================================= */

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          /*
           * Update Firebase user immediately.
           */

          setUser(firebaseUser);

          /*
           * Always clear the previous profile
           * before loading the new one.
           *
           * This prevents one user's profile
           * from temporarily appearing while
           * another authentication state loads.
           */

          setProfile(null);

          /* ================================
             NO USER
          ================================= */

          if (!firebaseUser) {
            setProfileLoading(false);
            setLoading(false);

            return;
          }

          /* ================================
             LOAD PROFILE
          ================================= */

          setProfileLoading(true);

          try {
            const loadedProfile =
              await loadUserProfile(
                firebaseUser
              );

            setProfile(
              loadedProfile
            );

          } catch (error) {
            console.error(
              "Tiny Titans: unable to load user profile",
              error
            );

            setProfile(null);

          } finally {
            setProfileLoading(false);
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  /* =======================================
     CONTEXT VALUE
  ======================================= */

  const value: AuthContextType = {
    user,

    profile,

    loading,

    profileLoading,

    isAuthenticated:
      user !== null,

    refreshProfile,
  };

  /* =======================================
     PROVIDER
  ======================================= */

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================
   USE AUTH
========================================= */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}