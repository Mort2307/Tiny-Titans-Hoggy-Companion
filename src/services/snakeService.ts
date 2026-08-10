import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

import type { Snake } from "../types/Snake";

import { db } from "../firebase/config";

import { migrateSnake } from "../utils/snakeMigration";

// =========================================================
// USER SNAKES COLLECTION
// =========================================================

function snakesCollection(uid: string) {
  return collection(
    db,
    "users",
    uid,
    "snakes"
  );
}

// =========================================================
// FIRESTORE ERROR HELPER
// =========================================================

function getFirestoreErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error
  ) {
    const firebaseError =
      error as {
        code?: string;
        message?: string;
      };

    switch (firebaseError.code) {
      case "permission-denied":
        return (
          "Firebase permission denied. " +
          "Your Firestore security rules are currently blocking this save."
        );

      case "unauthenticated":
        return (
          "Firebase says you are not authenticated. " +
          "Please log out and log back in."
        );

      case "unavailable":
        return (
          "Firebase is temporarily unavailable. " +
          "Please check your internet connection."
        );

      case "failed-precondition":
        return (
          "Firebase could not complete the request because " +
          "a required database configuration is missing."
        );

      case "invalid-argument":
        return (
          "Firebase rejected the snake data because one or more " +
          "values are invalid."
        );

      case "deadline-exceeded":
        return (
          "Firebase took too long to respond. " +
          "Please check your connection and try again."
        );

      case "not-found":
        return (
          "The requested Firestore snake document could not be found."
        );

      default:
        if (firebaseError.message) {
          return firebaseError.message;
        }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to save this snake.";
}

// =========================================================
// REMOVE ONLY UNDEFINED VALUES
// =========================================================
//
// IMPORTANT:
//
// Do NOT recursively destroy Firebase special objects.
// Firestore FieldValue objects such as serverTimestamp()
// must be passed to Firestore untouched.
//
// =========================================================

function removeUndefined(
  value: unknown
): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map(removeUndefined)
      .filter(
        (item) =>
          item !== undefined
      );
  }

  if (typeof value === "object") {
    /*
     * Firestore data passed into this function should
     * primarily consist of plain objects.
     *
     * We only recurse into objects that are ordinary
     * JavaScript objects.
     */

    const prototype =
      Object.getPrototypeOf(
        value
      );

    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      return value;
    }

    const cleaned: Record<
      string,
      unknown
    > = {};

    for (
      const [
        key,
        child,
      ] of Object.entries(
        value as Record<
          string,
          unknown
        >
      )
    ) {
      if (
        child === undefined
      ) {
        continue;
      }

      const cleanedChild =
        removeUndefined(
          child
        );

      if (
        cleanedChild === undefined
      ) {
        continue;
      }

      cleaned[key] =
        cleanedChild;
    }

    return cleaned;
  }

  return value;
}

// =========================================================
// PREPARE SNAKE FOR FIRESTORE
// =========================================================

function prepareSnakeForFirestore(
  snake: Snake,
  firestoreId: string,
  uid: string
): Record<string, unknown> {
  const migrated =
    migrateSnake({
      ...snake,

      id:
        firestoreId,
    });

  const prepared = {
    ...migrated,

    id:
      firestoreId,

    ownerId:
      uid,
  };

  const cleaned =
    removeUndefined(
      prepared
    );

  if (
    !cleaned ||
    typeof cleaned !== "object"
  ) {
    throw new Error(
      "Tiny Titans produced invalid snake data before saving."
    );
  }

  return cleaned as Record<
    string,
    unknown
  >;
}

// =========================================================
// GET ALL USER SNAKES
// =========================================================

