import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

/**
 * Full Creator/Admin authorization. Creator Tester access is intentionally
 * separate and must not unlock the private Creator Centre moderation routes.
 */
export async function hasCreatorClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;
    return claims.creator === true || claims.admin === true;
  } catch (error) {
    console.warn("Tiny Titans: unable to verify Creator authorization claim", error);
    return false;
  }
}

export async function requireCreatorClaim(forceRefresh = false): Promise<void> {
  if (!(await hasCreatorClaim(forceRefresh))) {
    throw new Error("Creator authorization is required for this operation.");
  }
}
