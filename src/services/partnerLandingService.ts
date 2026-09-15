import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { PartnerLandingProfile, PartnerLandingKind, PartnerOpeningHours } from "../types/partnerLanding";

const PARTNER_COLLECTION = "partnerLandings";

export const DEFAULT_OPENING_HOURS: PartnerOpeningHours = {
  monday: "09:00–17:00",
  tuesday: "09:00–17:00",
  wednesday: "09:00–17:00",
  thursday: "09:00–17:00",
  friday: "09:00–17:00",
  saturday: "10:00–16:00",
  sunday: "Closed",
};

export function normalisePartnerSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createDefaultPartnerLanding(params: {
  ownerUid: string;
  kind: PartnerLandingKind;
  brandName: string;
  organisationId?: string;
}): PartnerLandingProfile {
  const brandName = params.brandName.trim() || (params.kind === "rescue" ? "Your Rescue Centre" : "Your Reptile Business");
  return {
    id: params.ownerUid,
    ownerUid: params.ownerUid,
    organisationId: params.organisationId,
    kind: params.kind,
    slug: normalisePartnerSlug(brandName) || `partner-${params.ownerUid.slice(0, 8)}`,
    publicEnabled: false,
    brandName,
    tagline: params.kind === "rescue" ? "Rescue, rehabilitation and responsible rehoming." : "Reptiles, husbandry and trusted customer care.",
    description: "Tell customers what makes your organisation different, what you offer and how they can contact you.",
    accentColor: "#62d6c7",
    openingHours: DEFAULT_OPENING_HOURS,
    businessDetails: {},
    contact: {},
    social: {},
    primaryCtaLabel: params.kind === "rescue" ? "Contact the rescue" : "Contact us",
    primaryCtaUrl: "mailto:",
    secondaryCtaLabel: "Visit our website",
    secondaryCtaUrl: "",
    showTinyTitansBadge: true,
  };
}

function hydrate(id: string, data: Record<string, unknown>): PartnerLandingProfile {
  return {
    ...data,
    id,
    ownerUid: String(data.ownerUid || ""),
    kind: data.kind === "rescue" ? "rescue" : "business",
    slug: normalisePartnerSlug(String(data.slug || id)),
    publicEnabled: data.publicEnabled === true,
    brandName: String(data.brandName || "TinyTitans Partner"),
    tagline: String(data.tagline || ""),
    description: String(data.description || ""),
    accentColor: String(data.accentColor || "#62d6c7"),
    openingHours: { ...DEFAULT_OPENING_HOURS, ...(data.openingHours as Partial<PartnerOpeningHours> | undefined) },
    businessDetails: (data.businessDetails as PartnerLandingProfile["businessDetails"] | undefined) || {},
    contact: (data.contact as PartnerLandingProfile["contact"] | undefined) || {},
    social: (data.social as PartnerLandingProfile["social"] | undefined) || {},
    primaryCtaLabel: String(data.primaryCtaLabel || "Contact us"),
    primaryCtaUrl: String(data.primaryCtaUrl || ""),
    secondaryCtaLabel: String(data.secondaryCtaLabel || ""),
    secondaryCtaUrl: String(data.secondaryCtaUrl || ""),
    showTinyTitansBadge: data.showTinyTitansBadge !== false,
    organisationId: typeof data.organisationId === "string" ? data.organisationId : undefined,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
    heroImageUrl: typeof data.heroImageUrl === "string" ? data.heroImageUrl : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getPartnerLandingByOwner(ownerUid: string): Promise<PartnerLandingProfile | null> {
  if (!ownerUid) return null;
  const snapshot = await getDoc(doc(db, PARTNER_COLLECTION, ownerUid));
  return snapshot.exists() ? hydrate(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export async function getPublicPartnerLandingBySlug(slug: string): Promise<PartnerLandingProfile | null> {
  const cleanSlug = normalisePartnerSlug(slug);
  if (!cleanSlug) return null;
  const snapshot = await getDocs(query(collection(db, PARTNER_COLLECTION), where("slug", "==", cleanSlug), where("publicEnabled", "==", true), limit(1)));
  const first = snapshot.docs[0];
  return first ? hydrate(first.id, first.data() as Record<string, unknown>) : null;
}

export async function savePartnerLanding(profile: PartnerLandingProfile): Promise<PartnerLandingProfile> {
  const slug = normalisePartnerSlug(profile.slug);
  if (!slug) throw new Error("Choose a public profile URL slug.");
  if (!profile.brandName.trim()) throw new Error("A business or rescue name is required.");
  const next: PartnerLandingProfile = {
    ...profile,
    id: profile.ownerUid,
    slug,
    brandName: profile.brandName.trim(),
    updatedAt: new Date().toISOString(),
    createdAt: profile.createdAt || new Date().toISOString(),
  };
  await setDoc(doc(db, PARTNER_COLLECTION, profile.ownerUid), next, { merge: true });
  return next;
}
