import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

/**
 * Tester access is intentionally narrower than full Creator access.
 * Full Creator/Admin accounts can also use the Tester Centre.
 */
export async function hasCreatorTesterClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const claims = tokenResult.claims as Record<string, unknown>;
    return claims.creatorTester === true || claims.creator === true || claims.admin === true;
  } catch (error) {
    console.warn("Tiny Titans: unable to verify Creator Tester authorization claim", error);
    return false;
  }
}
