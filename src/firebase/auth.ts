import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();

/* =========================================================
   REGISTER WITH EMAIL
   ========================================================= */

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    if (displayName.trim()) {
      await updateProfile(
        credential.user,
        {
          displayName:
            displayName.trim(),
        }
      );
    }

    console.log(
      "Tiny Titans: REGISTRATION SUCCESSFUL",
      credential.user.uid
    );

    return credential.user;

  } catch (error) {

    console.error(
      "Tiny Titans: REGISTRATION FAILED",
      error
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      console.error(
        "Tiny Titans: Firebase error code:",
        (error as { code: string }).code
      );
    }

    if (error instanceof Error) {
      console.error(
        "Tiny Titans: Firebase error message:",
        error.message
      );
    }

    throw error;
  }
}

/* =========================================================
   LOGIN WITH EMAIL
   ========================================================= */

export async function loginWithEmail(
  email: string,
  password: string
): Promise<User> {

  try {

    console.log(
      "Tiny Titans: attempting email login:",
      email.trim()
    );

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    console.log(
      "Tiny Titans: EMAIL LOGIN SUCCESSFUL",
      credential.user.uid
    );

    return credential.user;

  } catch (error) {

    console.error(
      "========================================"
    );

    console.error(
      "Tiny Titans: EMAIL LOGIN FAILED"
    );

    console.error(
      "========================================"
    );

    console.error(
      "Raw Firebase error:",
      error
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      console.error(
        "Tiny Titans: Firebase error code:",
        (error as { code: string }).code
      );
    }

    if (error instanceof Error) {
      console.error(
        "Tiny Titans: Firebase error message:",
        error.message
      );
    }

    throw error;
  }
}

/* =========================================================
   LOGIN WITH GOOGLE
   ========================================================= */

export async function loginWithGoogle(): Promise<User> {

  try {

    const credential =
      await signInWithPopup(
        auth,
        googleProvider
      );

    console.log(
      "Tiny Titans: GOOGLE LOGIN SUCCESSFUL",
      credential.user.uid
    );

    return credential.user;

  } catch (error) {

    console.error(
      "Tiny Titans: GOOGLE LOGIN FAILED",
      error
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      console.error(
        "Tiny Titans: Firebase error code:",
        (error as { code: string }).code
      );
    }

    throw error;
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

export async function logout(): Promise<void> {

  await signOut(auth);

  console.log(
    "Tiny Titans: LOGGED OUT"
  );
}