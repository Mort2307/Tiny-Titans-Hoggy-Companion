import { Link } from "react-router-dom";
import { PAID_TIER_CATALOG, PAID_TIER_ORDER, type PaidEntitlement } from "../config/paidTiers";
import { PAID_ENTITLEMENT_DESTINATIONS, paidEntitlementLabel } from "../config/paidEntitlementCatalog";
import { getFreeKeeperNavigationItems } from "../config/freeExperience";
import PaidTierBadge from "./PaidTierBadge";

type FeatureEnhancement = {
  entitlement: PaidEntitlement;
  label: string;
};

const FREE_FEATURE_ENHANCEMENTS: Record<string, FeatureEnhancement[]> = {
  reminders: [{ entitlement: label: "Advanced reminder intelligence" }],
  intelligence: [{ entitlement: "titan_intelligence", label: "Titan Intelligence" }],
  breeding: [{ entitlement: "breeding_suite", label: "Advanced breeding suite" }],
  morphs: [{ entitlement: "morph_intelligence", label: "Morph intelligence & evidence" }],
  marketplace: [{ entitlement: "marketplace_seller", label: "Marketplace seller tools" }, { entitlement: "seller_profile", label: "Professional seller profile" }],
};

const PAID_ONLY_ENTITLEMENTS: readonly Exclude<PaidEntitlement, "core_tracking" | "core_genetics" | "core_learning" | "core_community">[] = [
  "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence",
  "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller",
  "seller_profile", "business_reporting", "multi_user", "team_permissions",
  "automation", "api_access", "priority_support", "custom_branding", "rescue_workspace",
  "rescue_qr_passports", "species_incubator", "rescue_team", "rescue_medical_records",
  "rescue_reporting", "rescue_adoption",
];

function included(tierId: typeof PAID_TIER_ORDER[number], entitlement: PaidEntitlement) {
  return PAID_TIER_CATALOG[tierId].entitlements.includes(entitlement);
}

export default function PaidTierComparisonMatrix() {
  const freeFeatures = getFreeKeeperNavigationItems();
  return (
    <section className="paid-tier-comparison" aria-labelledby="paid-tier-comparison-title">
      <div className="paid-tier-comparison__heading">
        <div>
          <span className="paid-kicker">COMPLETE FEATURE CHECK</span>
          <h2 id="paid-tier-comparison-title">Free feature-by-feature + every paid tier</h2>
          <p>Every row in the Free section is a personal-keeper feature. Every paid tier must retain it. “Enhanced” means the tier also has a separate paid capability connected to that area.</p>
        </div>
        <span className="paid-tier-comparison__count">{freeFeatures.length} Free features tracked</span>
      </div>
      <div className="paid-tier-comparison__scroll">
        <table>
          <thead><tr><th scope="col">Free feature</th>{PAID_TIER_ORDER.map((tierId) => <th scope="col" key={tierId}><PaidTierBadge tierId={tierId} size="sm" /><span>{PAID_TIER_CATALOG[tierId].shortLabel}</span></th>)}</tr></thead>
          <tbody>
            {freeFeatures.map((feature) => {
              const enhancements = FREE_FEATURE_ENHANCEMENTS[feature.id] ?? [];
              return <tr key={feature.id}>
                <th scope="row"><strong>{feature.label}</strong><small><Link to={feature.path}>{feature.path} →</Link></small></th>
                {PAID_TIER_ORDER.map((tierId) => {
                  const activeEnhancements = enhancements.filter((enhancement) => included(tierId, enhancement.entitlement));
                  return <td key={tierId}><span className={activeEnhancements.length ? "paid-tier-enhanced" : "paid-tier-check"} aria-label={activeEnhancements.length ? `${PAID_TIER_CATALOG[tierId].name} includes and enhances ${feature.label}` : `${PAID_TIER_CATALOG[tierId].name} includes ${feature.label}`}>{activeEnhancements.length ? "⚡ Enhanced" : "✓ Included"}</span></td>;
                })}
              </tr>;
            })}
            <tr className="paid-tier-comparison__separator"><th scope="row" colSpan={PAID_TIER_ORDER.length + 1}><span>PAID-ONLY / WORKSPACE CAPABILITIES</span></th></tr>
            {PAID_ONLY_ENTITLEMENTS.map((entitlement) => <tr key={entitlement}>
              <th scope="row"><strong>{paidEntitlementLabel(entitlement)}</strong><small>{PAID_ENTITLEMENT_DESTINATIONS[entitlement].path ? <Link to={PAID_ENTITLEMENT_DESTINATIONS[entitlement].path}>{PAID_ENTITLEMENT_DESTINATIONS[entitlement].label} →</Link> : PAID_ENTITLEMENT_DESTINATIONS[entitlement].label}</small></th>
              {PAID_TIER_ORDER.map((tierId) => { const has = included(tierId, entitlement); return <td key={tierId}><span className={has ? "paid-tier-check" : "paid-tier-dash"}>{has ? "✓ Included" : "—"}</span></td>; })}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}