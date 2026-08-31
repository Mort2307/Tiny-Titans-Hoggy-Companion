import { addDoc, collection, getDocs, orderBy, query, updateDoc, doc, limit } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase/config";
import type { KeeperObservation, KeeperObservationMedia } from "../types/keeperObservation";

export const MAX_OBSERVATION_MEDIA_BYTES = 100 * 1024 * 1024;
export const MAX_OBSERVATION_MEDIA_ITEMS = 4;
export const ALLOWED_OBSERVATION_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const ALLOWED_OBSERVATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function isAllowedMedia(file: File) {
  return [...ALLOWED_OBSERVATION_VIDEO_TYPES, ...ALLOWED_OBSERVATION_IMAGE_TYPES].includes(file.type as never);
}

export function validateObservationMedia(files: File[]) {
  if (!files.length) throw new Error("Add at least one photo or short video to support this observation.");
  if (files.length > MAX_OBSERVATION_MEDIA_ITEMS) throw new Error(`You can add up to ${MAX_OBSERVATION_MEDIA_ITEMS} media files.`);
  for (const file of files) {
    if (!isAllowedMedia(file)) throw new Error(`${file.name} is not a supported image or video format.`);
    if (file.size > MAX_OBSERVATION_MEDIA_BYTES) throw new Error(`${file.name} is larger than 100 MB. Please trim or compress it first.`);
  }
}

export async function uploadObservationMedia(uid: string, observationId: string, files: File[], onProgress?: (percent: number) => void): Promise<KeeperObservationMedia[]> {
  validateObservationMedia(files);
  const results: KeeperObservationMedia[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `keeper-observations/${uid}/${observationId}/${crypto.randomUUID()}-${safeName}`;
    const upload = uploadBytesResumable(ref(storage, path), file, { contentType: file.type, customMetadata: { ownerUid: uid, purpose: "keeper-observation" } });
    await new Promise<void>((resolve, reject) => {
      upload.on("state_changed", (snapshot) => {
        const completedFiles = index;
        const current = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.(((completedFiles + current) / files.length) * 100);
      }, reject, () => resolve());
    });
    let durationSeconds: number | undefined;
    if (file.type.startsWith("video/")) durationSeconds = await getVideoDuration(file);
    results.push({ id: crypto.randomUUID(), kind: file.type.startsWith("video/") ? "video" : "image", path, fileName: file.name, contentType: file.type, sizeBytes: file.size, durationSeconds, createdAt: new Date().toISOString() });
  }
  onProgress?.(100);
  return results;
}

function getVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = Number.isFinite(video.duration) ? video.duration : undefined; URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    video.src = url;
  });
}

export async function createKeeperObservation(input: Omit<KeeperObservation, "id" | "media"> & { media?: KeeperObservationMedia[] }) {
  if (!input.educationalConsent) throw new Error("Educational use permission is required before submitting an observation.");
  if (!input.title.trim() || !input.observedBehaviour.trim()) throw new Error("Give the observation a clear title and observed behaviour.");
  if (!input.description.trim()) throw new Error("Describe what you actually observed, including relevant context.");
  const record = { ...input, title: input.title.trim(), observedBehaviour: input.observedBehaviour.trim(), description: input.description.trim(), media: input.media ?? [], status: "pending" as const, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const created = await addDoc(collection(db, "keeperObservations"), record);
  return created.id;
}

export async function getApprovedKeeperObservations(maxItems = 60): Promise<KeeperObservation[]> {
  const snapshot = await getDocs(query(collection(db, "keeperObservations"), orderBy("submittedAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as KeeperObservation)).filter((item) => item.status === "approved" && item.educationalConsent);
}

export async function getCreatorKeeperObservations(maxItems = 200): Promise<KeeperObservation[]> {
  const snapshot = await getDocs(query(collection(db, "keeperObservations"), orderBy("submittedAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as KeeperObservation));
}

export async function reviewKeeperObservation(input: { observationId: string; status: KeeperObservation["status"]; reviewerUid: string; reviewerNotes: string }) {
  await updateDoc(doc(db, "keeperObservations", input.observationId), { status: input.status, reviewerNotes: input.reviewerNotes.trim(), reviewedAt: new Date().toISOString(), reviewedByUid: input.reviewerUid, updatedAt: new Date().toISOString() });
}

export async function resolveObservationMediaUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}
