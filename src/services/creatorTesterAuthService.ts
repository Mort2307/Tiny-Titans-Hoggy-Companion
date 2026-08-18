import { getIdTokenResult } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase/config";

/**
 * Tester access is intentionally narrower than full Creator access.
 * Full Creator/Admin accounts can also use the Tester Centre.
 *
 * If a legitimate Creator profile has lost its custom claim, the diagnostic
 * path asks the trusted backend to restore the claim before checking again.
 * The backend only grants this to an already-authorised Creator/Admin profile.
 */
export async function hasCreatorTesterClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    let tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    let claims = tokenResult.claims as Record<string, unknown>;
    if (claims.creatorTester === true || claims.creator === true || claims.admin === true) return true;

    const functions = getFunctions(undefined, "europe-west2");
    const ensureCreatorClaim = httpsCallable<void, { success: boolean; creator?: boolean; admin?: boolean; creatorTester?: boolean; refreshRequired?: boolean }>(functions, "ensureCreatorClaim");
    await ensureCreatorClaim();

    tokenResult = await getIdTokenResult(currentUser, true);
    claims = tokenResult.claims as Record<string, unknown>;
    return claims.creatorTester === true || claims.creator === true || claims.admin === true;
  } catch (error) {
    console.warn("Tiny Titans: unable to verify or synchronise Creator Tester authorization claim", error);
    return false;
  }
}
