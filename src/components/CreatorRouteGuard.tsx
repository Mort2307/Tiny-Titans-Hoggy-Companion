import { Navigate, Outlet } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
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
      setCheckingClaims(true);
      try {
        const claimAuthorized = await hasCreatorClaim(true);
        if (active) setAuthorized(claimAuthorized || profile?.role === "admin");
      } catch {
        if (active) setAuthorized(profile?.role === "admin");
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
