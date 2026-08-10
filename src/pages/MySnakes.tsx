import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Snake } from "../types/Snake";

import {
  getUserSnakes,
  migrateLocalSnakesToFirestore,
} from "../services/snakeService";

import { useAuth } from "../context/AuthContext";

import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";

function MySnakes() {
  const navigate = useNavigate();

  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  const [snakes, setSnakes] =
    useState<Snake[]>([]);

  const [loadingSnakes, setLoadingSnakes] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // =========================================
  // LOAD / MIGRATE SNAKES
  // =========================================

  useEffect(() => {
    if (
      loading ||
      profileLoading
    ) {
      return;
    }

    // =======================================
    // AUTH CHECK
    // =======================================

    if (!user) {
      setSnakes([]);
      setLoadingSnakes(false);
      setError(null);
      return;
    }

    const uid = user.uid;

    let cancelled = false;

    // =======================================
    // LOAD SNAKES
    // =======================================

    async function loadSnakes() {
      if (cancelled) {
        return;
      }

      setLoadingSnakes(true);
      setError(null);

      try {
        console.log(
          "========================================="
        );

        console.log(
          "Tiny Titans: MY SNAKES LOAD STARTED"
        );

        console.log(
          "Tiny Titans: authenticated UID:",
          uid
        );

        // =====================================
        // MIGRATE OLD LOCAL STORAGE DATA
        // =====================================

        console.log(
          "Tiny Titans: checking for old localStorage snakes..."
        );

        const migratedCount =
          await migrateLocalSnakesToFirestore(
            uid
          );

        if (cancelled) {
          return;
        }

        console.log(
          "Tiny Titans: localStorage migration complete:",
          migratedCount
        );

        // =====================================
        // LOAD FIRESTORE SNAKES
        // =====================================

        console.log(
          "Tiny Titans: loading snakes from Firestore..."
        );

        const loadedSnakes =
          await getUserSnakes(uid);

        if (cancelled) {
          return;
        }

        console.log(
          "Tiny Titans: raw Firestore snakes:",
          loadedSnakes
        );

        // =====================================
        // NORMALISE FIRESTORE IDs
        // =====================================

        const validSnakes =
          loadedSnakes
            .filter(
              (snake) => {
                const valid =
                  Boolean(
                    snake &&
                    snake.id
                  );

                if (!valid) {
                  console.error(
                    "Tiny Titans: snake loaded without a valid Firestore ID:",
                    snake
                  );
                }

                return valid;
              }
            )
            .map(
              (snake) => ({
                ...snake,

                id:
                  String(
                    snake.id
                  ).trim(),
              })
            );

        // =====================================
        // DEBUG FIRESTORE PATHS
        // =====================================

        validSnakes.forEach(
          (snake) => {
            console.log(
              "Tiny Titans: snake available:",
              {
                name:
                  snake.name,

                id:
                  snake.id,

                profilePath:
                  `/snakes/${snake.id}`,

                firestorePath:
                  `users/${uid}/snakes/${snake.id}`,
              }
            );
          }
        );

        // =====================================
        // SAVE TO STATE
        // =====================================

        setSnakes(
          validSnakes
        );

        console.log(
          "Tiny Titans: final snake count:",
          validSnakes.length
        );

        console.log(
          "Tiny Titans: MY SNAKES LOAD COMPLETE"
        );

        console.log(
          "========================================="
        );

      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "========================================="
        );

        console.error(
          "Tiny Titans: unable to load or migrate snakes"
        );

        console.error(
          err
        );

        console.error(
          "========================================="
        );

        let message =
          "Unable to load your snakes. Please try again.";

        if (
          err instanceof Error
        ) {
          message =
            err.message;
        }

        setError(
          message
        );

      } finally {
        if (!cancelled) {
          setLoadingSnakes(
            false
          );
        }
      }
    }

    void loadSnakes();

    return () => {
      cancelled = true;
    };

  }, [
    user,
    loading,
    profileLoading,
  ]);

  // =========================================
  // AUTH LOADING
  // =========================================

  if (
    loading ||
    profileLoading
  ) {
    return (
      <div className="page-container">

        <BackHomeButton />

        <h1>
          🐍 My Hoggies
        </h1>

        <div className="tracker-card">

          <h3>
            Loading your Tiny Titans...
          </h3>

          <p>
            Connecting to your Tiny Titans
            account.
          </p>

        </div>

      </div>
    );
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="page-container">

      <BackHomeButton />

      <h1>
        🐍 My Hoggies
      </h1>

      {/* =====================================
          ADD SNAKE
      ===================================== */}

      <button
        type="button"
        className="add-snake-button"
        onClick={() =>
          navigate(
            "/snakes/new/edit"
          )
        }
      >
        ➕ Add Snake
      </button>

      {/* =====================================
          LOADING
      ===================================== */}

      {loadingSnakes && (
        <div className="tracker-card">

          <h3>
            Loading your snakes...
          </h3>

          <p>
            Please wait while Tiny Titans
            retrieves your records.
          </p>

        </div>
      )}

      {/* =====================================
          ERROR
      ===================================== */}

      {error && (
        <div className="tracker-card">

          <h3>
            Something went wrong
          </h3>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try Again
          </button>

        </div>
      )}

      {/* =====================================
          NO SNAKES
      ===================================== */}

      {!loadingSnakes &&
        !error &&
        snakes.length === 0 && (
          <div className="tracker-card">

            <h3>
              No snakes added yet 🐍
            </h3>

            <p>
              Add your first Tiny Titan to
              begin tracking weights, feeding,
              sheds and genetics.
            </p>

          </div>
        )}

      {/* =====================================
          SNAKES
      ===================================== */}

      {!loadingSnakes &&
        !error &&
        snakes.length > 0 && (
          <div className="snake-grid">

            {snakes.map(
              (snake) => {

                // =================================
                // FIRESTORE ID IS AUTHORITATIVE
                // =================================

                const snakeId =
                  String(
                    snake.id ?? ""
                  ).trim();

                // =================================
                // NEVER RENDER A TILE WITHOUT ID
                // =================================

                if (!snakeId) {
                  console.error(
                    "Tiny Titans: refusing to render snake tile without ID:",
                    snake
                  );

                  return null;
                }

                // =================================
                // RENDER TILE
                // =================================

                return (
                  <SnakeTile
                    key={
                      snakeId
                    }

                    id={
                      snakeId
                    }

                    name={
                      snake.name
                    }

                    photo={
                      snake.photo
                    }

                    sex={
                      snake.sex
                    }

                    weightHistory={
                      snake.weightHistory
                    }

                    snake={
                      {
                        ...snake,

                        id:
                          snakeId,
                      }
                    }

                    clickDestination="profile"
                  />
                );
              }
            )}

          </div>
        )}

    </div>
  );
}

export default MySnakes;