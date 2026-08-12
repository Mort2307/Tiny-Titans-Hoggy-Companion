import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import type {
  Snake,
} from "../types/Snake";

import type {
  Het,
} from "../types/genetics";

import type {
  WeightRecord,
} from "../types/Weight";

import SnakeForm from "../components/SnakeForm";

import SaveProgress, {
  type SaveStage,
} from "../components/SaveProgress";

import BackHomeButton from "../components/BackHomeButton";

import {
  getUserSnake,
  saveUserSnake,
} from "../services/snakeService";

import {
  migrateSnake,
} from "../utils/snakeMigration";


// =========================================
// EMPTY FORM
// =========================================

const emptyForm = {
  name: "",

  species:
    "Western Hognose",

  photo: "",

  sex:
    "Unknown" as Snake["sex"],

  morphs:
    [] as string[],

  customMorph:
    "",

  hets:
    [] as Het[],

  customHets:
    "",

  startingWeight:
    null as number | null,

  startingWeightDate:
    "",

  weight:
    null as number | null,

  lastWeighedDate:
    "",

  weightHistory:
    [] as WeightRecord[],

  hatchDate:
    "",

  arrivalDate:
    "",

  notes:
    "",
};


// =========================================
// SORT WEIGHT HISTORY
// =========================================

function sortWeightHistory(
  history: WeightRecord[]
): WeightRecord[] {

  return [...history].sort(
    (a, b) => {

      const difference =
        new Date(a.date).getTime() -
        new Date(b.date).getTime();

      if (
        difference === 0
      ) {

        return a.id.localeCompare(
          b.id
        );
      }

      return difference;
    }
  );
}


// =========================================
// BUILD WEIGHT HISTORY
// =========================================

function buildWeightHistory(
  snakeId: string,
  existingHistory: WeightRecord[],
  startingWeight: number | null,
  startingWeightDate: string,
  currentWeight: number | null,
  lastWeighedDate: string
): WeightRecord[] {

  const records: WeightRecord[] = [
    ...(existingHistory ?? []),
  ];


  // =======================================
  // STARTING WEIGHT
  // =======================================

  if (
    startingWeight !== null &&
    Number.isFinite(
      startingWeight
    ) &&
    startingWeight > 0 &&
    startingWeightDate
  ) {

    const startingId =
      `starting-${snakeId}`;

    const startingRecord:
      WeightRecord = {

      id:
        startingId,

      snakeId,

      weight:
        startingWeight,

      date:
        startingWeightDate,

      unit:
        "g",
    };

    const existingIndex =
      records.findIndex(
        (record) =>
          record.id ===
          startingId
      );

    if (
      existingIndex >= 0
    ) {

      records[
        existingIndex
      ] =
        startingRecord;

    } else {

      records.push(
        startingRecord
      );
    }
  }


  // =======================================
  // CURRENT WEIGHT
  // =======================================

  if (
    currentWeight !== null &&
    Number.isFinite(
      currentWeight
    ) &&
    currentWeight > 0 &&
    lastWeighedDate
  ) {

    const currentId =
      `current-${snakeId}-${lastWeighedDate}`;

    const currentRecord:
      WeightRecord = {

      id:
        currentId,

      snakeId,

      weight:
        currentWeight,

      date:
        lastWeighedDate,

      unit:
        "g",
    };

    const existingIndex =
      records.findIndex(
        (record) =>
          record.id ===
          currentId
      );

    if (
      existingIndex >= 0
    ) {

      records[
        existingIndex
      ] =
        currentRecord;

    } else {

      records.push(
        currentRecord
      );
    }
  }


  // =======================================
  // REMOVE DUPLICATES
  // =======================================

  const uniqueRecords =
    new Map<
      string,
      WeightRecord
    >();

  for (
    const record of records
  ) {

    const key =
      record.id ||
      `${record.snakeId}-${record.date}-${record.weight}`;

    uniqueRecords.set(
      key,
      {
        ...record,

        snakeId,

        unit:
          record.unit ||
          "g",
      }
    );
  }

  return sortWeightHistory(
    Array.from(
      uniqueRecords.values()
    )
  );
}


// =========================================
// FIREBASE ERROR HELPER
// =========================================

function getFirebaseErrorDetails(
  error: unknown
): {
  code: string;
  message: string;
} {

  if (
    error &&
    typeof error === "object"
  ) {

    const firebaseError =
      error as {
        code?: unknown;
        message?: unknown;
      };

    const code =
      typeof firebaseError.code ===
      "string"
        ? firebaseError.code
        : "unknown";

    const message =
      typeof firebaseError.message ===
      "string"
        ? firebaseError.message
        : "Unknown Firebase error.";

    return {
      code,
      message,
    };
  }

  if (
    error instanceof Error
  ) {

    return {
      code:
        "unknown",

      message:
        error.message,
    };
  }

  return {
    code:
      "unknown",

    message:
      String(error),
  };
}


