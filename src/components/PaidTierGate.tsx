import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import TinyTitansAction from "./TinyTitansAction";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, type PaidAccess } from "../services/paidTierService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidEntitlement, type PaidTierId } from "../config/paidTiers";
import PaidTierBadge from "./PaidTierBadge";
import { paidEntitlementLabel } from "../config/paidEntitlementCatalog";
import RescueInvitation from "../pages/RescueInvitation";
import OrganisationStaffManager from "./staff/OrganisationStaffManager";
import "../styles/PaidPlans.css";
import "../styles/PaidTierGate.css";

const CREATOR_EMAIL = "tinytitans.exotics@gmail.com";
const RESCUE_ENTITLEMENTS = new Set<PaidEntitlement>([
  "advanced_timeline",
  "advanced_analytics",
  "titan_intelligence",
  "morph_intelligence",
  "data_export",
  "marketplace_seller",
  "seller_profile",
  "business_reporting",
  "multi_user",
  "team_permissions",
  "automation",
  "api_access",
  "priority_support",
  "custom_branding",
  "rescue_workspace",
  "rescue_qr_passports",
  "species_incubator",
  "rescue_team",
  "rescue_medical_records",
  "rescue_reporting",
  "rescue_adoption",
]);

function isRescueEntitlement(entitlement: PaidEntitlement) {
  return RESCUE_ENTITLEMENTS.has(entitlement);
}

function isRescueInvitationRoute(entitlement: PaidEntitlement) {
  return isRescueEntitlement(entitlement) && window.location.pathname === "/rescue/team" && new URLSearchParams(window.location.search).has("invite");
}

function isRescueTeamManagementRoute(entitlement: PaidEntitlement) {
  return isRescueEntitlement(entitlement) && window.location.pathname === "/rescue/team" && !new URLSearchParams(window.location.search).has("invite");
}

function activeRescueWorkspace(workspace: { organisation: { accountStatus?: string; pilotStatus?: string; pilotEndsAt?: string } | null }, access: PaidAccess | null) {
  if (access?.effectiveTier === "rescue") return true;
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
      <div className="paid-access-card-heading"><div><span className="paid-kicker">THIS CAPABILITY</span><h2>{paidEntitlementLabel(entitlement)}</h2><p>{tier.audience}</p></div><PaidTierBadge tierId={tier.id} size="sm" /></div>
      <div className="paid-access-highlight-grid">{tier.highlights.map((item) => <div key={item}><span><TinyTitansIcon name="check" size={16} /></span><strong>{item}</strong></div>)}</div>
      <div className="paid-access-capabilities"><span className="paid-kicker">FULL {tier.name.toUpperCase()} CAPABILITY SET</span><div>{tier.entitlements.filter((item) => !item.startsWith("core_")).map((item) => <span key={item}>{paidEntitlementLabel(item)}</span>)}</div></div>
      {tier.note && <div className="paid-access-note"><strong>Tier information</strong><span>{tier.note}</span></div>}
      {access?.source === "tester" && access.testerOverride && <div className="paid-access-note"><strong><TinyTitansIcon name="testing" size={16} /> Creator tester access</strong><span>{tier.name} is being tested without changing billing. The account's real commercial tier remains {getPaidTierDefinition(access.actualTier).name}.</span></div>}
      <div className="paid-access-actions">
        <TinyTitansAction className="paid-primary" variant="primary" endIcon="forward" to={`/plans?tier=${tier.id}`} label={`Compare ${tier.name}`} />
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
  const isCreator = user?.email?.trim().toLowerCase() === CREATOR_EMAIL;
  const rescueEntitlement = isRescueEntitlement(entitlement);
  const invitationRoute = isRescueInvitationRoute(entitlement);
  const rescueTeamManagementRoute = isRescueTeamManagementRoute(entitlement);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAccess(null);
      setRescueWorkspace(false);
      setChecking(false);
      return () => { active = false; };
    }
    if (isCreator) {
      setChecking(false);
      setRescueWorkspace(true);
      return () => { active = false; };
    }
    setChecking(true);
    void Promise.all([
      getPaidAccess(user.uid),
      rescueEntitlement ? getMyRescueWorkspace() : Promise.resolve({ organisation: null, role: null }),
    ]).then(([nextAccess, workspace]) => {
      if (!active) return;
      setAccess(nextAccess);
      setRescueWorkspace(activeRescueWorkspace(workspace, nextAccess));
    }).catch(() => {
      if (active) {
        setAccess(null);
        setRescueWorkspace(false);
      }
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [entitlement, isCreator, rescueEntitlement, user]);

  if (loading || profileLoading || checking) return <div aria-live="polite">Checking Tiny Titans access…</div>;
  if (invitationRoute) return <RescueInvitation />;
  if (rescueTeamManagementRoute) return <OrganisationStaffManager mode="rescue" />;
  if (isCreator) return <>{children}</>;

  const paidAllowed = Boolean(access && getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement));
  const allowed = paidAllowed || (rescueEntitlement && rescueWorkspace);
  const requiredTier = PAID_TIER_ORDER.find((tierId) => tierId !== "free" && getPaidTierDefinition(tierId).entitlements.includes(entitlement)) ?? "titan_pro";

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return <TierAccessFallback tierId={requiredTier} access={access} entitlement={entitlement} />;
  }

  return <>{children}</>;
}
