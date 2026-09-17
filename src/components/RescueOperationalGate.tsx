import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import type { RescueRole } from "../types/rescue";

const STAFF_ROLES: RescueRole[] = ["owner", "manager", "staff", "medical"];
export default function RescueOperationalGate({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const location = useLocation(); const [role, setRole] = useState<RescueRole|null>(null); const [orgId, setOrgId] = useState<string|null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; if (!user) { setLoading(false); return; } void getMyRescueWorkspace().then((result) => { if (!active) return; setRole(result.role); setOrgId(result.organisation?.id || null); }).catch(() => { if (active) { setRole(null); setOrgId(null); } }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user]);
  if (loading) return <main className="rescue-page"><section className="rescue-card"><p>Checking Rescue access…</p></section></main>;
  if (!role || !STAFF_ROLES.includes(role)) return <Navigate to={orgId ? `/rescue/public/${orgId}` : "/rescue"} replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
