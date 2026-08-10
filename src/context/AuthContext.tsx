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

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser);

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
            const profileRef = doc(
              db,
              "users",
              firebaseUser.uid
            );

            const profileSnapshot =
              await getDoc(profileRef);

            if (
              profileSnapshot.exists()
            ) {
              const profileData =
                profileSnapshot.data();

              /* ============================
                 INTERESTS
              ============================ */

              const rawInterests =
                Array.isArray(
                  profileData.interests
                )
                  ? profileData.interests
                  : [];

              const interests =
                rawInterests.filter(
                  isValidInterest
                );

              /* ============================
                 PROFILE
              ============================ */

              const loadedProfile:
                UserProfile = {
                uid: String(
                  profileData.uid ??
                    firebaseUser.uid
                ),

                displayName: String(
                  profileData.displayName ??
                    ""
                ),

                email: String(
                  profileData.email ??
                    firebaseUser.email ??
                    ""
                ),

                category:
                  profileData.category ===
                  "child"
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
                  profileData.role ===
                  "admin"
                    ? "admin"
                    : profileData.role ===
                        "moderator"
                      ? "moderator"
                      : "user",

                setupComplete:
                  profileData.setupComplete ===
                  true,

                createdAt:
                  profileData.createdAt,

                updatedAt:
                  profileData.updatedAt,
              };

              setProfile(
                loadedProfile
              );
            } else {
              setProfile(null);
            }
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

  /* =========================================
     CONTEXT VALUE
  ========================================= */

  const value: AuthContextType = {
    user,

    profile,

    loading,

    profileLoading,

    isAuthenticated:
      user !== null,
  };

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