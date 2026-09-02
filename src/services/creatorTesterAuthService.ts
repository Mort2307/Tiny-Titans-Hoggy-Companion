import { getIdTokenResult } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase/config";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === OWNER_EMAIL;
}

/** Creator/Tester access is restricted to the Tiny Titans owner account. */
export async function hasCreatorTesterClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isOwnerEmail(currentUser.email)) return false;

  try {
    let tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    let claims = tokenResult.claims as Record<string, unknown>;
    if (claims.creatorTester === true || claims.tester === true || claims.creator === true || claims.admin === true) return true;

    const functions = getFunctions(undefined, "europe-west2");
    const ensureCreatorClaim = httpsCallable<void, { success: boolean; creator?: boolean; admin?: boolean; tester?: boolean; creatorTester?: boolean; refreshRequired?: boolean }>(functions, "ensureCreatorClaim");
    await ensureCreatorClaim();

    tokenResult = await getIdTokenResult(currentUser, true);
    claims = tokenResult.claims as Record<string, unknown>;
    return claims.creatorTester === true || claims.tester === true || claims.creator === true || claims.admin === true;
  } catch (error) {
    console.warn("Tiny Titans: unable to verify or synchronise owner Creator Tester authorization", error);
    return false;
  }
}
