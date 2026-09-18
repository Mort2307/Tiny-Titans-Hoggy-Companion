import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getRescueAccess } from "../services/rescueService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getRescueSetupState } from "../services/rescueSetupService";
import { hasCapability } from "../services/capabilityService";
import type { RescueRole } from "../types/rescue";

const STAFF_ROLES: RescueRole[] = ["owner", "manager", "staff", "medical"];

export default function RescueOperationalGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState<RescueRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [creatorAccess, setCreatorAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setRole(null);
        setOrgId(null);
        setSetupComplete(null);
        setCreatorAccess(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      const isCreator = await hasCapability("creator").catch(() => false);
      if (!active) return;
      setCreatorAccess(isCreator);

      try {
        const result = await getMyRescueWorkspace();
        if (!active) return;

        const effectiveRole =
          result.role || getRescueAccess(result.organisation, user.uid).role;

        setRole(effectiveRole);
        setOrgId(result.organisation?.id || null);

        if (result.organisation && effectiveRole === "owner") {
          const setup = await getRescueSetupState(result.organisation.id);
          if (active) setSetupComplete(setup.organisation.setupComplete);
        } else if (active) {
          setSetupComplete(true);
        }
      } catch {
        if (active) {
          setRole(null);
          setOrgId(null);
          setSetupComplete(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (
    loading ||
    creatorAccess === null ||
    (role === "owner" && setupComplete === null)
  ) {
    return (
      <main className="rescue-page">
        <section className="rescue-card">
          <p>Checking Rescue access…</p>
        </section>
      </main>
    );
  }

  // The creator account already has the Rescue bypass used by PaidTierGate
  // and Firebase rules, so operational routes must honour the same access
  // model even when there is no membership role to return.
  if (creatorAccess) return <>{children}</>;

  if (!role || !STAFF_ROLES.includes(role)) {
    return (
      <Navigate
        to={orgId ? `/rescue/public/${orgId}` : "/rescue?manage=1"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (role === "owner" && setupComplete === false) {
    return (
      <Navigate
        to="/rescue?manage=1"
        replace
        state={{ setupRequired: true, from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
