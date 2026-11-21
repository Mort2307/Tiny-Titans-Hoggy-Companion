import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = displayName.trim();
  if (name) await updateProfile(credential.user, { displayName: name });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/**
 * Google popup sign-in with redirect fallback when the browser blocks popups.
 * Redirect flow returns no user immediately; Firebase completes it on the next page load.
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    console.error("Tiny Titans: Google popup sign-in failed", { code, error });

    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
