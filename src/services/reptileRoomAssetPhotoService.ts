import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
  if (!context) {
    bitmap.close();
    throw new Error("Tiny Titans could not prepare that image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Tiny Titans could not compress that image.")), "image/jpeg", JPEG_QUALITY);
  });
}

export async function uploadReptileRoomAssetPhoto(uid: string, objectId: string, file: File): Promise<string> {
  if (!uid || !objectId) throw new Error("A signed-in room owner is required to upload an asset photo.");
  const blob = await compressImage(file);
  const storageRef = ref(storage, `users/${uid}/reptileRooms/${objectId}/assets/${objectId}.jpg`);
  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg",
    customMetadata: { uploadedBy: uid, objectId, source: "reptile-room-3d-asset" },
  });
  const url = await getDownloadURL(storageRef);
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}
