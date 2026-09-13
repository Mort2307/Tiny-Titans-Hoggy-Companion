import { getIdTokenResult } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase/config";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === OWNER_EMAIL;
}

function hasTesterCapability(claims: Record<string, unknown>): boolean {
  return claims.creatorTester === true || claims.tester === true || claims.creator === true || claims.admin === true;
}

/**
 * Creator/Tester access is authenticated by Firebase custom claims.
 * The owner-email check is only used to bootstrap legacy accounts that do not
 * yet carry the canonical claims; it is not allowed to reject valid claims.
 */
export async function hasCreatorTesterClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    let tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    let claims = tokenResult.claims as Record<string, unknown>;

    // Server-issued claims are authoritative and must work regardless of the
    // email currently exposed by the Firebase client session.
    if (hasTesterCapability(claims)) return true;

    // Legacy owner bootstrap: ask the trusted backend to provision claims only
    // when this is the configured owner account and claims are genuinely absent.
    if (!isOwnerEmail(currentUser.email)) return false;

    const functions = getFunctions(undefined, "europe-west2");
    const ensureCreatorClaim = httpsCallable<void, {
      success: boolean;
      creator?: boolean;
      admin?: boolean;
      tester?: boolean;
      creatorTester?: boolean;
      refreshRequired?: boolean;
    }>(functions, "ensureCreatorClaim");
    await ensureCreatorClaim();

    tokenResult = await getIdTokenResult(currentUser, true);
    claims = tokenResult.claims as Record<string, unknown>;
    return hasTesterCapability(claims);
  } catch (error) {
    console.warn("Tiny Titans: unable to verify or synchronise owner Creator Tester authorization", error);
    return false;
  }
}
