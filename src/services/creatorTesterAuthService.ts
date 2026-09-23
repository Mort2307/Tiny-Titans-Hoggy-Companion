import { getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase/config";

/** Creator/Tester tooling is private to accounts carrying the Firebase Creator authorization claim. */
export async function hasCreatorTesterClaim(forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  try {
    const token = await getIdTokenResult(currentUser, forceRefresh);
    return token.claims.creator === true && token.claims.tester === true && token.claims.admin === true;
  } catch {
    return false;
  }
}
