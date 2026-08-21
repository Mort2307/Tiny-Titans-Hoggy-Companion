import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityReportReason = "spam" | "harassment" | "misinformation" | "animal_welfare" | "scam" | "incorrect_information" | "other";

export async function reportCommunityContent(contentId: string, reporterId: string, reason: CommunityReportReason, details?: string): Promise<string> {
  if (!contentId || !reporterId) throw new Error("A signed-in keeper is required to report content.");
  const report = await addDoc(collection(db, "communityReports"), {
    contentId,
    reporterId,
    reason,
    details: details?.trim().slice(0, 2000) || null,
    status: "open",
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "communityContent", contentId), {
    moderationStatus: "pending",
    updatedAt: serverTimestamp(),
  });
  return report.id;
}

export async function setCommunityModerationStatus(contentId: string, status: "approved" | "rejected", moderatorId: string): Promise<void> {
  if (!contentId || !moderatorId) throw new Error("Moderator identity is required.");
  await updateDoc(doc(db, "communityContent", contentId), {
    moderationStatus: status,
    moderatedBy: moderatorId,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
