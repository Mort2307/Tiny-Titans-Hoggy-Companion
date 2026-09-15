import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidEntitlement, type PaidTierId } from "../config/paidTiers";
import PaidTierBadge from "./PaidTierBadge";
import "../styles/PaidPlans.css";

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

function TierAccessFallback({ tierId, access, entitlement }: { tierId: PaidTierId; access: PaidAccess | null; entitlement: PaidEntitlement }) {
  const tier = getPaidTierDefinition(tierId);
  const isRescue = tierId === "rescue";
  const heading = isRescue ? "TinyTitans Rescue access is not active" : `${tier.name} access is not active`;
  const description = isRescue
    ? "Rescue is a dedicated organisation workspace. The organisation owns the workspace while its invited staff, veterinary users, fosters and volunteers keep their own TinyTitans accounts."
    : `${tier.name} unlocks this capability for the account. Your Free account remains intact; upgrading adds the tier's capabilities without removing the core Tiny Titans experience.`;
  const currentLabel = access?.source === "tester" ? `Creator tester override: ${getPaidTierDefinition(access.effectiveTier).name}` : access?.source === "trial" ? `Creator trial: ${getPaidTierDefinition(access.effectiveTier).name}` : `Current access: ${getPaidTierDefinition(access?.effectiveTier ?? "free").name}`;

  return <main className="paid-access-page">
    <section className={`paid-access-hero paid-access-hero--${tierId}`}>
      <div>
        <span className="paid-kicker">TINY TITANS · TIER ACCESS</span>
        <div className="paid-access-identity"><PaidTierBadge tierId={tier.id} size="md" /><div><span className="paid-tier-prestige">{tier.eyebrow}</span><h1>{heading}</h1></div></div>
        <p>{description}</p>
      </div>
      <div className="paid-access-status"><strong>{tier.priceLabel}</strong><span>{currentLabel}</span></div>
    </section>

    <section className="paid-access-card">
      <div className="paid-access-card-heading"><div><span className="paid-kicker">THIS CAPABILITY</span><h2>{entitlement.replace(/[-_]/g, " ")}</h2><p>{tier.audience}</p></div><PaidTierBadge tierId={tier.id} size="sm" /></div>
      <div className="paid-access-highlight-grid">{tier.highlights.map((item) => <div key={item}><span>✓</span><strong>{item}</strong></div>)}</div>
      <div className="paid-access-capabilities"><span className="paid-kicker">FULL {tier.name.toUpperCase()} CAPABILITY SET</span><div>{tier.entitlements.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div></div>
      {tier.note && <div className="paid-access-note"><strong>Tier information</strong><span>{tier.note}</span></div>}
      {access?.source === "tester" && access.testerOverride && <div className="paid-access-note"><strong>🧪 Creator tester access</strong><span>{tier.name} is being tested without changing billing. The account's real commercial tier remains {getPaidTierDefinition(access.actualTier).name}.</span></div>}
      <div className="paid-access-actions">
        <Link className="paid-primary" to="/plans">View {tier.name} →</Link>
        <Link to="/account/billing">Billing &amp; access</Link>
      </div>
      {isRescue && <div className="paid-access-note"><strong>Already invited by a Rescue organisation?</strong><span>Use the invitation link sent to your invited email address. Accepting the invitation grants the organisation role while keeping your personal TinyTitans account separate.</span></div>}
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
  const rescueEntitlement = isRescueEntitlement(entitlement);
  const paidAllowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  const allowed = paidAllowed || (rescueEntitlement && (rescueWorkspace || isRescueInvitationRoute(entitlement)));
  const requiredTier = PAID_TIER_ORDER.find((tierId) => tierId !== "free" && getPaidTierDefinition(tierId).entitlements.includes(entitlement)) ?? "titan_pro";

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return <TierAccessFallback tierId={requiredTier} access={access} entitlement={entitlement} />;
  }

  return <>{children}</>;
}
