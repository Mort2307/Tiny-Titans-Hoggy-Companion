import { collection, doc, getDoc, getDocs, query, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { ShedPhoto, ShedRecord } from "../types/Shed";
import { db, storage } from "../firebase/config";
import { generateId } from "../utils/generateId";

const MAX_PHOTOS = 5;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 1800;
const JPEG_QUALITY = 0.84;

function getShedCollection(uid: string, snakeId: string) {
  return collection(db, "users", uid, "snakes", snakeId, "sheds");
}

function isSupportedImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function prepareImage(file: File): Promise<Blob> {
  if (!file) throw new Error("Please choose an image file.");
  if (!isSupportedImage(file)) throw new Error("Please choose a JPEG, PNG, WebP or supported HEIC/HEIF image.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Each shed photo must be 20 MB or smaller before compression.");

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the shed photo.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Unable to compress the shed photo.")),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  } catch {
    throw new Error("Tiny Titans could not read that image on this device. Try a normal gallery JPEG, PNG or WebP image, or HEIC/HEIF where your browser supports it.");
  }
}

async function uploadShedPhoto(uid: string, snakeId: string, shedId: string, file: File): Promise<ShedPhoto> {
  const compressed = await prepareImage(file);
  const photoId = generateId();
  const storagePath = `users/${uid}/snakes/${snakeId}/sheds/${shedId}/${photoId}.jpg`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  try {
    const url = await getDownloadURL(storageRef);
    return { id: photoId, url, storagePath, name: file.name, uploadedAt: new Date().toISOString() };
  } catch (error) {
    await deleteObject(storageRef).catch(() => undefined);
    throw error instanceof Error ? error : new Error("Unable to prepare the uploaded shed photo.");
  }
}

function toShedRecord(id: string, snakeId: string, data: Record<string, unknown>): ShedRecord {
  return { ...(data as ShedRecord), id, snakeId };
}

async function fetchCanonicalShed(uid: string, snakeId: string, shedId: string): Promise<ShedRecord> {
  const snapshot = await getDoc(doc(getShedCollection(uid, snakeId), shedId));
  if (!snapshot.exists()) throw new Error("Firebase saved the shed but the canonical record could not be reloaded.");
  return toShedRecord(snapshot.id, snakeId, snapshot.data() as Record<string, unknown>);
}

export async function getSnakeSheds(uid: string, snakeId: string): Promise<ShedRecord[]> {
  const snapshot = await getDocs(query(getShedCollection(uid, snakeId)));
  return snapshot.docs
    .map((shedDoc) => toShedRecord(shedDoc.id, snakeId, shedDoc.data() as Record<string, unknown>))
    .filter((shed) => !shed.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveSnakeShed(
  uid: string,
  shed: ShedRecord,
  photosToUpload: File[] = [],
  removedPhotoPaths: string[] = [],
): Promise<ShedRecord> {
  if (photosToUpload.length > MAX_PHOTOS) throw new Error(`You can save up to ${MAX_PHOTOS} shed photos.`);
  if (shed.deletedAt) throw new Error("Deleted shed records cannot be edited.");

  const existingPhotos = shed.photos ?? [];
  const uniqueRemovedPaths = [...new Set(removedPhotoPaths.filter(Boolean))];
  const keptPhotos = existingPhotos.filter((photo) => !uniqueRemovedPaths.includes(photo.storagePath));
  const totalPhotos = keptPhotos.length + photosToUpload.length;
  if (totalPhotos > MAX_PHOTOS) throw new Error(`You can save up to ${MAX_PHOTOS} shed photos.`);

  const shedRef = doc(getShedCollection(uid, shed.snakeId), shed.id);
  const uploadedPaths: string[] = [];
  let firestoreCommitted = false;

  try {
    const uploadedPhotos: ShedPhoto[] = [];
    for (const file of photosToUpload) {
      const photo = await uploadShedPhoto(uid, shed.snakeId, shed.id, file);
      uploadedPhotos.push(photo);
      uploadedPaths.push(photo.storagePath);
    }

    const nextPhotos = [...keptPhotos, ...uploadedPhotos];
    const recordToSave: ShedRecord = {
      ...shed,
      snakeId: shed.snakeId,
      id: shed.id,
      ...(nextPhotos.length ? { photos: nextPhotos } : { photos: [] }),
    };

    await setDoc(shedRef, recordToSave, { merge: true });
    firestoreCommitted = true;
    const canonical = await fetchCanonicalShed(uid, shed.snakeId, shed.id);

    await Promise.all(uniqueRemovedPaths.map(async (storagePath) => {
      await deleteObject(ref(storage, storagePath)).catch(() => undefined);
    }));

    return canonical;
  } catch (error) {
    if (!firestoreCommitted) {
      await Promise.all(uploadedPaths.map(async (storagePath) => {
        await deleteObject(ref(storage, storagePath)).catch(() => undefined);
      }));
    }
    throw error instanceof Error ? error : new Error("Unable to save this shed record.");
  }
}

export async function deleteSnakeShed(uid: string, snakeId: string, shedId: string): Promise<ShedRecord> {
  const shedRef = doc(getShedCollection(uid, snakeId), shedId);
  const deletedAt = new Date().toISOString();
  await setDoc(shedRef, { deletedAt }, { merge: true });
  return fetchCanonicalShed(uid, snakeId, shedId);
}
