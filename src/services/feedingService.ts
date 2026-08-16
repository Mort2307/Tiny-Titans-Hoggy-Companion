import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import type { FeedingRecord } from "../types/Feeding";
import { db } from "../firebase/config";

function feedingsCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "feedings");
}

function getFirestoreErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const firebaseError = error as { code?: string; message?: string };
    switch (firebaseError.code) {
      case "permission-denied": return "Firebase permission denied. Your Firestore security rules are blocking this feeding record.";
      case "unauthenticated": return "Firebase says you are not authenticated. Please log out and log back in.";
      case "unavailable": return "Firebase is temporarily unavailable. Please check your internet connection.";
      case "failed-precondition": return "Firebase could not complete the request because a required database configuration is missing.";
      case "invalid-argument": return "Firebase rejected the feeding data because one or more values are invalid.";
      case "not-found": return "The requested feeding record could not be found.";
      default: if (firebaseError.message) return firebaseError.message;
    }
  }
  if (error instanceof Error) return error.message;
  return "Unable to save the feeding record.";
}

export async function getSnakeFeedings(uid: string, snakeId: string): Promise<FeedingRecord[]> {
  if (!uid) throw new Error("Cannot load feedings without a user ID.");
  if (!snakeId) throw new Error("Cannot load feedings without a snake ID.");
  try {
    const snapshot = await getDocs(query(feedingsCollection(uid, snakeId), orderBy("date", "desc")));
    return snapshot.docs.map((document) => ({ id: document.id, snakeId, ...document.data() } as FeedingRecord));
  } catch (error) {
    console.error("Tiny Titans: unable to load feeding history", error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function saveSnakeFeeding(uid: string, feeding: FeedingRecord): Promise<FeedingRecord> {
  if (!uid) throw new Error("Cannot save feeding without a user ID.");
  if (!feeding.snakeId) throw new Error("Cannot save feeding without a snake ID.");
  if (!feeding.id) throw new Error("Cannot save feeding without a feeding ID.");
  const feedingRef = doc(db, "users", uid, "snakes", feeding.snakeId, "feedings", feeding.id);
  try {
    await setDoc(feedingRef, { ...feeding }, { merge: true });
    const canonical = await getDoc(feedingRef);
    if (!canonical.exists()) throw new Error("Firebase accepted the feeding write but the record could not be read back.");
    return { id: canonical.id, snakeId: feeding.snakeId, ...canonical.data() } as FeedingRecord;
  } catch (error) {
    console.error("Tiny Titans: unable to save feeding", error);
    throw new Error(`Unable to save this feeding: ${getFirestoreErrorMessage(error)}`);
  }
}

export async function deleteSnakeFeeding(uid: string, snakeId: string, feedingId: string): Promise<void> {
  if (!uid) throw new Error("Cannot delete feeding without a user ID.");
  if (!snakeId) throw new Error("Cannot delete feeding without a snake ID.");
  if (!feedingId) throw new Error("Cannot delete feeding without a feeding ID.");
  try {
    await deleteDoc(doc(db, "users", uid, "snakes", snakeId, "feedings", feedingId));
    const deleted = await getDoc(doc(db, "users", uid, "snakes", snakeId, "feedings", feedingId));
    if (deleted.exists()) throw new Error("Firebase delete completed but the feeding record is still readable.");
  } catch (error) {
    console.error("Tiny Titans: unable to delete feeding", error);
    throw new Error(`Unable to delete this feeding: ${getFirestoreErrorMessage(error)}`);
  }
}
