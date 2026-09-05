import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import type { FeedingRecord } from "../types/Feeding";
import { db } from "../firebase/config";
import { advanceFeedingScheduleAfterFeed } from "./feedingScheduleService";
import { resolveDataOwnerUid } from "./familyService";
import { requestFamilyMutation } from "./familyPermissionsService";

function feedingsCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "feedings");
}

function getFirestoreErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const firebaseError = error as { code?: string; message?: string };
    switch (firebaseError.code) {
      case "permission-denied": return "Firebase permission denied. Your Firestore security rules are blocking this feeding record.";
      case "unauthenticated": return "Firebase says you are not authenticated. Please log out and log back in.";
      case "unavailable": return "Firebase is temporarily unavailable. Please check your internet connection and try again.";
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
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  try {
    const snapshot = await getDocs(query(feedingsCollection(dataOwnerUid, snakeId), orderBy("date", "desc")));
    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        snakeId,
        date: typeof data.date === "string" ? data.date : "",
        foodType: data.foodType,
        customFood: data.customFood,
        size: data.size,
        weight: typeof data.weight === "number" ? data.weight : undefined,
        quantity: typeof data.quantity === "number" ? data.quantity : undefined,
        preyCategory: data.preyCategory,
        feedingMethod: data.feedingMethod,
        response: data.response,
        notes: data.notes,
      } as FeedingRecord;
    });
  } catch (error) {
    console.error("Tiny Titans: unable to load feeding history", error);
    throw new Error(getFirestoreErrorMessage(error), { cause: error });
  }
}

export async function saveSnakeFeeding(uid: string, feeding: FeedingRecord): Promise<FeedingRecord> {
  if (!uid) throw new Error("Cannot save feeding without a user ID.");
  if (!feeding.snakeId) throw new Error("Cannot save feeding without a snake ID.");
  if (!feeding.id) throw new Error("Cannot save feeding without a feeding ID.");
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  const feedingRef = doc(db, "users", dataOwnerUid, "snakes", feeding.snakeId, "feedings", feeding.id);
  const existing = await getDocs(query(feedingsCollection(dataOwnerUid, feeding.snakeId)));
  const isUpdate = existing.docs.some((item) => item.id === feeding.id);
  await requestFamilyMutation({
    requesterUid: uid,
    requesterName: uid,
    area: "feeding",
    action: isUpdate ? "edit" : "create",
    title: "Update feeding record",
    description: isUpdate ? "A family member wants to change a shared feeding record." : "A family member wants to add a feeding record to the shared tracker.",
    targetPath: `users/${dataOwnerUid}/snakes/${feeding.snakeId}/feedings/${feeding.id}`,
    operation: isUpdate ? "update" : "create",
    data: { ...feeding, lastModifiedBy: uid },
  });
  try {
    await setDoc(feedingRef, { ...feeding, lastModifiedBy: uid }, { merge: true });
    await advanceFeedingScheduleAfterFeed(dataOwnerUid, feeding.snakeId, feeding.date);
    return feeding;
  } catch (error) {
    console.error("Tiny Titans: unable to save feeding", error);
    throw new Error(`Unable to save this feeding: ${getFirestoreErrorMessage(error)}`, { cause: error });
  }
}

export async function deleteSnakeFeeding(uid: string, snakeId: string, feedingId: string): Promise<void> {
  if (!uid) throw new Error("Cannot delete feeding without a user ID.");
  if (!snakeId) throw new Error("Cannot delete feeding without a snake ID.");
  if (!feedingId) throw new Error("Cannot delete feeding without a feeding ID.");
  const dataOwnerUid = await resolveDataOwnerUid(uid);
  const targetPath = `users/${dataOwnerUid}/snakes/${snakeId}/feedings/${feedingId}`;
  await requestFamilyMutation({
    requesterUid: uid,
    requesterName: uid,
    area: "feeding",
    action: "delete",
    title: "Delete feeding record",
    description: "A family member wants to permanently remove a feeding record.",
    targetPath,
    operation: "delete",
  });
  try {
    await deleteDoc(doc(db, "users", dataOwnerUid, "snakes", snakeId, "feedings", feedingId));
  } catch (error) {
    console.error("Tiny Titans: unable to delete feeding", error);
    throw new Error(`Unable to delete this feeding: ${getFirestoreErrorMessage(error)}`, { cause: error });
  }
}
