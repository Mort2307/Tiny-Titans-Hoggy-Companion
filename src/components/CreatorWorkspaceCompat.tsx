import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";
import { AuthContext } from "../context/AuthContextValue";
import { TINY_TITANS_OWNER_EMAIL } from "../services/capabilityService";

/**
 * Compatibility layer for Creator workspace pages that historically checked
 * profile.role === "admin" before the Creator capability model was introduced.
 * Route-level CreatorRouteGuard/RequireCapability remains the real access
 * boundary; this only lets a legitimate Creator-capable owner pass those
 * legacy page-local role checks.
 */
export default function CreatorWorkspaceCompat({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const profile = auth.profile;
  const isCreatorHubHome = window.location.pathname === "/creator";
  const isOwnerAccount = String(auth.user?.email || "").trim().toLowerCase() === TINY_TITANS_OWNER_EMAIL;
  const isLegacyCreatorProfile = profile?.profileType === "creator";

  if (
    isCreatorHubHome ||
    !profile ||
    profile.role === "admin" ||
    (!isOwnerAccount && !isLegacyCreatorProfile)
  ) {
    return <>{children}</>;
  }

  const bridgedProfile = { ...profile, role: "admin" as const };
  return <AuthContext.Provider value={{ ...auth, profile: bridgedProfile }}>{children}</AuthContext.Provider>;
}
