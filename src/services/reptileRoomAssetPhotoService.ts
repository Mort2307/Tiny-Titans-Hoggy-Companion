import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.84;

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(1, Math.max(bitmap.width, bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Tiny Titans could not prepare that image."); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Tiny Titans could not compress that image.")), "image/jpeg", JPEG_QUALITY));
}

function assetPhotoRef(uid: string, roomId: string, objectId: string) {
  return ref(storage, `users/${uid}/reptileRooms/${roomId}/assets/room-photo-${objectId}.jpg`);
}

export async function uploadReptileRoomAssetPhoto(uid: string, roomId: string, objectId: string, file: File): Promise<string> {
  if (!uid || !roomId || !objectId) throw new Error("A signed-in room owner is required to upload an asset photo.");
  const blob = await compressImage(file);
  const storageRef = assetPhotoRef(uid, roomId, objectId);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg", cacheControl: "public,max-age=31536000", customMetadata: { uploadedBy: uid, roomId, objectId, source: "reptile-room-3d-asset" } });
  const url = await getDownloadURL(storageRef);
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

export async function deleteReptileRoomAssetPhoto(uid: string, roomId: string, objectId: string): Promise<void> {
  if (!uid || !roomId || !objectId) return;
  try { await deleteObject(assetPhotoRef(uid, roomId, objectId)); }
  catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code.includes("storage/object-not-found")) return;
    throw new Error(error instanceof Error ? error.message : "Unable to remove the asset photo.", { cause: error });
  }
}
