import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedUniversalAnimalPhoto = {
  photoUrl: string;
  storagePath: string;
};

/**
 * Store a versioned account-owned profile photo for a universal animal.
 * Versioned paths keep the existing profile image intact until Firestore saves
 * the replacement URL successfully.
 */
export async function uploadUniversalAnimalPhoto(
  ownerUid: string,
  actorUid: string,
  animalId: string,
  file: File,
): Promise<UploadedUniversalAnimalPhoto> {
  if (!ownerUid || !actorUid || !animalId) {
    throw new Error("Tiny Titans could not identify the animal photo owner. Refresh the animal record and try again.");
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Choose a JPEG, PNG or WebP image for this animal.");
  }
  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Animal photos must be larger than 0 bytes and no bigger than 5 MB.");
  }

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `animalPhotos/${ownerUid}/${animalId}/profile-${uploadId}`;
  const photoRef = ref(storage, storagePath);
  await uploadBytes(photoRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: actorUid,
      ownerUid,
      animalId,
      source: "universal-animal-profile",
    },
  });
  return { photoUrl: await getDownloadURL(photoRef), storagePath };
}

/** Delete only an earlier photo belonging to this exact animal and owner. */
export async function deletePreviousUniversalAnimalPhoto(
  ownerUid: string,
  animalId: string,
  previousPhotoUrl: string,
): Promise<void> {
  if (!ownerUid || !animalId || !previousPhotoUrl) return;

  let storagePath = "";
  try {
    const parsed = new URL(previousPhotoUrl);
    if (parsed.hostname !== "firebasestorage.googleapis.com") return;
    const encodedPath = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
    if (!encodedPath) return;
    storagePath = decodeURIComponent(encodedPath);
  } catch {
    return;
  }

  const ownedPrefix = `animalPhotos/${ownerUid}/${animalId}/profile-`;
  if (!storagePath.startsWith(ownedPrefix)) return;

  await deleteObject(ref(storage, storagePath));
}
