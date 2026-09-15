import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { hasActiveRescuePilot } from "../services/rescueService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidEntitlement } from "../config/paidTiers";

function isRescueEntitlement(entitlement: PaidEntitlement) { return entitlement.startsWith("rescue_") || entitlement === "species_incubator"; }

export default function PaidTierGate({ entitlement, children, fallback }: { entitlement: PaidEntitlement; children: ReactNode; fallback?: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [rescuePilot, setRescuePilot] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    if (!user) { setAccess(null); setRescuePilot(false); setChecking(false); return () => { active = false; }; }
    setChecking(true);
    const requests = [getPaidAccess(user.uid)];
    if (isRescueEntitlement(entitlement)) requests.push(hasActiveRescuePilot(user.uid) as Promise<PaidAccess>);
    void Promise.all(requests).then(([nextAccess, pilotResult]) => {
      if (!active) return;
      setAccess(nextAccess);
      setRescuePilot(isRescueEntitlement(entitlement) && pilotResult === true);
    }).catch(() => { if (active) { setAccess(null); setRescuePilot(false); } }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [entitlement, user]);
  if (loading || profileLoading || checking) return <div aria-live="polite">Checking Tiny Titans access…</div>;
  const paidAllowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  const allowed = paidAllowed || rescuePilot;
  const requiredTier = PAID_TIER_ORDER.find((tierId) => tierId !== "free" && getPaidTierDefinition(tierId).entitlements.includes(entitlement)) ?? "titan_pro";
  if (!allowed) return <>{fallback ?? <section aria-label="Paid feature"><strong>🔒 {isRescueEntitlement(entitlement) ? "TinyTitans Rescue" : entitlement.replace(/[-_]/g, " ")} requires {getPaidTierDefinition(requiredTier).name} or an active authorised pilot.</strong><p>Your core Tiny Titans experience remains available. Rescue pilots are time-limited and controlled by Tiny Titans; normal subscriptions continue separately.</p><div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}><Link to="/plans">Compare plans</Link><Link to="/account/billing">Billing &amp; access</Link></div></section>}</>;
  return <>{children}</>;
}
