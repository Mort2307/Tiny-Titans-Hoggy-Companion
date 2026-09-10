import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getPaidTierDefinition, type PaidEntitlement } from "../config/paidTiers";

export default function PaidTierGate({ entitlement, children, fallback }: { entitlement: PaidEntitlement; children: ReactNode; fallback?: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null); const [checking, setChecking] = useState(true);
  useEffect(() => { let active = true; if (!user) { setAccess(null); setChecking(false); return () => { active = false; }; } setChecking(true); void getPaidAccess(user.uid).then((next) => { if (active) setAccess(next); }).catch(() => { if (active) setAccess(null); }).finally(() => { if (active) setChecking(false); }); return () => { active = false; }; }, [user]);
  if (loading || profileLoading || checking) return <div aria-live="polite">Checking Tiny Titans access…</div>;
  const allowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  if (!allowed) return <>{fallback ?? <section aria-label="Paid feature"><strong>🔒 This feature is not included in your current plan.</strong><p>Your core Tiny Titans experience remains available. Upgrade or use an authorised test tier to preview this capability.</p></section>}</>;
  return <>{children}</>;
}
