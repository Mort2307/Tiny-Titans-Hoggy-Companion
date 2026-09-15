import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidEntitlement } from "../config/paidTiers";

function isRescueEntitlement(entitlement: PaidEntitlement) {
  return entitlement.startsWith("rescue_") || entitlement === "species_incubator";
}

function isRescueInvitationRoute(entitlement: PaidEntitlement) {
  return isRescueEntitlement(entitlement) && window.location.pathname === "/rescue/team" && new URLSearchParams(window.location.search).has("invite");
}

function activeRescueWorkspace(workspace: { organisation: { accountStatus?: string; pilotStatus?: string; pilotEndsAt?: string } | null }) {
  const org = workspace.organisation;
  if (!org) return false;
  if (org.accountStatus === "paid_active") return true;
  if (org.pilotStatus !== "pilot_active") return false;
  const end = org.pilotEndsAt ? new Date(org.pilotEndsAt).getTime() : 0;
  return Number.isFinite(end) && end > Date.now();
}

function RescueAccessFallback() {
  return <main className="rescue-page rescue-access-page">
    <header className="rescue-hero rescue-access-hero">
      <div>
        <span className="rescue-eyebrow">TINY TITANS · RESCUE OPERATIONS</span>
        <h1>🐍🦎 Rescue Centre</h1>
        <p>A separate operational workspace for rescue organisations — not another version of the personal keeper dashboard.</p>
      </div>
      <span className="rescue-role-badge">ACCESS CONTROL</span>
    </header>
    <section className="rescue-card rescue-access-card">
      <span className="rescue-eyebrow">RESCUE WORKSPACE ACCESS</span>
      <h2>Your Rescue workspace is not active on this account</h2>
      <p>Rescue access is organisation-based. The organisation pays for the workspace, while invited staff, veterinary users, fosters and volunteers keep their own TinyTitans accounts.</p>
      <div className="rescue-access-grid">
        <div><strong>🏠 Organisation workspace</strong><span>Animal register, passports, intake and operational records live here.</span></div>
        <div><strong>👥 Team access</strong><span>Roles are assigned by the rescue. Staff do not need individual Rescue subscriptions.</span></div>
        <div><strong>🩺 Care &amp; medical</strong><span>Private operational history stays behind the Rescue access boundary.</span></div>
        <div><strong>🏷️ QR identity</strong><span>Animal labels identify records without carrying permissions or private data.</span></div>
      </div>
      <div className="rescue-inline-actions">
        <Link className="rescue-primary-link" to="/plans">View TinyTitans Rescue</Link>
        <Link className="rescue-secondary-link" to="/account/billing">Check billing &amp; access</Link>
      </div>
      <div className="rescue-preview-note"><strong>Already invited by a rescue?</strong><span>Open the invitation link from the rescue and accept it using the invited email address. Your personal TinyTitans account remains yours.</span></div>
    </section>
  </main>;
}

export default function PaidTierGate({ entitlement, children, fallback }: { entitlement: PaidEntitlement; children: ReactNode; fallback?: ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [rescueWorkspace, setRescueWorkspace] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAccess(null);
      setRescueWorkspace(false);
      setChecking(false);
      return () => { active = false; };
    }
    setChecking(true);
    void Promise.all([
      getPaidAccess(user.uid),
      isRescueEntitlement(entitlement) ? getMyRescueWorkspace() : Promise.resolve({ organisation: null, role: null }),
    ]).then(([nextAccess, workspace]) => {
      if (!active) return;
      setAccess(nextAccess);
      setRescueWorkspace(activeRescueWorkspace(workspace));
    }).catch(() => {
      if (active) {
        setAccess(null);
        setRescueWorkspace(false);
      }
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [entitlement, user]);

  if (loading || profileLoading || checking) return <div aria-live="polite">Checking Tiny Titans access…</div>;
  const paidAllowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  const allowed = paidAllowed || rescueWorkspace || isRescueInvitationRoute(entitlement);
  const requiredTier = PAID_TIER_ORDER.find((tierId) => tierId !== "free" && getPaidTierDefinition(tierId).entitlements.includes(entitlement)) ?? "titan_pro";

  if (!allowed) {
    if (isRescueEntitlement(entitlement) && !fallback) return <RescueAccessFallback />;
    return <>{fallback ?? <section aria-label="Paid feature"><strong>🔒 {isRescueEntitlement(entitlement) ? "TinyTitans Rescue" : entitlement.replace(/[-_]/g, " ")} requires {getPaidTierDefinition(requiredTier).name} or an active Rescue workspace.</strong><p>Rescue access belongs to the organisation workspace, so invited staff can use their own TinyTitans login without buying a separate Rescue subscription.</p><div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}><Link to="/plans">Compare plans</Link><Link to="/account/billing">Billing &amp; access</Link></div></section>}</>;
  }

  return <>{children}</>;
}
