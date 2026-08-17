import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_SOURCE_DATA_URL_SIZE = 700_000;

function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",", 2);
  if (!header || !encoded) throw new Error("The snake photo data is invalid.");
  const match = header.match(/^data:([^;]+);base64$/i);
  if (!match) throw new Error("The snake photo format is invalid.");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] });
}

/**
 * Canonical photo storage boundary for Snake records.
 * Existing URLs are returned unchanged. Legacy data URLs are uploaded to
 * Firebase Storage and the resulting download URL is returned for Firestore.
 */
export async function ensureSnakePhotoReference(uid: string, snakeId: string, photo: string): Promise<string> {
  if (!photo || !isDataUrl(photo)) return photo;
  if (photo.length > MAX_SOURCE_DATA_URL_SIZE) {
    throw new Error("This snake photo is too large to migrate safely. Please choose a smaller image.");
  }

  const blob = dataUrlToBlob(photo);
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `snakePhotos/${uid}/${snakeId}/profile.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "image/jpeg",
    customMetadata: {
      uploadedBy: uid,
      source: "legacy-firestore-data-url-migration",
      snakeId,
    },
  });

  return getDownloadURL(storageRef);
}

export async function deleteSnakePhotoReference(storagePath: string): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}

export function isLegacySnakePhoto(value: string | undefined): boolean {
  return Boolean(value && isDataUrl(value));
}
