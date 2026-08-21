import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MentorApplicationStatus } from "./mentorNetwork";

export type MentorReviewDecision = "approved" | "needs-more-evidence" | "declined";
export type MentorReview = { reviewerId: string; decision: MentorReviewDecision; note: string; reviewedAt: string };

export type MentorApplicationRecord = {
  id: string;
  applicantId: string;
  status: MentorApplicationStatus;
  requestedVerification: string;
  specialities: string[];
  experienceSummary: string;
  breedingExperience?: string;
  evidenceNotes?: string;
  conductAccepted: boolean;
  review?: MentorReview;
};

const applications = collection(db, "mentorApplications");

export async function listMentorApplications(status?: MentorApplicationStatus) {
  const q = status
    ? query(applications, where("status", "==", status), orderBy("updatedAt", "desc"))
    : query(applications, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MentorApplicationRecord));
}

export async function reviewMentorApplication(applicationId: string, reviewerId: string, decision: MentorReviewDecision, note: string) {
  await updateDoc(doc(db, "mentorApplications", applicationId), {
    status: decision,
    review: { reviewerId, decision, note, reviewedAt: new Date().toISOString() },
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
