import {
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import type { Snake } from "../types/Snake";

import {
  migrateSnake,
} from "../utils/snakeMigration";

import {
  getWeightReminder,
} from "../utils/weightReminder";

import {
  getUserSnake,
  deleteUserSnake,
} from "../services/snakeService";

import {
  useAuth,
} from "../context/AuthContext";

import WeightMiniChart from "../components/WeightMiniChart";
import BackHomeButton from "../components/BackHomeButton";


function SnakeProfile() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  const [
    snake,
    setSnake,
  ] = useState<Snake | null>(null);

  const [
    loadingSnake,
    setLoadingSnake,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  // =========================================
  // LOAD SNAKE
  // =========================================

  useEffect(() => {
    let cancelled = false;

    async function loadSnake() {
      /*
       * Wait for authentication/profile
       * state to finish resolving.
       */
      if (
        loading ||
        profileLoading
      ) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setSnake(null);

          setError(
            "You must be logged in to view this snake."
          );

          setLoadingSnake(false);
        }

        return;
      }

      if (!id) {
        if (!cancelled) {
          setSnake(null);

          setError(
            "No snake ID was supplied."
          );

          setLoadingSnake(false);
        }

        return;
      }

      try {
        console.log(
          "========================================="
        );

        console.log(
          "Tiny Titans: PROFILE LOAD"
        );

        console.log(
          "Route snake ID:",
          id
        );

        console.log(
          "Authenticated user:",
          user.uid
        );

        console.log(
          "Firestore path:",
          `users/${user.uid}/snakes/${id}`
        );

        console.log(
          "========================================="
        );

        const loadedSnake =
          await getUserSnake(
            user.uid,
            id
          );

        if (
          cancelled
        ) {
          return;
        }

        if (!loadedSnake) {
          console.error(
            "Tiny Titans: Firestore returned no snake",
            {
              requestedId: id,
              userId: user.uid,
            }
          );

          setSnake(null);

          setError(
            "This snake could not be found in your Tiny Titans account."
          );

          setLoadingSnake(false);

          return;
        }

        /*
         * Firestore document ID is authoritative.
         *
         * getUserSnake() already returns document.id,
         * but we explicitly preserve it here.
         */
        const migratedSnake =
          migrateSnake({
            ...loadedSnake,

            id:
              loadedSnake.id || id,
          });

        console.log(
          "Tiny Titans: snake profile loaded",
          {
            requestedId: id,
            firestoreId:
              migratedSnake.id,
            name:
              migratedSnake.name,
          }
        );

        setSnake(
          migratedSnake
        );

        setError(null);
        setLoadingSnake(false);

      } catch (loadError) {
        if (
          cancelled
        ) {
          return;
        }

        console.error(
          "Tiny Titans: unable to load snake profile",
          loadError
        );

        setSnake(null);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this snake. Please try again."
        );

        setLoadingSnake(false);
      }
    }

    void loadSnake();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    user,
    loading,
    profileLoading,
  ]);


  // =========================================
  // CALCULATE AGE
  // =========================================

  function calculateAge(
    date: string
  ) {
    if (!date) {
      return "-";
    }

    const start =
      new Date(date);

    const now =
      new Date();

    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      return "-";
    }

    let years =
      now.getFullYear() -
      start.getFullYear();

    let months =
      now.getMonth() -
      start.getMonth();

    let days =
      now.getDate() -
      start.getDate();

    if (
      days < 0
    ) {
      months--;

      const previousMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        );

      days +=
        previousMonth.getDate();
    }

    if (
      months < 0
    ) {
      years--;

      months += 12;
    }

    if (
      years < 0
    ) {
      return "Not yet hatched";
    }

    const result: string[] = [];

    if (years) {
      result.push(
        `${years} year${
          years !== 1
            ? "s"
            : ""
        }`
      );
    }

    if (months) {
      result.push(
        `${months} month${
          months !== 1
            ? "s"
            : ""
        }`
      );
    }

    if (days) {
      result.push(
        `${days} day${
          days !== 1
            ? "s"
            : ""
        }`
      );
    }

    return (
      result.join(", ") ||
      "0 days"
    );
  }


  // =========================================
  // DELETE
  // =========================================

  async function deleteSnake() {
    if (
      !snake ||
      !user
    ) {
      return;
    }

    if (!snake.id) {
      alert(
        "This snake does not have a valid Firestore ID."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${snake.name}? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      console.log(
        "Tiny Titans: deleting snake",
        {
          userId:
            user.uid,

          snakeId:
            snake.id,
        }
      );

      await deleteUserSnake(
        user.uid,
        snake.id
      );

      console.log(
        "Tiny Titans: snake deleted successfully",
        snake.id
      );

      navigate(
        "/snakes",
        {
          replace: true,
        }
      );

    } catch (deleteError) {
      console.error(
        "Tiny Titans: unable to delete snake",
        deleteError
      );

      alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this snake. Please try again."
      );
    }
  }


  // =========================================
  // EDIT
  // =========================================

  function openSnakeEditor() {
    if (
      !snake?.id
    ) {
      return;
    }

    navigate(
      `/snakes/${snake.id}/edit`
    );
  }


  // =========================================
  // LOADING
  // =========================================

  if (
    loading ||
    profileLoading ||
    loadingSnake
  ) {
    return (
      <div className="page-container">

        <BackHomeButton />

        <h1>
          🐍 Loading Snake...
        </h1>

        <div className="tracker-card">

          <h3>
            Loading your Tiny Titan...
          </h3>

          <p>
            Fetching the snake profile
            from Firebase.
          </p>

        </div>

      </div>
    );
  }


  // =========================================
  // ERROR
  // =========================================

  if (
    error ||
    !snake
  ) {
    return (
      <div className="page-container">

        <BackHomeButton />

        <h1>
          🐍 Snake Not Found
        </h1>

        <div className="tracker-card">

          <h3>
            {error ??
              "This snake could not be found."}
          </h3>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/snakes"
              )
            }
          >
            ← Back to My Hoggies
          </button>

        </div>

      </div>
    );
  }


  // =========================================
  // REMINDER
  // =========================================

  const reminder =
    getWeightReminder(
      snake
    );


  // =========================================
  // WEIGHT HISTORY
  // =========================================

  const weightHistory =
    snake.weightHistory ?? [];


  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="page-container">

      <BackHomeButton />

      {/* ================================= */}
      {/* PROFILE HEADER */}
      {/* ================================= */}

      <h1>
        🐍 {snake.name}
      </h1>


      {/* ================================= */}
      {/* PHOTO */}
      {/* ================================= */}

      <div className="snake-profile-photo">

        {snake.photo ? (
          <img
            src={snake.photo}
            alt={snake.name}
          />
        ) : (
          <div className="snake-profile-placeholder">
            🐍
          </div>
        )}

      </div>


      {/* ================================= */}
      {/* QUICK ACTIONS */}
      {/* ================================= */}

      <div className="tracker-card snake-profile-actions">

        <button
          type="button"
          onClick={
            openSnakeEditor
          }
        >
          ✏️ Edit Snake
        </button>


        <button
          type="button"
          onClick={() =>
            navigate(
              `/feeding/${snake.id}`
            )
          }
        >
          🍽 Log Feeding
        </button>


        <button
          type="button"
          onClick={() =>
            navigate(
              `/shedding/${snake.id}`
            )
          }
        >
          🐍 Log Shed
        </button>


        <button
          type="button"
          onClick={() =>
            navigate(
              `/weights/${snake.id}`
            )
          }
        >
          ⚖️ Weight
        </button>


        <button
          type="button"
          onClick={
            deleteSnake
          }
        >
          🗑️ Delete Snake
        </button>

      </div>


      {/* ================================= */}
      {/* PROFILE DASHBOARD */}
      {/* ================================= */}

      <div className="snake-profile-grid">


        {/* ================================= */}
        {/* BASIC INFORMATION */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={
            openSnakeEditor
          }
        >

          <div className="snake-profile-card-icon">
            📋
          </div>

          <h2>
            Basic Information
          </h2>

          <p>
            <strong>
              {snake.species}
            </strong>
          </p>

          <p>
            {snake.sex}
          </p>

          {snake.nickname && (
            <p>
              "{snake.nickname}"
            </p>
          )}

        </button>


        {/* ================================= */}
        {/* GENETICS */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={
            openSnakeEditor
          }
        >

          <div className="snake-profile-card-icon">
            🧬
          </div>

          <h2>
            Genetics
          </h2>

          <p>
            <strong>
              {snake.morphs?.length
                ? snake.morphs.join(
                    ", "
                  )
                : "No morphs listed"}
            </strong>
          </p>

          {snake.hets?.length > 0 && (
            <p>
              {snake.hets.length} het
              {snake.hets.length !==
              1
                ? "s"
                : ""}
            </p>
          )}

          {snake.customMorph && (
            <p>
              {snake.customMorph}
            </p>
          )}

        </button>


        {/* ================================= */}
        {/* WEIGHT */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={() =>
            navigate(
              `/weights/${snake.id}`
            )
          }
        >

          <div className="snake-profile-card-icon">
            ⚖️
          </div>

          <h2>
            Weight
          </h2>

          <p className="snake-profile-big-value">
            {snake.weight ??
              "-"}g
          </p>

          <p>
            {snake.lastWeighedDate
              ? `Last weighed ${snake.lastWeighedDate}`
              : "No weight recorded"}
          </p>

          <div className="snake-profile-mini-chart">

            <WeightMiniChart
              history={
                weightHistory
              }
            />

          </div>

        </button>


        {/* ================================= */}
        {/* WEIGHT REMINDERS */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={
            openSnakeEditor
          }
        >

          <div className="snake-profile-card-icon">
            ⏰
          </div>

          <h2>
            Weight Reminders
          </h2>

          <p>
            {snake.weightTracking?.enabled
              ? "Enabled"
              : "Disabled"}
          </p>

          {snake.weightTracking?.enabled && (
            <p>
              {
                snake.weightTracking
                  .frequency
              }
            </p>
          )}

          {reminder.status !==
            "disabled" && (
            <p>
              {reminder.status ===
              "overdue"
                ? "🔴 Weight overdue"
                : reminder.status ===
                  "due"
                ? "🟡 Due today"
                : `🟢 Due in ${reminder.daysRemaining} days`}
            </p>
          )}

        </button>


        {/* ================================= */}
        {/* TIMELINE */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={
            openSnakeEditor
          }
        >

          <div className="snake-profile-card-icon">
            📅
          </div>

          <h2>
            Timeline
          </h2>

          {snake.hatchDate ? (
            <>
              <p>
                🥚{" "}
                {snake.hatchDate}
              </p>

              <p>
                🎂{" "}
                {calculateAge(
                  snake.hatchDate
                )}
              </p>
            </>
          ) : (
            <p>
              No hatch date recorded
            </p>
          )}

          {snake.arrivalDate && (
            <p>
              🏠{" "}
              {snake.arrivalDate}
            </p>
          )}

        </button>


        {/* ================================= */}
        {/* RECORDS */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card"
          onClick={() =>
            navigate(
              `/feeding/${snake.id}`
            )
          }
        >

          <div className="snake-profile-card-icon">
            📚
          </div>

          <h2>
            Records
          </h2>

          <p>
            🍽 Feeding:{" "}
            <strong>
              {snake.feedingHistory
                ?.length ?? 0}
            </strong>
          </p>

          <p>
            🐍 Sheds:{" "}
            <strong>
              {snake.shedHistory
                ?.length ?? 0}
            </strong>
          </p>

          <p>
            ❤️ Health:{" "}
            <strong>
              {snake.healthHistory
                ?.length ?? 0}
            </strong>
          </p>

        </button>


        {/* ================================= */}
        {/* NOTES */}
        {/* ================================= */}

        <button
          type="button"
          className="snake-profile-card snake-profile-card-notes"
          onClick={
            openSnakeEditor
          }
        >

          <div className="snake-profile-card-icon">
            📝
          </div>

          <h2>
            Notes
          </h2>

          <p>
            {snake.notes ||
              "No notes added"}
          </p>

        </button>


      </div>

    </div>
  );
}


export default SnakeProfile;