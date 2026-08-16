import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { useAuth } from "../context/AuthContext";

export default function CreatorRouteGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !user) {
      setAuthorized(null);
      return;
    }

    let active = true;

    void hasCreatorClaim(false)
      .then((claimAuthorized) => {
        if (!active) return;

        // Preserve access for existing Creator/Admin accounts while Firebase
        // custom claims are being migrated. Claim authorization remains the
        // preferred mechanism and the actual Firestore security boundary.
        const legacyCreatorAuthorized =
          profile?.role === "admin" || profile?.profileType === "creator";

        setAuthorized(claimAuthorized || legacyCreatorAuthorized);
      })
      .catch(() => {
        if (!active) return;
        setAuthorized(
          profile?.role === "admin" || profile?.profileType === "creator"
        );
      });

    return () => {
      active = false;
    };
  }, [user, profile, loading, profileLoading]);

  if (loading || profileLoading || authorized === null) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>🔐 Checking Creator access…</h1>
          <p>Tiny Titans is verifying your Creator/Admin authorization.</p>
        </div>
      </div>
    );
  }

  if (!user || !authorized) return <Navigate to="/" replace />;
  return <>{children}</>;
}
