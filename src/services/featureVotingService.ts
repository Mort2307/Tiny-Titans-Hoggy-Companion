import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { FeatureRequest, FeatureVotingCategory, FeatureVotingStatus } from "../types/featureVoting";

const featuresCollection = collection(db, "featureRequests");

function millis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
  const parsed = value ? new Date(String(value)).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFeatureRequests(): Promise<FeatureRequest[]> {
  const snapshot = await getDocs(query(featuresCollection, where("visibility", "==", "public")));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<FeatureRequest, "id">) }))
    .sort((a, b) => (b.voteCount - a.voteCount) || (millis(b.createdAt) - millis(a.createdAt)));
}

export async function getUserFeatureVotes(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, "users", uid, "featureVotes"));
  return new Set(snapshot.docs.map((item) => item.id));
}

export async function toggleFeatureVote(featureId: string, uid: string): Promise<boolean> {
  const featureRef = doc(db, "featureRequests", featureId);
  const voteRef = doc(db, "featureRequests", featureId, "votes", uid);
  const userVoteRef = doc(db, "users", uid, "featureVotes", featureId);

  return runTransaction(db, async (transaction) => {
    const [featureSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(featureRef),
      transaction.get(voteRef),
    ]);
    if (!featureSnapshot.exists()) throw new Error("This feature request no longer exists.");
    if (featureSnapshot.data().status === "declined") throw new Error("Declined feature requests cannot be voted on.");

    const currentCount = Number(featureSnapshot.data().voteCount || 0);
    if (voteSnapshot.exists()) {
      transaction.delete(voteRef);
      transaction.delete(userVoteRef);
      transaction.update(featureRef, { voteCount: Math.max(0, currentCount - 1), updatedAt: serverTimestamp() });
      return false;
    }

    transaction.set(voteRef, { uid, createdAt: serverTimestamp() });
    transaction.set(userVoteRef, { featureId, createdAt: serverTimestamp() });
    transaction.update(featureRef, { voteCount: currentCount + 1, updatedAt: serverTimestamp() });
    return true;
  });
}

export async function submitFeatureRequest(input: {
  title: string;
  description: string;
  whyUseful: string;
  category: FeatureVotingCategory;
  uid: string;
  creatorName: string;
}): Promise<string> {
  const title = input.title.trim();
  const description = input.description.trim();
  const whyUseful = input.whyUseful.trim();
  if (title.length < 5 || title.length > 100) throw new Error("Feature title must be between 5 and 100 characters.");
  if (description.length < 20 || description.length > 1000) throw new Error("Please give the feature a useful description (20–1000 characters).");
  if (whyUseful.length > 600) throw new Error("The usefulness explanation must be 600 characters or fewer.");

  const ref = doc(featuresCollection);
  await setDoc(ref, {
    title,
    description,
    whyUseful,
    category: input.category,
    status: "suggested" satisfies FeatureVotingStatus,
    voteCount: 0,
    createdBy: input.uid,
    creatorName: input.creatorName || "Tiny Titans user",
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFeatureRequestStatus(featureId: string, status: FeatureVotingStatus, adminNote?: string) {
  await updateDoc(doc(db, "featureRequests", featureId), {
    status,
    adminNote: adminNote?.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFeatureRequest(featureId: string) {
  await deleteDoc(doc(db, "featureRequests", featureId));
}
