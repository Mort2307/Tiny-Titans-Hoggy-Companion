import { PAID_TIER_CATALOG, PAID_TIER_ORDER, type PaidEntitlement } from "../config/paidTiers";
import { PAID_ENTITLEMENT_DESTINATIONS, paidEntitlementLabel } from "../config/paidEntitlementCatalog";
import { getFreeKeeperNavigationItems } from "../config/freeExperience";
import PaidTierBadge from "./PaidTierBadge";
import { Link } from "react-router-dom";

const PAID_ONLY_ENTITLEMENTS: readonly Exclude<PaidEntitlement, "core_tracking" | "core_genetics" | "core_learning" | "core_community">[] = [
  "smart_reminders",
  "advanced_timeline",
  "advanced_analytics",
  "titan_intelligence",
  "breeding_suite",
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
];

export default function PaidTierComparisonMatrix() {
  const freeCount = getFreeKeeperNavigationItems().length;
  return (
    <section className="paid-tier-comparison" aria-labelledby="paid-tier-comparison-title">
      <div className="paid-tier-comparison__heading">
        <div>
          <span className="paid-kicker">COMPLETE FEATURE CHECK</span>
          <h2 id="paid-tier-comparison-title">Free baseline + every paid tier</h2>
          <p>
            The first row is the Free Keeper baseline. Every paid plan inherits it.
            The rows underneath are additional paid capabilities, so a missing check
            means that tier simply does not include that paid-only capability.
          </p>
        </div>
        <span className="paid-tier-comparison__count">{freeCount} Free features preserved</span>
      </div>

      <div className="paid-tier-comparison__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              {PAID_TIER_ORDER.map((tierId) => (
                <th scope="col" key={tierId}>
                  <PaidTierBadge tierId={tierId} size="sm" />
                  <span>{PAID_TIER_CATALOG[tierId].shortLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="paid-tier-comparison__baseline">
              <th scope="row">
                <strong>Full Free Keeper experience</strong>
                <small>All core navigation and personal keeper features.</small>
              </th>
              {PAID_TIER_ORDER.map((tierId) => (
                <td key={tierId}>
                  <span className="paid-tier-check" aria-label={`${PAID_TIER_CATALOG[tierId].name} includes the Free Keeper experience`}>✓</span>
                </td>
              ))}
            </tr>
            {PAID_ONLY_ENTITLEMENTS.map((entitlement) => (
              <tr key={entitlement}>
                <th scope="row">
                  <strong>{paidEntitlementLabel(entitlement)}</strong>
                  <small>{PAID_ENTITLEMENT_DESTINATIONS[entitlement].path ? <Link to={PAID_ENTITLEMENT_DESTINATIONS[entitlement].path}>{PAID_ENTITLEMENT_DESTINATIONS[entitlement].label} →</Link> : PAID_ENTITLEMENT_DESTINATIONS[entitlement].label}</small>
                </th>
                {PAID_TIER_ORDER.map((tierId) => {
                  const included = PAID_TIER_CATALOG[tierId].entitlements.includes(entitlement);
                  return (
                    <td key={tierId}>
                      <span
                        className={included ? "paid-tier-check" : "paid-tier-dash"}
                        aria-label={included
                          ? `${PAID_TIER_CATALOG[tierId].name} includes ${paidEntitlementLabel(entitlement)}`
                          : `${PAID_TIER_CATALOG[tierId].name} does not include ${paidEntitlementLabel(entitlement)}`}
                      >
                        {included ? "✓" : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}