import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { hasCapability, type Capability } from "../services/capabilityService";

export default function RequireCapability({ capability, children, fallback = "/" }: { capability: Capability; children: ReactNode; fallback?: string }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let active = true;
    void hasCapability(capability, profile).then((result) => { if (active) setAuthorized(result); }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [capability, loading, profile, profileLoading, user]);
  if (loading || profileLoading || (Boolean(user) && authorized === null)) return <div className="page-container"><div className="welcome-card"><h1>🔐 Checking access…</h1><p>Tiny Titans is verifying your account capability.</p></div></div>;
  if (!user || !authorized) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}