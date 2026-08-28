import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

export type ReptileRoomAssetKind = "wall" | "logo" | "room-photo";

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the room image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress the room image.")), "image/jpeg", 0.82));
}

export async function uploadReptileRoomAsset(uid: string, roomId: string, kind: ReptileRoomAssetKind, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Room visual assets must be image files.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Room images must be 15 MB or smaller.");
  const blob = await compressImage(file);
  const extension = kind === "logo" ? "jpg" : "jpg";
  const path = `users/${uid}/reptileRooms/${roomId}/assets/${kind}-${Date.now()}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg", cacheControl: "public,max-age=31536000" });
  return getDownloadURL(storageRef);
}
