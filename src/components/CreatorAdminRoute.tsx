import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isCreatorAdmin } from "../utils/adminAccess";

export default function CreatorAdminRoute() {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <main aria-live="polite"><p>Loading Creator Centre…</p></main>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isCreatorAdmin(user, profile)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
