import type { PaidEntitlement } from "./paidTiers";

export type PaidEntitlementDestination = { label: string; path?: string };

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

const destinations: Record<Exclude<PaidEntitlement, "core_tracking" | "core_genetics" | "core_learning" | "core_community">, PaidEntitlementDestination> = {
  smart_reminders: { label: "Reminder Hub (baseline; no separate paid-only surface yet)", path: "/reminders" },
  advanced_timeline: { label: "Advanced Timeline", path: "/paid/timeline" },
  advanced_analytics: { label: "Advanced Analytics", path: "/paid/analytics" },
  titan_intelligence: { label: "Titan Intelligence", path: "/titan-intelligence" },
  breeding_suite: { label: "Breeding Readiness / Timeline / Cycle / Production" , path: "/breeding/readiness" },
  morph_intelligence: { label: "Morph Evidence Audit", path: "/morph-library/evidence" },
  data_export: { label: "Data Export", path: "/paid/export" },
  marketplace_seller: { label: "Marketplace Seller Tools", path: "/paid/marketplace" },
  seller_profile: { label: "Seller Profile", path: "/paid/seller" },
  business_reporting: { label: "Business Reporting", path: "/paid/business" },
  multi_user: { label: "Team Workspace", path: "/paid/team" },
  team_permissions: { label: "Team & Permissions", path: "/paid/team" },
  automation: { label: "Workflow Automation", path: "/paid/automation" },
  api_access: { label: "API Access", path: "/paid/api" },
  priority_support: { label: "Priority Support", path: "/paid/support" },
  custom_branding: { label: "Custom Branding", path: "/paid/branding" },
  rescue_workspace: { label: "Rescue Centre", path: "/rescue" },
  rescue_qr_passports: { label: "Rescue QR / Animal Passports", path: "/rescue/qr" },
  species_incubator: { label: "Species Incubator", path: "/rescue/species-incubator" },
  rescue_team: { label: "Rescue Team & Permissions", path: "/rescue/team" },
  rescue_medical_records: { label: "Rescue Medical & Vet", path: "/rescue/reports" },
  rescue_reporting: { label: "Rescue Reports", path: "/rescue/reports" },
  rescue_adoption: { label: "Foster & Adoption", path: "/rescue/adoption" },
};

export const PAID_ENTITLEMENT_DESTINATIONS = destinations;
export function paidEntitlementLabel(entitlement: PaidEntitlement): string {
  if (entitlement in PAID_ENTITLEMENT_LABELS) {
    return PAID_ENTITLEMENT_LABELS[entitlement as keyof typeof PAID_ENTITLEMENT_LABELS];
  }
  return entitlement.replaceAll("_", " ");
}