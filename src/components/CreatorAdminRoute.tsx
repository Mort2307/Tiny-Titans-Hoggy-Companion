import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCreatorAdminAccess } from "../hooks/useCreatorAdminAccess";

export default function CreatorAdminRoute() {
  const { user, loading: authLoading, profileLoading } = useAuth();
  const { loading: adminLoading, allowed } = useCreatorAdminAccess(user);
  const location = useLocation();

  if (authLoading || profileLoading || adminLoading) return <main aria-live="polite"><p>Loading Creator Centre…</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!allowed) return <Navigate to="/" replace />;
  return <Outlet />;
}
