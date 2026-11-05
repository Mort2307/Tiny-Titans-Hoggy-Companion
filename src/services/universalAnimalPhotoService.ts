import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Store one account-owned profile photo for a universal animal.
 * A stable object path keeps replacements from accumulating orphaned files.
 */
export async function uploadUniversalAnimalPhoto(uid: string, animalId: string, file: File): Promise<string> {
  if (!uid || !animalId) {
    throw new Error("Tiny Titans could not identify the animal photo owner. Refresh the animal record and try again.");
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Choose a JPEG, PNG or WebP image for this animal.");
  }
  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Animal photos must be larger than 0 bytes and no bigger than 5 MB.");
  }

  const photoRef = ref(storage, `animalPhotos/${uid}/${animalId}/profile`);
  await uploadBytes(photoRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: uid,
      animalId,
      source: "universal-animal-profile",
    },
  });
  return getDownloadURL(photoRef);
}