export async function getUserSnakes(
  uid: string
): Promise<Snake[]> {
  if (!uid) {
    throw new Error(
      "Cannot load snakes without a user ID."
    );
  }

  try {
    const snakesRef =
      snakesCollection(
        uid
      );

    const snakesQuery =
      query(
        snakesRef,
        orderBy(
          "name"
        )
      );

    const snapshot =
      await getDocs(
        snakesQuery
      );

    return snapshot.docs.map(
      (
        document
      ) => {
        return migrateSnake({
          ...(document.data() as Partial<Snake>),

          id:
            document.id,
        });
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Tiny Titans: unable to get user snakes",
      error
    );

    throw new Error(
      getFirestoreErrorMessage(
        error
      )
    );
  }
}

// =========================================================
// GET ONE USER SNAKE
// =========================================================

export async function getUserSnake(
  uid: string,
  snakeId: string
): Promise<Snake | null> {
  if (!uid) {
    throw new Error(
      "Cannot load snake without a user ID."
    );
  }

  if (!snakeId) {
    throw new Error(
      "Cannot load snake without a snake ID."
    );
  }

  const snakeRef =
    doc(
      db,
      "users",
      uid,
      "snakes",
      snakeId
    );

  console.log(
    "Tiny Titans: getUserSnake",
    {
      uid,
      snakeId,
      path:
        `users/${uid}/snakes/${snakeId}`,
    }
  );

  try {
    const snapshot =
      await getDoc(
        snakeRef
      );

    // =====================================================
    // TEMPORARY PHONE DIAGNOSTIC
    // =====================================================
    //
    // This tells us EXACTLY what Firestore returned on the
    // device attempting to load the snake.
    //
    // DO NOT REMOVE THIS YET.
    // We need this output to diagnose the phone problem.
    //
    // =====================================================

    console.log(
      "Tiny Titans: PHONE SNAKE LOOKUP RESULT",
      {
        uid,
        snakeId,
        path:
          `users/${uid}/snakes/${snakeId}`,
        exists:
          snapshot.exists(),
        documentId:
          snapshot.id,
        data:
          snapshot.exists()
            ? snapshot.data()
            : null,
      }
    );

    // =====================================================
    // SNAKE DOES NOT EXIST
    // =====================================================

    if (
      !snapshot.exists()
    ) {
      console.warn(
        "Tiny Titans: snake does not exist",
        {
          uid,
          snakeId,
          path:
            `users/${uid}/snakes/${snakeId}`,
        }
      );

      return null;
    }

    // =====================================================
    // SNAKE FOUND
    // =====================================================

    const firestoreData =
      snapshot.data();

    console.log(
      "Tiny Titans: snake document found",
      {
        uid,
        snakeId,
        documentId:
          snapshot.id,
        name:
          firestoreData?.name,
        ownerId:
          firestoreData?.ownerId,
      }
    );

    const migratedSnake =
      migrateSnake({
        ...(firestoreData as Partial<Snake>),

        id:
          snapshot.id,
      });

    console.log(
      "Tiny Titans: snake migrated successfully",
      {
        uid,
        snakeId:
          snapshot.id,
        name:
          migratedSnake.name,
        weight:
          migratedSnake.weight,
        weightHistoryCount:
          migratedSnake.weightHistory?.length ?? 0,
      }
    );

    return migratedSnake;
  } catch (
    error
  ) {
    console.error(
      "Tiny Titans: unable to get snake",
      error
    );

    console.error(
      "Tiny Titans: getUserSnake diagnostic",
      {
        uid,
        snakeId,
        path:
          `users/${uid}/snakes/${snakeId}`,
        errorCode:
          (
            error &&
            typeof error === "object" &&
            "code" in error
          )
            ? (
                error as {
                  code?: string;
                }
              ).code
            : undefined,
        errorMessage:
          error instanceof Error
            ? error.message
            : String(error),
      }
    );

    throw new Error(
      getFirestoreErrorMessage(
        error
      )
    );
  }
}

// =========================================================
// CREATE USER SNAKE
// =========================================================

export async function createUserSnake(
  uid: string,
  snake: Snake
): Promise<Snake> {
  if (!uid) {
    throw new Error(
      "Cannot create snake without a user ID."
    );
  }

  const snakeRef =
    doc(
      snakesCollection(
        uid
      )
    );

  const snakeToSave =
    prepareSnakeForFirestore(
      snake,
      snakeRef.id,
      uid
    );

  console.log(
    "Tiny Titans: CREATE START",
    {
      uid,
      snakeId:
        snakeRef.id,
      name:
        snakeToSave.name,
      path:
        `users/${uid}/snakes/${snakeRef.id}`,
    }
  );

  try {
    await setDoc(
      snakeRef,
      {
        ...snakeToSave,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    );
  } catch (
    error
  ) {
    console.error(
      "========================================="
    );

    console.error(
      "Tiny Titans: CREATE FIRESTORE FAILED"
    );

    console.error(
      {
        error,
        uid,
        snakeId:
          snakeRef.id,
        path:
          `users/${uid}/snakes/${snakeRef.id}`,
      }
    );

    console.error(
      "========================================="
    );

    throw new Error(
      `Unable to save your snake: ${getFirestoreErrorMessage(
        error
      )}`
    );
  }

  console.log(
    "Tiny Titans: CREATE SUCCESS",
    snakeRef.id
  );

  return migrateSnake({
    ...(snakeToSave as Partial<Snake>),

    id:
      snakeRef.id,
  });
}

// =========================================================
// UPDATE USER SNAKE
// =========================================================

export async function updateUserSnake(
  uid: string,
  snake: Snake
): Promise<Snake> {
  if (!uid) {
    throw new Error(
      "Cannot update snake without a user ID."
    );
  }

  if (!snake.id) {
    throw new Error(
      "Cannot update snake without a snake ID."
    );
  }

  const snakeId =
    snake.id;

  const snakeRef =
    doc(
      db,
      "users",
      uid,
      "snakes",
      snakeId
    );

  const snakeToSave =
    prepareSnakeForFirestore(
      snake,
      snakeId,
      uid
    );

  console.log(
    "Tiny Titans: UPDATE START",
    {
      uid,
      snakeId,
      name:
        snakeToSave.name,
      path:
        `users/${uid}/snakes/${snakeId}`,
    }
  );

  try {
    /*
     * We deliberately use setDoc with merge here.
     *
     * This means the document can be updated without
     * first performing another Firestore read.
     */

    await setDoc(
      snakeRef,
      {
        ...snakeToSave,

        updatedAt:
          serverTimestamp(),
      },
      {
        merge:
          true,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "========================================="
    );

    console.error(
      "Tiny Titans: UPDATE FIRESTORE FAILED"
    );

    console.error(
      {
        error,
        uid,
        snakeId,
        path:
          `users/${uid}/snakes/${snakeId}`,
      }
    );

    console.error(
      "========================================="
    );

    throw new Error(
      `Unable to update your snake: ${getFirestoreErrorMessage(
        error
      )}`
    );
  }

  console.log(
    "Tiny Titans: UPDATE SUCCESS",
    snakeId
  );

  return migrateSnake({
    ...(snakeToSave as Partial<Snake>),

    id:
      snakeId,
  });
}

// =========================================================
// CREATE OR UPDATE
// =========================================================

export async function saveUserSnake(
  uid: string,
  snake: Snake
): Promise<Snake> {
  if (!uid) {
    throw new Error(
      "Cannot save snake without a user ID."
    );
  }

  if (!snake) {
    throw new Error(
      "Cannot save an empty snake record."
    );
  }

  console.log(
    "Tiny Titans: saveUserSnake",
    {
      uid,
      snakeId:
        snake.id ??
        "(new)",
      name:
        snake.name,
    }
  );

  if (snake.id) {
    return updateUserSnake(
      uid,
      snake
    );
  }

  return createUserSnake(
    uid,
    snake
  );
}

// =========================================================
// DELETE SNAKE
// =========================================================

export async function deleteUserSnake(
  uid: string,
  snakeId: string
): Promise<void> {
  if (!uid) {
    throw new Error(
      "Cannot delete snake without a user ID."
    );
  }

  if (!snakeId) {
    throw new Error(
      "Cannot delete snake without a snake ID."
    );
  }

  const snakeRef =
    doc(
      db,
      "users",
      uid,
      "snakes",
      snakeId
    );

  try {
    await deleteDoc(
      snakeRef
    );

    console.log(
      "Tiny Titans: snake deleted",
      snakeId
    );
  } catch (
    error
  ) {
    console.error(
      "Tiny Titans: unable to delete snake",
      error
    );

    throw new Error(
      `Unable to delete this snake: ${getFirestoreErrorMessage(
        error
      )}`
    );
  }
}

// =========================================================
// MIGRATE OLD LOCAL STORAGE SNAKES
// =========================================================

export async function migrateLocalSnakesToFirestore(
  uid: string
): Promise<number> {
  if (!uid) {
    return 0;
  }

  let saved:
    string | null =
    null;

  try {
    saved =
      localStorage.getItem(
        "tinyTitansSnakes"
      );
  } catch (
    error
  ) {
    console.warn(
      "Tiny Titans: localStorage unavailable during migration",
      error
    );

    return 0;
  }

  if (!saved) {
    console.log(
      "Tiny Titans: no old local snakes found."
    );

    return 0;
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        saved
      );
  } catch (
    error
  ) {
    console.error(
      "Tiny Titans: old snake data could not be parsed.",
      error
    );

    throw new Error(
      "The old snake data could not be read."
    );
  }

  if (
    !Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      "The old snake data is invalid."
    );
  }

  let migratedCount =
    0;

  for (
    const item of parsed
  ) {
    const oldSnake =
      migrateSnake(
        item as Partial<Snake>
      );

    const snakeId =
      oldSnake.id;

    if (!snakeId) {
      console.warn(
        "Tiny Titans: old snake has no ID, skipping migration",
        oldSnake.name
      );

      continue;
    }

    const snakeRef =
      doc(
        db,
        "users",
        uid,
        "snakes",
        snakeId
      );

    try {
      const existing =
        await getDoc(
          snakeRef
        );

      if (
        existing.exists()
      ) {
        console.log(
          "Tiny Titans: snake already exists in Firestore, skipping",
          snakeId
        );

        continue;
      }

      const snakeToSave =
        prepareSnakeForFirestore(
          oldSnake,
          snakeRef.id,
          uid
        );

      await setDoc(
        snakeRef,
        {
          ...snakeToSave,

          migratedFromLocalStorage:
            true,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      migratedCount++;

      console.log(
        "Tiny Titans: migrated old snake",
        {
          name:
            oldSnake.name,

          snakeId:
            snakeRef.id,
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Tiny Titans: failed migrating snake",
        {
          error,
          snake:
            oldSnake.name,
          snakeId,
        }
      );

      throw new Error(
        `Unable to migrate ${
          oldSnake.name ||
          "a snake"
        }: ${getFirestoreErrorMessage(
          error
        )}`
      );
    }
  }

  console.log(
    `Tiny Titans: migration complete. ${migratedCount} snake(s) migrated.`
  );

  return migratedCount;
}