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

// The owner email is retained only as a compatibility fallback for accounts
// that have not yet received the canonical server-issued custom claims.
export const TINY_TITANS_OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === TINY_TITANS_OWNER_EMAIL;
}

/**
 * Shared capability resolution layer.
 *
 * Firebase custom claims are the authoritative client-side capability signal.
 * The owner-email fallback exists only to bridge legacy accounts while claims
 * are being migrated; it must never override or restrict valid server claims.
 */
export async function getCapabilities(
  _profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<Set<Capability>> {
  const capabilities = new Set<Capability>();
  const currentUser = auth.currentUser;
  if (!currentUser) return capabilities;

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;

    if (claims.admin === true) {
      capabilities.add("admin");
      capabilities.add("creator");
      capabilities.add("tester");
      capabilities.add("educator");
      capabilities.add("moderator");
    }
    if (claims.creator === true || claims.creatorTester === true) capabilities.add("creator");
    if (claims.tester === true || claims.creatorTester === true) capabilities.add("tester");
    if (claims.educator === true) capabilities.add("educator");
    if (claims.moderator === true) capabilities.add("moderator");

    // Legacy bridge: an authenticated owner without migrated claims retains
    // Creator/Tester access so the private tooling can bootstrap its claims.
    if (isOwnerEmail(currentUser.email)) {
      capabilities.add("creator");
      capabilities.add("tester");
    }
  } catch (error) {
    console.warn("Tiny Titans: capability claim lookup failed", error);

    // Preserve the legacy owner bootstrap path even if the token lookup fails.
    if (isOwnerEmail(currentUser.email)) {
      capabilities.add("creator");
      capabilities.add("tester");
    }
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
