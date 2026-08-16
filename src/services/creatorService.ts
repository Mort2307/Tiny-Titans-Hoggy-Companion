import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { deleteObject, getBytes, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";
import type { ReportIssue } from "../types/reportIssue";
import type { Feedback } from "../types/feedback";
import type { ApprovedMorphImage, MorphImageSubmission, MorphSubmissionStatus } from "../types/morphSubmission";
import { getCanonicalGlobalStats } from "./trackerStatsService";

export type FounderApplication = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  reason: string;
  experience: string;
  contribution: string;
  status: "Pending" | "Approved" | "Declined";
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GlobalStats = {
  registeredUsers: number;
  activeUsers: number;
  snakeProfiles: number;
  mealsFed: number;
  weightLogs: number;
  totalWeightKg: number;
  totalWeightLb: number;
  shedsLogged: number;
  totalShedLengthCm: number;
  totalShedLengthIn: number;
  geneticsCalculations: number;
};

export async function submitFounderApplication(input: Omit<FounderApplication, "id" | "status" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "founderApplications"), { ...input, status: "Pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function submitFeedback(input: Omit<Feedback, "id" | "createdAt" | "updatedAt">) {
  if (!input.userId) throw new Error("You must be signed in to send feedback.");
  if (!input.title.trim() || !input.message.trim()) throw new Error("Please provide a title and feedback message.");
  const ref = await addDoc(collection(db, "feedback"), {
    ...input,
    title: input.title.trim(),
    message: input.message.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCreatorFeedback(): Promise<Feedback[]> {
  const snapshot = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Feedback, "id">) }));
}

const normaliseIssuePart = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
async function issueFingerprint(parts: string[]) { const source = parts.map(normaliseIssuePart).filter(Boolean).join("|"); const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16); }
function issueToken() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const values = new Uint32Array(8); crypto.getRandomValues(values); return `TT-${Array.from(values, (value) => chars[value % chars.length]).join("").slice(0, 4)}-${Array.from(values, (value) => chars[value % chars.length]).join("").slice(4, 8)}`; }

async function prepareImage(file: File): Promise<Blob> {
  if (file.size <= 8 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the image for upload.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (!compressed) throw new Error("Unable to compress the image.");
    return compressed;
  } catch (error) {
    console.warn("Tiny Titans: createImageBitmap failed for bug evidence; trying browser image fallback.", error);

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("This image format could not be prepared for upload. Try JPG or PNG."));
        element.src = objectUrl;
      });

      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the image for upload.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
      if (!compressed) throw new Error("Unable to compress the image.");
      return compressed;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function submitIssueReport(input: Omit<ReportIssue, "id" | "createdAt" | "updatedAt" | "issueToken" | "issueFingerprint"> & { file?: File | null }) {
  const { file, ...report } = input;
  if (!report.userId) throw new Error("You must be signed in to submit a bug report.");

  const fingerprint = await issueFingerprint([report.category, report.source, report.title, report.description]);
  const token = issueToken();
  let attachment: ReportIssue["attachment"];
  let uploadedPath: string | undefined;

  try {
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Please attach an image or video.");

      if (file.size > (isVideo ? 25 : 8) * 1024 * 1024) {
        throw new Error(isVideo ? "Video attachments must be 25 MB or smaller." : "Image attachments must be 8 MB or smaller.");
      }

      const blob = isImage ? await prepareImage(file) : file;
      const evidenceId = crypto.randomUUID();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPath = `issueEvidence/${report.userId}/${evidenceId}/${isImage ? "evidence.jpg" : safeFileName}`;
      const evidenceRef = ref(storage, uploadedPath);

      await uploadBytes(evidenceRef, blob, {
        contentType: isImage ? "image/jpeg" : (file.type || "application/octet-stream"),
        customMetadata: {
          uploadedBy: report.userId,
          evidenceType: isImage ? "bug-image" : "bug-video",
        },
      });

      attachment = {
        path: uploadedPath,
        type: isImage ? "image" : "video",
        sizeBytes: blob.size,
      };
    }

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
    const message = error instanceof Error ? error.message : "Unable to submit the bug report.";
    throw new Error(file && !message ? "The bug report could not be submitted with its attachment." : message);
  }
}

