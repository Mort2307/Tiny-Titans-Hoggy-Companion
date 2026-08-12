import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  useAuth,
  type UserCategory,
  type ExperienceLevel,
} from "../context/AuthContext";

import app from "../firebase/config";

import "../styles/AccountSetup.css";

import logo from "../assets/TinyTitans-Logo.jpg";

/* =========================================
   FIRESTORE
========================================= */

const db =
  getFirestore(app);

/* =========================================
   INTEREST TYPE
========================================= */

type Interest =
  | "keeper"
  | "breeder"
  | "breeder-seller"
  | "learner";

/* =========================================
   ACCOUNT SETUP
========================================= */

function AccountSetup() {
  const navigate =
    useNavigate();

  const {
    user,
    refreshProfile,
  } = useAuth();

  /* =======================================
     FORM STATE
  ======================================= */

  const [displayName, setDisplayName] =
    useState(
      user?.displayName ?? ""
    );

  const [category, setCategory] =
    useState<UserCategory | "">(
      ""
    );

  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | "">(
      ""
    );

  const [interests, setInterests] =
    useState<Interest[]>([]);

  /* =======================================
     UI STATE
  ======================================= */

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================
     TOGGLE INTEREST
  ======================================= */

  function toggleInterest(
    interest: Interest
  ) {
    setInterests(
      current => {
        if (
          current.includes(
            interest
          )
        ) {
          return current.filter(
            item =>
              item !== interest
          );
        }

        return [
          ...current,
          interest,
        ];
      }
    );
  }

  /* =======================================
     SUBMIT
  ======================================= */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /* =====================================
       AUTH CHECK
    ===================================== */

    if (!user) {
      setError(
        "We couldn't find your Tiny Titans account."
      );

      return;
    }

    /* =====================================
       VALIDATION
    ===================================== */

    if (!displayName.trim()) {
      setError(
        "Please enter your name."
      );

      return;
    }

    if (!category) {
      setError(
        "Please choose whether you're an adult or child."
      );

      return;
    }

    if (!experienceLevel) {
      setError(
        "Please choose your experience level."
      );

      return;
    }

    if (
      interests.length === 0
    ) {
      setError(
        "Please select at least one reason for using Tiny Titans."
      );

      return;
    }

    /* =====================================
       START SAVE
    ===================================== */

    setSaving(true);

    try {
      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      /*
       * Check whether the profile already
       * exists.
       *
       * This lets us preserve createdAt when
       * updating an existing document.
       */

      const existingSnapshot =
        await getDoc(userRef);

      /*
       * Base profile data.
       */

      const profileData = {
        uid:
          user.uid,

        displayName:
          displayName.trim(),

        email:
          user.email ?? "",

        category,

        experienceLevel,

        interests,

        role:
          "user" as const,

        setupComplete:
          true,

        updatedAt:
          serverTimestamp(),
      };

      /*
       * Only create createdAt when this is
       * genuinely a new Firestore profile.
       *
       * This prevents createdAt from changing
       * every time the user edits their profile.
       */

      if (
        !existingSnapshot.exists()
      ) {
        await setDoc(
          userRef,
          {
            ...profileData,

            createdAt:
              serverTimestamp(),
          }
        );

      } else {
        await setDoc(
          userRef,
          profileData,
          {
            merge: true,
          }
        );
      }

      console.log(
        "Tiny Titans: account profile saved",
        user.uid
      );

      /* =====================================
         REFRESH AUTH CONTEXT
      ===================================== */

      const updatedProfile =
        await refreshProfile();

      /*
       * Do not allow the user into the main
       * application until AuthContext has
       * confirmed the profile is complete.
       */

      if (
        !updatedProfile ||
        !updatedProfile.setupComplete
      ) {
        throw new Error(
          "Your profile was saved, but Tiny Titans could not confirm that setup is complete. Please try again."
        );
      }

      /* =====================================
         ENTER APPLICATION
      ===================================== */

      navigate(
        "/",
        {
          replace: true,
        }
      );

    } catch (saveError) {
      console.error(
        "Tiny Titans: account setup failed",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your profile. Please try again."
      );

    } finally {
      setSaving(false);
    }
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="account-setup-page">

      <section className="account-setup-card">

        {/* ===================================
            LOGO
        =================================== */}

        <div className="account-setup-logo">

          <img
            src={logo}
            alt="Tiny Titans"
          />

        </div>

        {/* ===================================
            HEADER
        =================================== */}

        <div className="account-setup-header">

          <span className="account-setup-icon">
            🐍
          </span>

          <h1>
            Welcome to Tiny Titans
          </h1>

          <p>
            Let's personalise your experience.
          </p>

        </div>

        {/* ===================================
            FORM
        =================================== */}

        <form
          onSubmit={handleSubmit}
          className="account-setup-form"
        >

          {/* =================================
              NAME
          ================================= */}

          <div className="setup-section">

            <label htmlFor="displayName">
              What should we call you?
            </label>

            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value
                )
              }
              placeholder="Your name"
              autoComplete="name"
              disabled={saving}
            />

          </div>

          {/* =================================
              CATEGORY
          ================================= */}

          <div className="setup-section">

            <h2>
              👤 Who are you?
            </h2>

            <p className="setup-help">
              This helps us tailor Tiny Titans appropriately.
            </p>

            <div className="setup-options">

              <button
                type="button"
                className={`setup-option ${
                  category === "adult"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setCategory("adult")
                }
                disabled={saving}
              >

                <span className="option-icon">
                  🧑
                </span>

                <span>

                  <strong>
                    Adult
                  </strong>

                  <small>
                    I'm managing my own account.
                  </small>

                </span>

              </button>

              <button
                type="button"
                className={`setup-option ${
                  category === "child"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setCategory("child")
                }
                disabled={saving}
              >

                <span className="option-icon">
                  👶
                </span>

                <span>

                  <strong>
                    Child
                  </strong>

                  <small>
                    I'm learning with adult guidance.
                  </small>

                </span>

              </button>

            </div>

          </div>

          {/* =================================
              EXPERIENCE
          ================================= */}

          <div className="setup-section">

            <h2>
              🧠 What's your experience level?
            </h2>

            <p className="setup-help">
              Children can progress through all three levels too.
            </p>

            <div className="setup-options">

              <button
                type="button"
                className={`setup-option ${
                  experienceLevel === "beginner"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setExperienceLevel(
                    "beginner"
                  )
                }
                disabled={saving}
              >

                <span className="option-icon">
                  🌱
                </span>

                <span>

                  <strong>
                    Beginner
                  </strong>

                  <small>
                    I'm starting my reptile journey.
                  </small>

                </span>

              </button>

              <button
                type="button"
                className={`setup-option ${
                  experienceLevel === "intermediate"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setExperienceLevel(
                    "intermediate"
                  )
                }
                disabled={saving}
              >

                <span className="option-icon">
                  🦎
                </span>

                <span>

                  <strong>
                    Intermediate
                  </strong>

                  <small>
                    I've got some experience.
                  </small>

                </span>

              </button>

              <button
                type="button"
                className={`setup-option ${
                  experienceLevel === "pro"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setExperienceLevel(
                    "pro"
                  )
                }
                disabled={saving}
              >

                <span className="option-icon">
                  🧬
                </span>

                <span>

                  <strong>
                    Pro
                  </strong>

                  <small>
                    Advanced keeping, breeding or genetics.
                  </small>

                </span>

              </button>

            </div>

          </div>

          {/* =================================
              INTERESTS
          ================================= */}

          <div className="setup-section">

            <h2>
              🐍 What do you want to use Tiny Titans for?
            </h2>

            <p className="setup-help">
              Select all that apply.
            </p>

            <div className="setup-options">

              {[
                {
                  id:
                    "keeper" as Interest,

                  icon:
                    "🐍",

                  title:
                    "Keeper",

                  description:
                    "I keep and care for reptiles.",
                },

                {
                  id:
                    "breeder" as Interest,

                  icon:
                    "🧬",

                  title:
                    "Breeder",

                  description:
                    "I breed reptiles and work with genetics.",
                },

                {
                  id:
                    "breeder-seller" as Interest,

                  icon:
                    "🏪",

                  title:
                    "Breeder & Seller",

                  description:
                    "I breed and sell reptiles.",
                },

                {
                  id:
                    "learner" as Interest,

                  icon:
                    "📚",

                  title:
                    "Learner",

                  description:
                    "I'm here to learn.",
                },
              ].map(
                option => {
                  const selected =
                    interests.includes(
                      option.id
                    );

                  return (
                    <button
                      key={
                        option.id
                      }
                      type="button"
                      className={`setup-option ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleInterest(
                          option.id
                        )
                      }
                      disabled={
                        saving
                      }
                    >

                      <span className="option-icon">
                        {
                          option.icon
                        }
                      </span>

                      <span>

                        <strong>
                          {
                            option.title
                          }
                        </strong>

                        <small>
                          {
                            option.description
                          }
                        </small>

                      </span>

                      {selected && (
                        <span className="selection-tick">
                          ✓
                        </span>
                      )}

                    </button>
                  );
                }
              )}

            </div>

          </div>

          {/* =================================
              ERROR
          ================================= */}

          {error && (
            <div className="setup-error">
              {error}
            </div>
          )}

          {/* =================================
              SUBMIT
          ================================= */}

          <button
            type="submit"
            className="setup-submit"
            disabled={
              saving ||
              interests.length === 0
            }
          >
            {saving
              ? "Saving..."
              : "🐍 Enter Tiny Titans"}
          </button>

        </form>

      </section>

    </main>
  );
}

export default AccountSetup;