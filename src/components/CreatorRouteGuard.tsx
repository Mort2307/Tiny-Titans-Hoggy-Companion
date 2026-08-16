import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { hasCreatorClaim } from "../services/creatorAuthService";

type CreatorRouteGuardProps = {
  children?: ReactNode;
};

export default function CreatorRouteGuard({ children }: CreatorRouteGuardProps) {
  const { user, profile, loading, profileLoading } = useAuth();
  const [checkingClaims, setCheckingClaims] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      if (!user) {
        if (active) {
          setAuthorized(false);
          setCheckingClaims(false);
        }
        return;
      }

      // A persisted creator/admin role is the app's profile-level authorization
      // source. Custom claims provide an additional, stronger authorization path,
      // but a failed/unavailable claim sync must not lock the account out when the
      // profile already identifies the user as a creator or admin.
      const profileAuthorized = profile?.role === "creator" || profile?.role === "admin";
      if (profileAuthorized) {
        if (active) {
          setAuthorized(true);
          setCheckingClaims(false);
        }
        // Still refresh claims in the background so newly assigned/revoked claims
        // are picked up without making the Creator Hub unusable during claim sync.
        try {
          await hasCreatorClaim(true);
        } catch {
          // Profile authorization remains valid for this route guard.
        }
        return;
      }

      setCheckingClaims(true);
      try {
        const claimAuthorized = await hasCreatorClaim(true);
        if (active) setAuthorized(claimAuthorized);
      } catch {
        if (active) setAuthorized(false);
      } finally {
        if (active) setCheckingClaims(false);
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [user, profile?.role]);

  if (loading || profileLoading || checkingClaims) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>🛠️ Checking Creator access…</h1>
          <p>Securing the Tiny Titans control centre.</p>
        </div>
      </div>
    );
  }

  if (!user || !authorized) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
}
