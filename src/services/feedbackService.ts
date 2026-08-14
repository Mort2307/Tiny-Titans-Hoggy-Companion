import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { db, app } from "../firebase/config";
import type { FeedbackCategory, FeedbackReport, FeedbackSeverity } from "../types/Feedback";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

async function fingerprint(parts: string[]) {
  const source = parts.map(normalise).filter(Boolean).join("|");
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function token() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  return `TT-${Array.from(values, (value) => chars[value % chars.length]).join("").slice(0, 4)}-${Array.from(values.slice(4), (value) => chars[value % chars.length]).join("").slice(0, 4)}`;
}

async function compressImage(file: File): Promise<Blob> {
  if (file.size <= MAX_IMAGE_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress image.")), "image/jpeg", 0.78));
}

export async function submitFeedback(input: {
  userId: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  whatWereYouDoing: string;
  expected: string;
  actual: string;
  file?: File | null;
}) {
  const issueFingerprint = await fingerprint([input.category, input.severity, input.whatWereYouDoing, input.expected, input.actual]);
  const issueToken = token();
  const id = crypto.randomUUID();
  let attachment: FeedbackReport["attachment"];
  let uploadedPath: string | undefined;

  if (input.file) {
    const isVideo = input.file.type.startsWith("video/");
    const isImage = input.file.type.startsWith("image/");
    if (!isVideo && !isImage) throw new Error("Please attach an image or video.");
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (input.file.size > limit) throw new Error(`That ${isVideo ? "video" : "image"} is too large. Please choose a smaller file.`);

    const blob = isImage ? await compressImage(input.file) : input.file;
    uploadedPath = `feedback/${input.userId}/${id}/${isImage ? "evidence.jpg" : input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storage = getStorage(app);
    const storageRef = ref(storage, uploadedPath);
    await uploadBytes(storageRef, blob, { contentType: isImage ? "image/jpeg" : input.file.type });
    const downloadUrl = await getDownloadURL(storageRef);
    attachment = { path: uploadedPath, type: isImage ? "image" : "video", sizeBytes: blob.size };
    // The URL is deliberately not retained in the historical fingerprint.
    void downloadUrl;
  }

  try {
    await addDoc(collection(db, "feedbackReports"), {
      id,
      issueToken,
      issueFingerprint,
      userId: input.userId,
      category: input.category,
      severity: input.severity,
      whatWereYouDoing: input.whatWereYouDoing.trim(),
      expected: input.expected.trim(),
      actual: input.actual.trim(),
      createdAt: serverTimestamp(),
      status: "open",
      ...(attachment ? { attachment } : {}),
    });
  } catch (error) {
    if (uploadedPath) {
      await deleteObject(ref(getStorage(app), uploadedPath)).catch(() => undefined);
    }
    throw error;
  }

  return { id, issueToken, issueFingerprint };
}
