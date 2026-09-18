import type { PaidEntitlement } from "./paidTiers";

export const PAID_ENTITLEMENT_LABELS: Record<Exclude<PaidEntitlement, "core_tracking" | "core_genetics" | "core_learning" | "core_community">, string> = {
  smart_reminders: "Advanced reminder intelligence",
  advanced_timeline: "Advanced animal timeline",
  advanced_analytics: "Advanced analytics",
  titan_intelligence: "Titan Intelligence",
  breeding_suite: "Advanced breeding suite",
  morph_intelligence: "Morph intelligence & evidence",
  data_export: "Data export",
  marketplace_seller: "Marketplace seller tools",
  seller_profile: "Professional seller profile",
  business_reporting: "Business reporting",
  multi_user: "Multi-user workspace",
  team_permissions: "Team permissions",
  automation: "Workflow automation",
  api_access: "API access",
  priority_support: "Priority support",
  custom_branding: "Custom branding",
  rescue_workspace: "Rescue workspace",
  rescue_qr_passports: "QR animal passports",
  species_incubator: "Species discovery / incubator",
  rescue_team: "Rescue team management",
  rescue_medical_records: "Rescue medical records",
  rescue_reporting: "Rescue reporting",
  rescue_adoption: "Rescue adoption workflows",
};

export function paidEntitlementLabel(entitlement: PaidEntitlement): string {
  if (entitlement in PAID_ENTITLEMENT_LABELS) {
    return PAID_ENTITLEMENT_LABELS[entitlement as keyof typeof PAID_ENTITLEMENT_LABELS];
  }
  return entitlement.replaceAll("_", " ");
}