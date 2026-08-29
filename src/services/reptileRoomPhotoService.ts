import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.84;

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("Tiny Titans could not decode that image. JPG or PNG photos are recommended."); }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(1, Math.max(bitmap.width, bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Tiny Titans could not prepare that image."); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Tiny Titans could not compress that image.")), "image/jpeg", JPEG_QUALITY));
}

function storageErrorMessage(error: unknown, operation: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code.includes("storage/unauthorized")) return `Vivarium photo ${operation} was blocked by Firebase Storage permissions.`;
  if (code.includes("storage/unauthenticated")) return `Vivarium photo ${operation} requires a signed-in account.`;
  if (code.includes("storage/canceled")) return "Vivarium photo upload was cancelled.";
  if (code.includes("storage/object-not-found")) return "The vivarium photo could not be found in Firebase Storage.";
  if (error instanceof Error && error.message) return error.message;
  return `Vivarium photo ${operation} failed.`;
}

export async function uploadReptileRoomVivariumPhoto(uid: string, roomId: string, slotId: string, file: File): Promise<string> {
  if (!uid || !roomId || !slotId) throw new Error("A signed-in room owner is required to upload a vivarium photo.");
  try {
    const blob = await compressImage(file);
    const storageRef = ref(storage, `users/${uid}/reptileRooms/${roomId}/vivariums/${slotId}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg", customMetadata: { uploadedBy: uid, roomId, slotId, source: "reptile-room-3d" } });
    const url = await getDownloadURL(storageRef);
    return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
  } catch (error) {
    throw new Error(storageErrorMessage(error, "upload"));
  }
}

export async function deleteReptileRoomVivariumPhoto(uid: string, roomId: string, slotId: string): Promise<void> {
  if (!uid || !roomId || !slotId) return;
  try {
    await deleteObject(ref(storage, `users/${uid}/reptileRooms/${roomId}/vivariums/${slotId}.jpg`));
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("storage/object-not-found")) return;
    throw new Error(storageErrorMessage(error, "removal"));
  }
}
