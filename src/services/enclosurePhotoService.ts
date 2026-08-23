import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tiny Titans could not prepare that image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Tiny Titans could not compress that image.")), "image/jpeg", JPEG_QUALITY));
}

export async function uploadEnclosurePhoto(uid: string, snakeId: string, file: File): Promise<string> {
  if (!uid || !snakeId) throw new Error("A signed-in snake owner is required to upload an enclosure photo.");
  const blob = await compressImage(file);
  const storageRef = ref(storage, `users/${uid}/snakes/${snakeId}/enclosure-photo.jpg`);
  await uploadBytes(storageRef, blob, {
    contentType: "image/jpeg",
    customMetadata: { uploadedBy: uid, snakeId, source: "reptile-room" },
  });
  return getDownloadURL(storageRef);
}

export async function deleteEnclosurePhoto(uid: string, snakeId: string): Promise<void> {
  const storageRef = ref(storage, `users/${uid}/snakes/${snakeId}/enclosure-photo.jpg`);
  try { await deleteObject(storageRef); } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code !== "storage/object-not-found") throw error;
  }
}