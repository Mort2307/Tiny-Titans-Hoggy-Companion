import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

/**
 * Creator authorization is deliberately based on Firebase Auth custom claims.
 * UI/profile fields are not sufficient to unlock Creator-only functionality.
 * Creator Tester access is separate from full Creator/Admin access but is
 * explicitly allowed for the private Tester Centre.
 */
export async function hasCreatorClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;
    return claims.creator === true || claims.admin === true || claims.creatorTester === true;
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
