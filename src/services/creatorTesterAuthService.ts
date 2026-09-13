import { auth } from "../firebase/config";

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function isOwnerEmail(email: unknown): boolean {
  return String(email || "").trim().toLowerCase() === OWNER_EMAIL;
}

/** Creator/Tester tooling is private to the configured owner account. */
export async function hasCreatorTesterClaim(_forceRefresh = false): Promise<boolean> {
  const currentUser = auth.currentUser;
  return Boolean(currentUser && isOwnerEmail(currentUser.email));
}
