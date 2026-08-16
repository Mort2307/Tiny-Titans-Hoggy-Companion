import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasCreatorClaim } from "../services/creatorAuthService";

export default function CreatorRouteGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const [checkingClaims, setCheckingClaims] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!user) {
        if (active) { setAuthorized(false); setCheckingClaims(false); }
        return;
      }
      setCheckingClaims(true);
      try {
        const claimAuthorized = await hasCreatorClaim();
        // Temporary migration compatibility: existing server-side admin profiles
        // remain usable while their Firebase custom claim is provisioned.
        if (active) setAuthorized(claimAuthorized || profile?.role === "admin");
      } catch {
        if (active) setAuthorized(profile?.role === "admin");
      } finally {
        if (active) setCheckingClaims(false);
      }
    }
    void check();
    return () => { active = false; };
  }, [user, profile?.role]);

  if (loading || profileLoading || checkingClaims) {
    return <div className="page-container"><div className="welcome-card"><h1>🛠️ Checking Creator access…</h1><p>Securing the Tiny Titans control centre.</p></div></div>;
  }
  if (!user || !authorized) return <Navigate to="/" replace />;
  return <>{children}</>;
}
