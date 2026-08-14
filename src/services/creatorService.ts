import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";
import type { ReportIssue } from "../types/reportIssue";
import type { Snake } from "../types/Snake";

export type FounderApplication = {
  id: string; uid: string; email: string; displayName: string; reason: string; experience: string; contribution: string;
  status: "Pending" | "Approved" | "Declined"; createdAt?: unknown; updatedAt?: unknown;
};

export type GlobalStats = {
  registeredUsers: number; activeUsers: number; snakeProfiles: number; mealsFed: number; weightLogs: number;
  totalWeightKg: number; totalWeightLb: number; shedsLogged: number; totalShedLengthCm: number;
  totalShedLengthIn: number; geneticsCalculations: number;
};

export async function submitFounderApplication(input: Omit<FounderApplication, "id" | "status" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "founderApplications"), { ...input, status: "Pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

const normaliseIssuePart = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

async function issueFingerprint(parts: string[]) {
  const source = parts.map(normaliseIssuePart).filter(Boolean).join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function issueToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  const part = Array.from(values, (value) => chars[value % chars.length]).join("");
  return `TT-${part.slice(0, 4)}-${part.slice(4, 8)}`;
}

async function prepareImage(file: File): Promise<Blob> {
  if (file.size <= 8 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress image.")), "image/jpeg", 0.78));
}

export async function submitIssueReport(input: Omit<ReportIssue, "id" | "createdAt" | "updatedAt" | "issueToken" | "issueFingerprint"> & { file?: File | null }) {
  const { file, ...report } = input;
  const fingerprint = await issueFingerprint([report.category, report.source, report.title, report.description]);
  const token = issueToken();
  let attachment: ReportIssue["attachment"];
  let uploadedPath: string | undefined;

  if (file) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) throw new Error("Please attach an image or video.");
    if (file.size > (isVideo ? 25 : 8) * 1024 * 1024) throw new Error(isVideo ? "Video attachments must be 25 MB or smaller." : "Image attachments must be 8 MB or smaller.");
    const blob = isImage ? await prepareImage(file) : file;
    uploadedPath = `issueEvidence/${report.userId ?? "anonymous"}/${crypto.randomUUID()}/${isImage ? "evidence.jpg" : file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await uploadBytes(ref(storage, uploadedPath), blob, { contentType: isImage ? "image/jpeg" : file.type });
    attachment = { path: uploadedPath, type: isImage ? "image" : "video", sizeBytes: blob.size };
  }

  try {
    const refDoc = await addDoc(collection(db, "issueReports"), {
      ...report,
      issueToken: token,
      issueFingerprint: fingerprint,
      attachment: attachment ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: refDoc.id, issueToken: token, issueFingerprint: fingerprint };
  } catch (error) {
    if (uploadedPath) await deleteObject(ref(storage, uploadedPath)).catch(() => undefined);
    throw error;
  }
}

export async function getCreatorReports(): Promise<ReportIssue[]> {
  const snapshot = await getDocs(query(collection(db, "issueReports"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReportIssue, "id">) }));
}

/** Clearing an issue deliberately removes its detailed log and evidence while retaining only the token/fingerprint needed for repeat-issue analytics. */
export async function updateCreatorReport(reportId: string, status: ReportIssue["status"]) {
  const reportRef = doc(db, "issueReports", reportId);
  if (status !== "Cleared") {
    await updateDoc(reportRef, { status, updatedAt: serverTimestamp() });
    return;
  }

  const snapshot = await getDocs(query(collection(db, "issueReports")));
  const match = snapshot.docs.find((item) => item.id === reportId);
  const data = match?.data() as Partial<ReportIssue> | undefined;
  if (data?.attachment?.path) await deleteObject(ref(storage, data.attachment.path)).catch(() => undefined);

  await updateDoc(reportRef, {
    status: "Cleared",
    updatedAt: serverTimestamp(),
    title: deleteField(), description: deleteField(), context: deleteField(), metadata: deleteField(),
    attachment: deleteField(), userId: deleteField(), appVersion: deleteField(),
  });
}

export async function getFounderApplications(): Promise<FounderApplication[]> {
  const snapshot = await getDocs(query(collection(db, "founderApplications"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderApplication, "id">) }));
}

export async function updateFounderApplication(id: string, status: FounderApplication["status"]) {
  await updateDoc(doc(db, "founderApplications", id), { status, updatedAt: serverTimestamp() });
}

export async function getUserCount(): Promise<number> { return (await getDocs(collection(db, "users"))).size; }
function toNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function weightToKg(weight: number, unit: unknown): number { return unit === "kg" ? weight : weight / 1000; }
function shedLengthToCm(length: number): number { return length; }

export async function getGlobalStats(): Promise<GlobalStats> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  let activeUsers = 0; let snakeProfiles = 0; let mealsFed = 0; let weightLogs = 0; let totalWeightKg = 0; let shedsLogged = 0; let totalShedLengthCm = 0;
  const activeCutoff = Date.now() - 15 * 60 * 1000;
  await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    const userData = userDoc.data() as Record<string, unknown>; const lastActive = userData.lastActiveAt;
    if (lastActive && typeof lastActive === "object" && "toMillis" in lastActive && typeof lastActive.toMillis === "function" && lastActive.toMillis() >= activeCutoff) activeUsers += 1;
    const snakesSnapshot = await getDocs(collection(db, "users", userDoc.id, "snakes")); snakeProfiles += snakesSnapshot.size;
    for (const snakeDoc of snakesSnapshot.docs) {
      const snake = snakeDoc.data() as Partial<Snake>; const feedingHistory = Array.isArray(snake.feedingHistory) ? snake.feedingHistory : [];
      mealsFed += feedingHistory.length; const weightHistory = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
      weightLogs += weightHistory.length; for (const record of weightHistory) { const item = record as { weight?: unknown; unit?: unknown }; totalWeightKg += weightToKg(toNumber(item.weight), item.unit); }
      const shedHistory = Array.isArray(snake.shedHistory) ? snake.shedHistory : []; shedsLogged += shedHistory.length;
      for (const record of shedHistory) totalShedLengthCm += shedLengthToCm(toNumber((record as { shedLength?: unknown }).shedLength));
    }
  }));
  return { registeredUsers: usersSnapshot.size, activeUsers, snakeProfiles, mealsFed, weightLogs, totalWeightKg, totalWeightLb: totalWeightKg * 2.2046226218, shedsLogged, totalShedLengthCm, totalShedLengthIn: totalShedLengthCm / 2.54, geneticsCalculations: 0 };
}
