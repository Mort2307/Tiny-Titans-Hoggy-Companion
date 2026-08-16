import { getAuth } from "firebase/auth";
import app from "../firebase/config";

export type CreatorClaims = {
  creator?: boolean;
  admin?: boolean;
  moderator?: boolean;
};

/**
 * Reads the current user's Firebase ID-token claims.
 * This is deliberately separate from the user profile document so Creator
 * authorization can be backed by Firebase Auth custom claims rather than UI state.
 */
export async function getCreatorClaims(forceRefresh = false): Promise<CreatorClaims> {
  const user = getAuth(app).currentUser;
  if (!user) return {};
  const token = await user.getIdTokenResult(forceRefresh);
  return {
    creator: token.claims.creator === true,
    admin: token.claims.admin === true,
    moderator: token.claims.moderator === true,
  };
}

export async function hasCreatorClaim(forceRefresh = false): Promise<boolean> {
  const claims = await getCreatorClaims(forceRefresh);
  return claims.creator === true || claims.admin === true;
}
