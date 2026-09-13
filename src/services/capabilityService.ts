import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

export type Capability = "creator" | "tester" | "educator" | "moderator" | "admin";

export type CapabilityProfile = {
  role?: string | null;
  profileType?: string | null;
  isTester?: boolean | null;
};

// Creator/Tester tooling is intentionally private to the Tiny Titans owner.
export const TINY_TITANS_OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === TINY_TITANS_OWNER_EMAIL;
}

/** Creator/Tester capabilities are owner-scoped. */
export async function getCapabilities(
  _profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<Set<Capability>> {
  const capabilities = new Set<Capability>();
  const currentUser = auth.currentUser;
  if (!currentUser) return capabilities;

  const owner = isOwnerEmail(currentUser.email);

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;

    if (claims.admin === true) {
      capabilities.add("admin");
      capabilities.add("educator");
      capabilities.add("moderator");
      if (owner) {
        capabilities.add("creator");
        capabilities.add("tester");
      }
    }

    if (owner) {
      // Canonical claims are honoured for the owner account, while the
      // owner-only boundary prevents accidental exposure to other users.
      if (claims.creator === true || claims.creatorTester === true) capabilities.add("creator");
      if (claims.tester === true || claims.creatorTester === true) capabilities.add("tester");

      // Legacy owner bridge while claims are being migrated.
      capabilities.add("creator");
      capabilities.add("tester");
    }

    if (claims.educator === true) capabilities.add("educator");
    if (claims.moderator === true) capabilities.add("moderator");
  } catch (error) {
    console.warn("Tiny Titans: capability claim lookup failed", error);
    if (owner) {
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
