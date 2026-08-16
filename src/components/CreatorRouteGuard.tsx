import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { hasCreatorClaim } from "../services/creatorAuthService";
import { useAuth } from "../context/AuthContext";

export default function CreatorRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !user) {
      setAuthorized(null);
      return;
    }

    let active = true;
    void hasCreatorClaim(false)
      .then((value) => {
        if (active) setAuthorized(value);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });

    return () => {
      active = false;
    };
  }, [user, loading, profileLoading]);

  if (loading || profileLoading || authorized === null) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>🔐 Checking Creator access…</h1>
          <p>Tiny Titans is verifying the Firebase authorization claim.</p>
        </div>
      </div>
    );
  }

  if (!user || !authorized) return <Navigate to="/" replace />;
  return <>{children}</>;
}