// =========================================
// SNAKE EDIT
// =========================================

function SnakeEdit() {

  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const {
    user,
    loading,
    profileLoading,
  } = useAuth();

  const isNew =
    id === "new";


  const [
    form,
    setForm,
  ] =
    useState(
      emptyForm
    );


  const [
    loaded,
    setLoaded,
  ] =
    useState(false);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  // =======================================
  // SAVE PROGRESS
  // =======================================

  const [
    saveStage,
    setSaveStage,
  ] =
    useState<SaveStage>(
      "idle"
    );


  const [
    saveError,
    setSaveError,
  ] =
    useState("");


  // =======================================
  // MOBILE SAVE LOCK
  // =======================================

  const saveLock =
    useRef(false);


  // =======================================
  // LOAD SNAKE
  // =======================================

  useEffect(() => {

    let cancelled =
      false;


    async function loadSnake() {

      if (
        loading ||
        profileLoading
      ) {
        return;
      }


      if (!user) {

        console.error(
          "Tiny Titans: no authenticated user"
        );

        if (
          !cancelled
        ) {

          setLoaded(
            true
          );
        }

        return;
      }


      // =====================================
      // NEW SNAKE
      // =====================================

      if (
        isNew
      ) {

        if (
          !cancelled
        ) {

          setForm({
            ...emptyForm,

            morphs: [],

            hets: [],

            weightHistory: [],
          });

          setLoaded(
            true
          );
        }

        return;
      }


      // =====================================
      // EXISTING SNAKE
      // =====================================

      if (!id) {

        console.error(
          "Tiny Titans: no snake ID supplied"
        );

        if (
          !cancelled
        ) {

          setLoaded(
            true
          );
        }

        return;
      }


      try {

        console.log(
          "Tiny Titans: loading snake",
          {
            uid:
              user.uid,

            snakeId:
              id,
          }
        );


        const snake =
          await getUserSnake(
            user.uid,
            id
          );


        if (
          !snake
        ) {

          console.error(
            "Tiny Titans: snake not found",
            {
              uid:
                user.uid,

              snakeId:
                id,
            }
          );

          if (
            !cancelled
          ) {

            alert(
              "This snake could not be found."
            );

            navigate(
              "/snakes",
              {
                replace:
                  true,
              }
            );
          }

          return;
        }


        const migratedSnake =
          migrateSnake(
            snake
          );


        const weightHistory =
          sortWeightHistory(
            migratedSnake.weightHistory ??
              []
          );


        if (
          cancelled
        ) {
          return;
        }


        setForm({

          name:
            migratedSnake.name ??
            "",

          species:
            migratedSnake.species ??
            "Western Hognose",

          photo:
            migratedSnake.photo ??
            "",

          sex:
            migratedSnake.sex ??
            "Unknown",

          morphs:
            migratedSnake.morphs ??
            [],

          customMorph:
            migratedSnake.customMorph ??
            "",

          hets:
            migratedSnake.hets ??
            [],

          customHets:
            migratedSnake.customHets ??
            "",

          startingWeight:
            migratedSnake.startingWeight ??
            null,

          startingWeightDate:
            migratedSnake.startingWeightDate ??
            "",

          weight:
            migratedSnake.weight ??
            null,

          lastWeighedDate:
            migratedSnake.lastWeighedDate ??
            "",

          weightHistory,

          hatchDate:
            migratedSnake.hatchDate ??
            "",

          arrivalDate:
            migratedSnake.arrivalDate ??
            "",

          notes:
            migratedSnake.notes ??
            "",
        });


        console.log(
          "Tiny Titans: snake loaded successfully",
          {
            snakeId:
              migratedSnake.id,

            name:
              migratedSnake.name,
          }
        );


        setLoaded(
          true
        );

      } catch (
        error
      ) {

        const details =
          getFirebaseErrorDetails(
            error
          );


        console.error(
          "Tiny Titans: unable to load snake",
          {
            error,

            code:
              details.code,

            message:
              details.message,

            uid:
              user.uid,

            snakeId:
              id,
          }
        );


        if (
          !cancelled
        ) {

          alert(
            `Unable to load this snake.\n\n${details.code}: ${details.message}`
          );

          setLoaded(
            true
          );
        }
      }
    }


    void loadSnake();


    return () => {

      cancelled =
        true;
    };

  }, [
    id,
    isNew,
    navigate,
    user,
    loading,
    profileLoading,
  ]);


  // =========================================
  // UPDATE FORM
  // =========================================

  function updateField(
    field: string,
    value: unknown
  ) {

    setForm(
      (previous) => ({

        ...previous,

        [field]:
          value,
      })
    );
  }


  // =========================================
  // SAVE
  // =========================================

  async function saveSnake() {

    // ---------------------------------------
    // PREVENT DOUBLE TAP
    // ---------------------------------------

    if (
      saveLock.current
    ) {

      console.log(
        "Tiny Titans: save already locked"
      );

      return;
    }


    // ---------------------------------------
    // AUTH CHECK
    // ---------------------------------------

    if (!user) {

      setSaveStage(
        "error"
      );

      setSaveError(
        "You must be logged in to save a snake."
      );

      return;
    }


    // ---------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------

    if (
      !form.name.trim()
    ) {

      setSaveStage(
        "error"
      );

      setSaveError(
        "Please enter a name for your snake."
      );

      return;
    }


    // ---------------------------------------
    // LOCK
    // ---------------------------------------

    saveLock.current =
      true;

    setSaving(
      true
    );

    setSaveError(
      ""
    );

    setSaveStage(
      "preparing"
    );


    console.log(
      "========================================="
    );

    console.log(
      "Tiny Titans: SAVE STARTED"
    );

    console.log(
      {
        userId:
          user.uid,

        mode:
          isNew
            ? "CREATE"
            : "UPDATE",

        snakeName:
          form.name,

        snakeId:
          id ?? null,
      }
    );


    // =======================================
    // SAVE
    // =======================================

    try {

      // =====================================
      // NEW SNAKE
      // =====================================

      if (
        isNew
      ) {

        // -----------------------------------
        // PREPARING DATA
        // -----------------------------------

        setSaveStage(
          "preparing"
        );


        const weightHistory =
          buildWeightHistory(
            "new",
            form.weightHistory,
            form.startingWeight,
            form.startingWeightDate,
            form.weight,
            form.lastWeighedDate
          );


        const newestWeight =
          weightHistory.length > 0
            ? weightHistory[
                weightHistory.length - 1
              ]
            : null;


        const newSnake =
          migrateSnake({

            ...form,

            weightHistory,

            weight:
              newestWeight?.weight ??
              form.weight ??
              null,

            lastWeighedDate:
              newestWeight?.date ??
              form.lastWeighedDate ??
              "",

            weightTracking: {

              enabled:
                true,

              frequency:
                "Monthly",
            },
          });


        delete (
          newSnake as Partial<Snake>
        ).id;


        console.log(
          "Tiny Titans: new snake payload prepared",
          {
            name:
              newSnake.name,

            species:
              newSnake.species,

            weight:
              newSnake.weight,

            weightHistoryCount:
              newSnake.weightHistory?.length ??
              0,
          }
        );


        // -----------------------------------
        // SAVE PROFILE
        // -----------------------------------

        setSaveStage(
          "saving-profile"
        );


        console.log(
          "Tiny Titans: calling saveUserSnake CREATE"
        );


        const savedSnake =
          await saveUserSnake(
            user.uid,
            newSnake
          );


        console.log(
          "Tiny Titans: NEW SNAKE SAVED",
          {
            id:
              savedSnake?.id,

            name:
              savedSnake?.name,
          }
        );


        if (
          !savedSnake?.id
        ) {

          throw new Error(
            "Firebase saved the snake but did not return a valid snake ID."
          );
        }


        // -----------------------------------
        // SYNC
        // -----------------------------------

        setSaveStage(
          "syncing"
        );


        /*
         * Give the user a clear indication that
         * Firebase has accepted the record and
         * Tiny Titans is finishing the operation.
         *
         * This is intentionally a short pause
         * so the 85% state is actually visible.
         */

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              350
            )
        );


        // -----------------------------------
        // COMPLETE
        // -----------------------------------

        setSaveStage(
          "complete"
        );


        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700
            )
        );


        console.log(
          "Tiny Titans: navigating to new snake",
          savedSnake.id
        );


        navigate(
          `/snakes/${savedSnake.id}`,
          {
            replace:
              true,
          }
        );


        return;
      }


      // =====================================
      // EXISTING SNAKE
      // =====================================

      if (!id) {

        throw new Error(
          "Cannot update this snake because its ID is missing."
        );
      }


      // -------------------------------------
      // PREPARING
      // -------------------------------------

      setSaveStage(
        "preparing"
      );


      console.log(
        "Tiny Titans: loading existing snake before update",
        {
          uid:
            user.uid,

          snakeId:
            id,
        }
      );


      const existingSnake =
        await getUserSnake(
          user.uid,
          id
        );


      if (
        !existingSnake
      ) {

        throw new Error(
          `Snake with ID ${id} could not be found.`
        );
      }


      const combinedHistory =
        [

          ...(existingSnake.weightHistory ?? []),

          ...(form.weightHistory ?? []),

        ];


      const weightHistory =
        buildWeightHistory(
          id,
          combinedHistory,
          form.startingWeight,
          form.startingWeightDate,
          form.weight,
          form.lastWeighedDate
        );


      const newestWeight =
        weightHistory.length > 0
          ? weightHistory[
              weightHistory.length - 1
            ]
          : null;


      const updatedSnake =
        migrateSnake({

          ...existingSnake,

          ...form,

          id,

          weightHistory,

          weight:
            newestWeight?.weight ??
            form.weight ??
            existingSnake.weight ??
            null,

          lastWeighedDate:
            newestWeight?.date ??
            form.lastWeighedDate ??
            existingSnake.lastWeighedDate ??
            "",

          weightTracking:
            existingSnake.weightTracking,
        });


      console.log(
        "Tiny Titans: updated snake payload prepared",
        {
          snakeId:
            updatedSnake.id,

          name:
            updatedSnake.name,

          weight:
            updatedSnake.weight,

          weightHistoryCount:
            updatedSnake.weightHistory?.length ??
            0,
        }
      );


      // -------------------------------------
      // SAVE PROFILE
      // -------------------------------------

      setSaveStage(
        "saving-profile"
      );


      console.log(
        "Tiny Titans: calling saveUserSnake UPDATE"
      );


      const savedSnake =
        await saveUserSnake(
          user.uid,
          updatedSnake
        );


      console.log(
        "Tiny Titans: EXISTING SNAKE UPDATED",
        {
          id:
            savedSnake?.id,

          name:
            savedSnake?.name,
        }
      );


      if (
        !savedSnake?.id
      ) {

        throw new Error(
          "Firebase updated the snake but did not return a valid snake ID."
        );
      }


      // -------------------------------------
      // SYNC
      // -------------------------------------

      setSaveStage(
        "syncing"
      );


      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );


      // -------------------------------------
      // COMPLETE
      // -------------------------------------

      setSaveStage(
        "complete"
      );


      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            700
          )
      );


      console.log(
        "Tiny Titans: navigating to updated snake",
        savedSnake.id
      );


      navigate(
        `/snakes/${savedSnake.id}`,
        {
          replace:
            true,
        }
      );

    } catch (
      error
    ) {

      const details =
        getFirebaseErrorDetails(
          error
        );


      console.error(
        "========================================="
      );

      console.error(
        "Tiny Titans: FAILED TO SAVE SNAKE"
      );

      console.error(
        "Firebase error code:",
        details.code
      );

      console.error(
        "Firebase error message:",
        details.message
      );

      console.error(
        "Full error:",
        error
      );

      console.error(
        "Save context:",
        {
          userId:
            user.uid,

          mode:
            isNew
              ? "CREATE"
              : "UPDATE",

          snakeId:
            id ?? null,

          snakeName:
            form.name,
        }
      );

      console.error(
        "========================================="
      );


      setSaveError(
        details.code !==
        "unknown"
          ? `${details.code}: ${details.message}`
          : details.message
      );


      setSaveStage(
        "error"
      );


      /*
       * Keep the error visible instead of
       * immediately resetting the progress UI.
       */

    } finally {

      setSaving(
        false
      );

      saveLock.current =
        false;

      console.log(
        "Tiny Titans: SAVE FINISHED"
      );
    }
  }


  // =========================================
  // LOADING
  // =========================================

  if (
    loading ||
    profileLoading ||
    !loaded
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
            Please wait while Tiny Titans
            retrieves the snake record.
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
        {isNew
          ? "➕ Add New Snake"
          : "✏️ Edit Snake"}
      </h1>


      {/* ===================================== */}
      {/* SAVE PROGRESS */}
      {/* ===================================== */}

      <SaveProgress
        stage={
          saveStage
        }
        snakeName={
          form.name
        }
        errorMessage={
          saveError
        }
      />


      <SnakeForm
        form={
          form
        }
        updateField={
          updateField
        }
        onSave={
          saveSnake
        }
        editing={
          !isNew
        }
        saving={
          saving
        }
      />


      <button
        type="button"
        className="cancel-snake-button"
        disabled={
          saving
        }
        onClick={() => {

          if (
            saving
          ) {
            return;
          }

          navigate(
            isNew
              ? "/snakes"
              : `/snakes/${id}`
          );
        }}
      >
        Cancel
      </button>

    </div>
  );
}


export default SnakeEdit;