export async function getCreatorReports(): Promise<ReportIssue[]> { const snapshot = await getDocs(query(collection(db, "issueReports"), orderBy("createdAt", "desc"))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReportIssue, "id">) })); }
export async function getUserIssueReports(uid: string): Promise<ReportIssue[]> { const snapshot = await getDocs(query(collection(db, "issueReports"), where("userId", "==", uid))); const reports = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReportIssue, "id">) })); return reports.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))); }
export async function getIssueAttachmentUrl(path: string): Promise<string> { return getDownloadURL(ref(storage, path)); }
export type IssueResolution = { resolution?: string; fixedVersion?: string; creatorMessage?: string };
export async function updateCreatorReport(reportId: string, status: ReportIssue["status"], resolution?: IssueResolution, reviewerUid?: string) { const reportRef = doc(db, "issueReports", reportId); const payload: Record<string, unknown> = { status, updatedAt: serverTimestamp() }; if (reviewerUid) payload.reviewedBy = reviewerUid; if (resolution?.resolution !== undefined) payload.resolution = resolution.resolution.trim() || null; if (resolution?.fixedVersion !== undefined) payload.fixedVersion = resolution.fixedVersion.trim() || null; if (resolution?.creatorMessage !== undefined) payload.creatorMessage = resolution.creatorMessage.trim() || null; if (status === "Resolved") payload.resolvedAt = serverTimestamp(); await updateDoc(reportRef, payload); }
export async function getFounderApplications(): Promise<FounderApplication[]> { const snapshot = await getDocs(query(collection(db, "founderApplications"), orderBy("createdAt", "desc"))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderApplication, "id">) })); }
export async function updateFounderApplication(id: string, status: FounderApplication["status"]) { await updateDoc(doc(db, "founderApplications", id), { status, updatedAt: serverTimestamp() }); }
export async function getUserCount(): Promise<number> { return (await getDocs(collection(db, "users"))).size; }
export async function getGlobalStats(): Promise<GlobalStats> { return getCanonicalGlobalStats(); }
export async function getMorphImageSubmissions(): Promise<MorphImageSubmission[]> { const snapshot = await getDocs(query(collection(db, "morphImageSubmissions"), orderBy("submittedAt", "desc"))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MorphImageSubmission, "id">) })); }
export async function updateMorphSubmissionStatus(submissionId: string, status: MorphSubmissionStatus, reviewerUid?: string, rejectionReason?: string) { await updateDoc(doc(db, "morphImageSubmissions", submissionId), { status, reviewedAt: serverTimestamp(), reviewedBy: reviewerUid ?? null, rejectionReason: rejectionReason ?? null }); }
export async function approveMorphImageSubmission(submission: MorphImageSubmission, reviewerUid?: string): Promise<ApprovedMorphImage> { if (!submission.morphId) throw new Error("This submission has no canonical morph ID."); if (submission.status !== "Pending" && submission.status !== "NeedsInfo") throw new Error("This submission is no longer awaiting approval."); const sourceRef = ref(storage, submission.attachment.path); const approvedPath = `morphLibrary/${submission.morphId}/community/${submission.id}.jpg`; const imageBytes = await getBytes(sourceRef, 12 * 1024 * 1024); await uploadBytes(ref(storage, approvedPath), imageBytes, { contentType: "image/jpeg" }); const approvedImageUrl = await getDownloadURL(ref(storage, approvedPath)); try { const approvedDoc = await addDoc(collection(db, "approvedMorphImages"), { morphId: submission.morphId, morphName: submission.morphName, imageUrl: approvedImageUrl, storagePath: approvedPath, sourceStoragePath: submission.attachment.path, creditType: submission.creditType, creditName: submission.creditName ?? null, creditSocial: submission.creditSocial ?? null, sourceSubmissionId: submission.id, approvedAt: serverTimestamp(), approvedBy: reviewerUid ?? null }); await updateDoc(doc(db, "morphImageSubmissions", submission.id), { status: "Approved", reviewedAt: serverTimestamp(), reviewedBy: reviewerUid ?? null, approvedImageId: approvedDoc.id }); await deleteObject(sourceRef).catch(() => undefined); return { id: approvedDoc.id, morphId: submission.morphId, morphName: submission.morphName, imageUrl: approvedImageUrl, storagePath: approvedPath, creditType: submission.creditType, creditName: submission.creditName, creditSocial: submission.creditSocial, sourceSubmissionId: submission.id, approvedAt: undefined, approvedBy: reviewerUid }; } catch (error) { await deleteObject(ref(storage, approvedPath)).catch(() => undefined); throw error; } }
export async function rejectMorphImageSubmission(submissionId: string, storagePath?: string, reviewerUid?: string, reason?: string) { if (storagePath) await deleteObject(ref(storage, storagePath)).catch(() => undefined); await updateDoc(doc(db, "morphImageSubmissions", submissionId), { status: "Rejected", reviewedAt: serverTimestamp(), reviewedBy: reviewerUid ?? null, rejectionReason: reason ?? null }); }
export async function getApprovedMorphImages(morphId?: string): Promise<ApprovedMorphImage[]> { const snapshot = await getDocs(query(collection(db, "approvedMorphImages"), orderBy("approvedAt", "desc"))); const images = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ApprovedMorphImage, "id">) })); return morphId ? images.filter((image) => image.morphId === morphId) : images; }
