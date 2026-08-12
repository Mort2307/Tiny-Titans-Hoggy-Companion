import { useState } from "react";

import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from "../firebase/auth";

import "../styles/Auth.css";

import logo from "../assets/TinyTitans-Logo.jpg";

/* =========================================
   LOGIN / REGISTER
========================================= */

function Login() {
  /* =======================================
     FORM MODE
  ======================================= */

  const [isRegistering, setIsRegistering] =
    useState(false);

  /* =======================================
     FORM STATE
  ======================================= */

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  /* =======================================
     UI STATE
  ======================================= */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================
     FIREBASE ERROR MESSAGES
  ======================================= */

  function getFirebaseError(
    firebaseError: unknown
  ): string {
    if (
      typeof firebaseError !== "object" ||
      firebaseError === null ||
      !("code" in firebaseError)
    ) {
      return "Something went wrong. Please try again.";
    }

    const code =
      (
        firebaseError as {
          code: string;
        }
      ).code;

    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/user-not-found":
        return "No Tiny Titans account was found with that email.";

      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "The email or password is incorrect.";

      case "auth/email-already-in-use":
        return "An account already exists with this email address.";

      case "auth/weak-password":
        return "Your password needs to be at least 6 characters.";

      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";

      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in window.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "auth/too-many-requests":
        return "Too many attempts were made. Please wait a moment and try again.";

      case "auth/user-disabled":
        return "This Tiny Titans account has been disabled.";

      default:
        return "Unable to complete that request. Please try again.";
    }
  }

  /* =========================================
     EMAIL LOGIN / REGISTRATION
  ========================================= */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /* =====================================
       VALIDATION
    ===================================== */

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    if (
      isRegistering &&
      !displayName.trim()
    ) {
      setError(
        "Please enter your name."
      );

      return;
    }

    /* =====================================
       START REQUEST
    ===================================== */

    setLoading(true);

    try {
      if (isRegistering) {
        await registerWithEmail(
          email.trim(),
          password,
          displayName.trim()
        );
      } else {
        await loginWithEmail(
          email.trim(),
          password
        );
      }

      /*
       * IMPORTANT:
       *
       * Do not navigate manually here.
       *
       * Firebase updates AuthContext.
       * AuthContext loads the Firestore profile.
       * AppRouter then decides whether the user
       * needs Account Setup or can enter the app.
       */

    } catch (firebaseError) {
      console.error(
        "Tiny Titans authentication error:",
        firebaseError
      );

      setError(
        getFirebaseError(
          firebaseError
        )
      );

      setLoading(false);
    }
  }

  /* =========================================
     GOOGLE LOGIN
  ========================================= */

  async function handleGoogleLogin() {
    setError("");

    setLoading(true);

    try {
      await loginWithGoogle();

      /*
       * Firebase/AuthContext/AppRouter handle
       * the transition from here.
       */

    } catch (firebaseError) {
      console.error(
        "Tiny Titans Google authentication error:",
        firebaseError
      );

      setError(
        getFirebaseError(
          firebaseError
        )
      );

      setLoading(false);
    }
  }

  /* =========================================
     SWITCH LOGIN / REGISTER
  ========================================= */

  function switchMode() {
    setIsRegistering(
      previous =>
        !previous
    );

    setError("");

    setPassword("");
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="auth-page">

      <div className="auth-background-glow" />

      <section className="auth-container">

        {/* ===================================
            BRAND
        =================================== */}

        <div className="auth-brand">

          <img
            src={logo}
            alt="Tiny Titans Hoggy Companion"
            className="auth-logo"
          />

          <h1>
            Tiny Titans
          </h1>

          <p className="auth-tagline">
            Hoggy Companion
          </p>

        </div>

        {/* ===================================
            AUTH CARD
        =================================== */}

        <div className="auth-card">

          <div className="auth-heading">

            <h2>
              {isRegistering
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p>
              {isRegistering
                ? "Let's get your Tiny Titans journey started."
                : "Sign in to continue your Tiny Titans journey."}
            </p>

          </div>

          {/* =================================
              ERROR
          ================================= */}

          {error && (
            <div
              className="auth-message auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* =================================
              FORM
          ================================= */}

          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* ===============================
                DISPLAY NAME
            =============================== */}

            {isRegistering && (
              <div className="auth-field">

                <label htmlFor="displayName">
                  Your Name
                </label>

                <input
                  id="displayName"
                  type="text"
                  value={
                    displayName
                  }
                  onChange={(
                    event
                  ) =>
                    setDisplayName(
                      event.target.value
                    )
                  }
                  placeholder="What should we call you?"
                  autoComplete="name"
                  disabled={
                    loading
                  }
                />

              </div>
            )}

            {/* ===============================
                EMAIL
            =============================== */}

            <div className="auth-field">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                disabled={
                  loading
                }
              />

            </div>

            {/* ===============================
                PASSWORD
            =============================== */}

            <div className="auth-field">

              <label htmlFor="password">
                Password
              </label>

              <div className="password-wrapper">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete={
                    isRegistering
                      ? "new-password"
                      : "current-password"
                  }
                  disabled={
                    loading
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      previous =>
                        !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={
                    loading
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>

            {/* ===============================
                SUBMIT
            =============================== */}

            <button
              type="submit"
              className="auth-primary-button"
              disabled={
                loading
              }
            >
              {loading
                ? "Please wait..."
                : isRegistering
                  ? "🐍 Create Account"
                  : "🔐 Sign In"}
            </button>

          </form>

          {/* =================================
              DIVIDER
          ================================= */}

          <div className="auth-divider">

            <span />

            <strong>
              OR
            </strong>

            <span />

          </div>

          {/* =================================
              GOOGLE
          ================================= */}

          <button
            type="button"
            className="auth-google-button"
            onClick={
              handleGoogleLogin
            }
            disabled={
              loading
            }
          >

            <span className="google-icon">
              G
            </span>

            Continue with Google

          </button>

          {/* =================================
              SWITCH MODE
          ================================= */}

          <div className="auth-switch">

            <span>
              {isRegistering
                ? "Already have a Tiny Titans account?"
                : "New to Tiny Titans?"}
            </span>

            <button
              type="button"
              onClick={
                switchMode
              }
              disabled={
                loading
              }
            >
              {isRegistering
                ? "Sign In"
                : "Create Account"}
            </button>

          </div>

        </div>

        {/* ===================================
            FOOTER
        =================================== */}

        <footer className="auth-footer">

          <strong>
            Tiny Titans Hoggy Companion
          </strong>

          <span>
            Learn • Track • Understand • Care
          </span>

          <small>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Tiny Titans
          </small>

        </footer>

      </section>

    </main>
  );
}

export default Login;