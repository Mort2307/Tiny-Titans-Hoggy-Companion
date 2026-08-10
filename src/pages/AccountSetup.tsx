import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  doc,
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


const db =
  getFirestore(app);


type Interest =
  | "keeper"
  | "breeder"
  | "breeder-seller"
  | "learner";


function AccountSetup() {

  const navigate =
    useNavigate();

  const {
    user,
  } = useAuth();


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


  const [saving, setSaving] =
    useState(false);


  const [error, setError] =
    useState("");


  function toggleInterest(
    interest: Interest
  ) {

    setInterests((current) => {

      if (current.includes(interest)) {

        return current.filter(
          (item) => item !== interest
        );

      }


      return [
        ...current,
        interest,
      ];

    });

  }


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();


    console.log(
      "Tiny Titans: account setup submitted"
    );


    setError("");


    if (!user) {

      console.error(
        "Tiny Titans: no authenticated Firebase user"
      );


      setError(
        "We couldn't find your Firebase account."
      );

      return;

    }


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


    if (interests.length === 0) {

      setError(
        "Please select at least one reason for using Tiny Titans."
      );

      return;

    }


    setSaving(true);


    console.log(
      "Tiny Titans: preparing Firestore profile write",
      {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        category,
        experienceLevel,
        interests,
      }
    );


    try {

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );


      console.log(
        "Tiny Titans: Firestore document reference created",
        user.uid
      );


      await setDoc(
        userRef,
        {

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
            "user",

          setupComplete:
            true,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

        },
        {
          merge: true,
        }
      );


      console.log(
        "Tiny Titans: Firestore profile write successful"
      );


      setSaving(false);


      navigate(
        "/",
        {
          replace: true,
        }
      );


    } catch (saveError) {

      console.error(
        "Tiny Titans: Firestore profile write FAILED",
        saveError
      );


      setSaving(false);


      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your profile. Please try again."
      );

    }

  }


  return (

    <main className="account-setup-page">

      <section className="account-setup-card">

        <div className="account-setup-logo">

          <img
            src="/src/assets/TinyTitans-Logo.JPG.jpg"
            alt="Tiny Titans"
          />

        </div>


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


        <form
          onSubmit={handleSubmit}
          className="account-setup-form"
        >

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
            />

          </div>


          <div className="setup-section">

            <h2>
              👤 Who are you?
            </h2>

            <p className="setup-help">
              This helps us tailor Tiny Titans
              appropriately.
            </p>


            <div className="setup-options">

              <button
                type="button"
                className={
                  `setup-option ${
                    category === "adult"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setCategory("adult")
                }
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
                className={
                  `setup-option ${
                    category === "child"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setCategory("child")
                }
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


          <div className="setup-section">

            <h2>
              🧠 What's your experience level?
            </h2>

            <p className="setup-help">
              Children can progress through all
              three levels too.
            </p>


            <div className="setup-options">

              <button
                type="button"
                className={
                  `setup-option ${
                    experienceLevel === "beginner"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setExperienceLevel(
                    "beginner"
                  )
                }
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
                className={
                  `setup-option ${
                    experienceLevel === "intermediate"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setExperienceLevel(
                    "intermediate"
                  )
                }
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
                className={
                  `setup-option ${
                    experienceLevel === "pro"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setExperienceLevel(
                    "pro"
                  )
                }
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


          <div className="setup-section">

            <h2>
              🐍 What do you want to use Tiny Titans for?
            </h2>

            <p className="setup-help">
              Select all that apply.
            </p>


            <div className="setup-options">

              <button
                type="button"
                className={
                  `setup-option ${
                    interests.includes("keeper")
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  toggleInterest("keeper")
                }
              >

                <span className="option-icon">
                  🐍
                </span>

                <span>

                  <strong>
                    Keeper
                  </strong>

                  <small>
                    I keep and care for reptiles.
                  </small>

                </span>

                {interests.includes("keeper") && (

                  <span className="selection-tick">
                    ✓
                  </span>

                )}

              </button>


              <button
                type="button"
                className={
                  `setup-option ${
                    interests.includes("breeder")
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  toggleInterest("breeder")
                }
              >

                <span className="option-icon">
                  🧬
                </span>

                <span>

                  <strong>
                    Breeder
                  </strong>

                  <small>
                    I breed reptiles and work with genetics.
                  </small>

                </span>

                {interests.includes("breeder") && (

                  <span className="selection-tick">
                    ✓
                  </span>

                )}

              </button>


              <button
                type="button"
                className={
                  `setup-option ${
                    interests.includes("breeder-seller")
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  toggleInterest(
                    "breeder-seller"
                  )
                }
              >

                <span className="option-icon">
                  🏪
                </span>

                <span>

                  <strong>
                    Breeder & Seller
                  </strong>

                  <small>
                    I breed and sell reptiles.
                  </small>

                </span>

                {interests.includes(
                  "breeder-seller"
                ) && (

                  <span className="selection-tick">
                    ✓
                  </span>

                )}

              </button>


              <button
                type="button"
                className={
                  `setup-option ${
                    interests.includes("learner")
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  toggleInterest("learner")
                }
              >

                <span className="option-icon">
                  📚
                </span>

                <span>

                  <strong>
                    Learner
                  </strong>

                  <small>
                    I'm here to learn.
                  </small>

                </span>

                {interests.includes("learner") && (

                  <span className="selection-tick">
                    ✓
                  </span>

                )}

              </button>

            </div>

          </div>


          {error && (

            <div className="setup-error">
              {error}
            </div>

          )}


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
              : "🐍 Enter Tiny Titans"
            }

          </button>

        </form>

      </section>

    </main>

  );

}


export default AccountSetup;