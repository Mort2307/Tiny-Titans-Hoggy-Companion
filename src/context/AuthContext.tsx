import { useEffect, useState, type ReactNode } from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import app from "../firebase/config";
import { AuthContext, type UserProfile } from "./AuthContextValue";
import {
  loadUserProfile,
  recordUserActivity,
  refreshAuthenticatedProfile,
  runPostAuthSync,
} from "../services/authSessionService";

type AuthProviderProps = { children: ReactNode };

export type {
  UserCategory,
  UserInterest,
  UserPlatform,
  UserProfile,
  UserRole,
  ExperienceLevel,
} from "./AuthContextValue";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(false);

  async function hydrateUser(nextUser: User) {
    setProfileLoading(true);
    setProfileLoadError(false);
    try {
      const loadedProfile = await loadUserProfile(nextUser);
      setProfile(loadedProfile);
      setProfileLoadError(false);
      setProfileLoading(false);
      setLoading(false);

      void (async () => {
        try {
          const refreshedProfile = await refreshAuthenticatedProfile(nextUser, loadedProfile);
          if (getAuth(app).currentUser?.uid === nextUser.uid) {
            setProfile(refreshedProfile);
          }
        } catch (error) {
          console.warn("Tiny Titans: creator capability reconciliation unavailable", error);
        }

        await runPostAuthSync(nextUser, false);
      })();
    } catch (error) {
      console.error("Tiny Titans: unable to hydrate user state", error);
      // A network/App Check/Firestore startup failure is not the same thing as
      // a missing profile. Keep the authenticated session intact and let the
      // router offer a retry instead of incorrectly sending the user through
      // first-time account setup.
      setProfileLoadError(true);
      setProfileLoading(false);
      setLoading(false);
    }
  }

  async function refreshProfile() {
    const currentUser = getAuth(app).currentUser;
    if (!currentUser) {
      setProfile(null);
      setProfileLoadError(false);
      return null;
    }

    setProfileLoading(true);
    setProfileLoadError(false);
    try {
      const refreshedProfile = await refreshAuthenticatedProfile(currentUser, profile);
      setProfile(refreshedProfile);
      setProfileLoadError(false);
      await runPostAuthSync(currentUser, true);
      await recordUserActivity(currentUser);
      return refreshedProfile;
    } catch (error) {
      setProfileLoadError(true);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(app), async (nextUser) => {
      setUser(nextUser);
      setProfile(null);

      if (!nextUser) {
        setProfileLoadError(false);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      await hydrateUser(nextUser);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        profileLoadError,
        isAuthenticated: user !== null,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
