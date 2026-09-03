import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

export type Capability =
  | "creator"
  | "tester"
  | "educator"
  | "moderator"
  | "admin";

export type CapabilityProfile = {
  role?: string | null;
  profileType?: string | null;
  isTester?: boolean | null;
};

// Tiny Titans Creator/Tester access is intentionally owner-only.
// Never use a mutable Firestore profile field as proof of privileged access.
export const TINY_TITANS_OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === TINY_TITANS_OWNER_EMAIL;
}

/**
 * Shared capability resolution layer.
 *
 * Creator and Tester capabilities are restricted to the Tiny Titans owner
 * account. Other capabilities continue to use server-issued custom claims.
 */
export async function getCapabilities(
  _profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<Set<Capability>> {
  const capabilities = new Set<Capability>();
  const currentUser = auth.currentUser;
  if (!currentUser) return capabilities;

  // Creator/Tester access is explicitly tied to the authenticated Tiny Titans
  // owner account. This keeps the private QA tools reachable even when a
  // previously-issued ID token has not yet picked up the corresponding claims.
  const ownerByAuthEmail = isOwnerEmail(currentUser.email);
  if (ownerByAuthEmail) {
    capabilities.add("creator");
    capabilities.add("tester");
  }

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;
    const owner = ownerByAuthEmail || isOwnerEmail(claims.email);

    if (owner && claims.admin === true) {
      capabilities.add("admin");
      capabilities.add("creator");
      capabilities.add("tester");
      capabilities.add("educator");
      capabilities.add("moderator");
    }
    if (owner && claims.creator === true) capabilities.add("creator");
    if (owner && claims.tester === true) capabilities.add("tester");
    if (claims.educator === true) capabilities.add("educator");
    if (claims.moderator === true) capabilities.add("moderator");
  } catch (error) {
    console.warn("Tiny Titans: capability claim lookup failed", error);
  }

  return capabilities;
}

export async function hasCapability(
  capability: Capability,
  profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<boolean> {
  return (await getCapabilities(profile, forceRefresh)).has(capability);
}

export async function requireCapability(
  capability: Capability,
  profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<void> {
  if (!(await hasCapability(capability, profile, forceRefresh))) {
    throw new Error(`${capability} capability is required for this operation.`);
  }
}
