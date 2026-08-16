import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";

// Existing service implementation retained; explicit callback return type fixes the strict TypeScript gate.
export async function __morphSubmissionCleanupTypeGate(uploaded: boolean, storageRef: ReturnType<typeof ref>): Promise<void> {
  if (uploaded) await deleteObject(storageRef).catch((): void => undefined);
}
