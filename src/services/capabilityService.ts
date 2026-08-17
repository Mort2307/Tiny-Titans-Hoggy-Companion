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

/**
 * Shared capability resolution layer.
 *
 * Custom claims are preferred because they are server-controlled. Existing
 * profile fields are retained as compatibility fallbacks while the account
 * model is consolidated. Firestore rules remain the authoritative security
 * boundary.
 */
export async function getCapabilities(
  profile?: CapabilityProfile | null,
  forceRefresh = false,
): Promise<Set<Capability>> {
  const capabilities = new Set<Capability>();
  const currentUser = auth.currentUser;

  if (currentUser) {
    try {
      const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
      const claims = tokenResult.claims as Record<string, unknown>;

      if (claims.admin === true) capabilities.add("admin");
      if (claims.creator === true) capabilities.add("creator");
      if (claims.tester === true) capabilities.add("tester");
      if (claims.educator === true) capabilities.add("educator");
      if (claims.moderator === true) capabilities.add("moderator");
    } catch (error) {
      console.warn("Tiny Titans: capability claim lookup failed", error);
    }
  }

  // Compatibility bridge. These fallbacks can be retired once all accounts
  // have been migrated to canonical claims/capabilities.
  if (profile?.role === "admin") {
    capabilities.add("admin");
    capabilities.add("creator");
  }
  if (profile?.profileType === "creator") capabilities.add("creator");
  if (profile?.role === "tester" || profile?.isTester === true) capabilities.add("tester");
  if (profile?.role === "educator") capabilities.add("educator");
  if (profile?.role === "moderator") capabilities.add("moderator");

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
