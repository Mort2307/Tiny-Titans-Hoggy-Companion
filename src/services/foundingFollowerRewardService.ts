import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db, app, storage } from "../firebase/config";
import type { FoundingFollowerPlatform } from "../config/foundingFollowerReward";

export type FoundingFollowerClaimStatus = "pending" | "processing" | "approved" | "rejected";

export type FoundingFollowerClaim = {
  id: string;
  userId: string;
  campaignId: string;
  campaignName: string;
  platform: FoundingFollowerPlatform;
  screenshotPath: string;
  screenshotContentType: string;
  screenshotSizeBytes: number;
  status: FoundingFollowerClaimStatus;
  rejectionReason?: string;
  reviewerNotes?: string;
  submittedAt?: unknown;
  reviewedAt?: unknown;
  approvedAt?: unknown;
  trialExpiresAt?: unknown;
  notificationRequired?: boolean;
  notificationSentAt?: unknown;
};

const functions = getFunctions(app, "europe-west2");
const submitClaimCallable = httpsCallable<{ platform: FoundingFollowerPlatform; screenshotPath: string }, { success: boolean; campaignId: string; status: FoundingFollowerClaimStatus; platform: FoundingFollowerPlatform }>(functions, "submitFoundingFollowerClaim");
const creatorClaimsCallable = httpsCallable<void, { success: boolean; claims: FoundingFollowerClaim[]; summary: { pending: number; approved: number; rejected: number; processing: number }; generatedAt: number }>(functions, "getCreatorFoundingFollowerClaims");
const reviewClaimCallable = httpsCallable<{ targetUid: string; action: "approve" | "reject"; reviewerNotes?: string }, { success: boolean; status: FoundingFollowerClaimStatus; targetUid: string; expiresAt?: number | null }>(functions, "reviewFoundingFollowerClaim");

function extensionFor(file: File): string {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  throw new Error("Please choose a JPG, PNG or WebP screenshot.");
}

export async function submitFoundingFollowerClaim(platform: FoundingFollowerPlatform, file: File) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to submit a Founding Follower claim.");
  if (!file) throw new Error("Please choose your follow screenshot.");
  const extension = extensionFor(file);
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("Screenshots must be 5 MB or smaller.");
  const path = `founding-follower-claims/${user.uid}/proof.${extension}`;
  const storageRef = ref(storage, path);
  let uploaded = false;
  try {
    await uploadBytes(storageRef, file, { contentType: file.type, customMetadata: { campaignId: "founding_follower_pro_30", contributorUid: user.uid, purpose: "follow-verification" } });
    uploaded = true;
    return (await submitClaimCallable({ platform, screenshotPath: path })).data;
  } catch (error) {
    if (uploaded) await deleteObject(storageRef).catch(() => undefined);
    throw error instanceof Error ? error : new Error("Your follow screenshot could not be submitted.");
  }
}

export function subscribeToMyFoundingFollowerClaim(uid: string, callback: (claim: FoundingFollowerClaim | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "foundingFollowerClaims", uid), (snapshot) => {
    callback(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as FoundingFollowerClaim) : null);
  }, () => callback(null));
}

export async function loadFoundingFollowerClaims() {
  return (await creatorClaimsCallable()).data;
}

export async function reviewFoundingFollowerClaim(targetUid: string, action: "approve" | "reject", reviewerNotes = "") {
  return (await reviewClaimCallable({ targetUid, action, reviewerNotes })).data;
}

export async function getFoundingFollowerScreenshotUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}

export function claimDateMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value !== null) {
    const item = value as { toMillis?: unknown; _seconds?: unknown };
    if (typeof item.toMillis === "function") return Number((item.toMillis as () => number)());
    if (typeof item._seconds === "number") return item._seconds * 1000;
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatClaimDate(value: unknown) {
  const millis = claimDateMillis(value);
  return millis ? new Date(millis).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
