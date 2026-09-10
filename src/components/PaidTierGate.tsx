import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidEntitlement } from "../config/paidTiers";

export default function PaidTierGate({ entitlement, children, fallback }: { entitlement: PaidEntitlement; children: ReactNode; fallback?: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null); const [checking, setChecking] = useState(true);
  useEffect(() => { let active = true; if (!user) { setAccess(null); setChecking(false); return () => { active = false; }; } setChecking(true); void getPaidAccess(user.uid).then((next) => { if (active) setAccess(next); }).catch(() => { if (active) setAccess(null); }).finally(() => { if (active) setChecking(false); }); return () => { active = false; }; }, [user]);
  if (loading || profileLoading || checking) return <div aria-live="polite">Checking Tiny Titans access…</div>;
  const allowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  const requiredTier = PAID_TIER_ORDER.find((tierId) => tierId !== "free" && getPaidTierDefinition(tierId).entitlements.includes(entitlement)) ?? "titan_pro";
  if (!allowed) return <>{fallback ?? <section aria-label="Paid feature"><strong>🔒 {entitlement.replace(/[-_]/g, " ")} requires {getPaidTierDefinition(requiredTier).name} or higher.</strong><p>Your core Tiny Titans experience remains available. Compare plans or use authorised Creator testing to preview this capability without billing.</p><div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}><Link to="/plans">Compare plans</Link><Link to="/account/billing">Billing &amp; access</Link></div></section>}</>;
  return <>{children}</>;
}
