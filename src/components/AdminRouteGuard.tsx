import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCreatorClaims } from "../services/creatorAuthService";
import { useEffect, useState } from "react";

export default function AdminRouteGuard() {
  const { user, loading, profileLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAllowed(false);
      setChecking(false);
      return () => { active = false; };
    }
    setChecking(true);
    void getCreatorClaims().then((claims) => {
      if (active) setAllowed(claims.admin === true || claims.creator === true);
    }).catch(() => {
      if (active) setAllowed(false);
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [user]);

  if (loading || profileLoading || checking) {
    return <div className="page-container"><div className="welcome-card"><h1>🔐 Checking admin access…</h1><p>Securing the Tiny Titans admin area.</p></div></div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!allowed) return <Navigate to="/" replace />;
  return <Outlet />;
}
