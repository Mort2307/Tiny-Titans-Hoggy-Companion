import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MentorApplicationStatus, MentorDirectoryEntry } from "./mentorNetwork";
import type { MentorVerification } from "./mentorshipProfiles";
import { publishApprovedMentor } from "./mentorDirectoryRepository";

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
  displayName?: string;
  bio?: string;
  mentoringGoals?: string[];
  experienceYears?: number;
  breedingYears?: number;
  clutchCount?: number;
};

const applications = collection(db, "mentorApplications");

export async function listMentorApplications(status?: MentorApplicationStatus) {
  const q = status ? query(applications, where("status", "==", status), orderBy("updatedAt", "desc")) : query(applications, orderBy("updatedAt", "desc"));
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

export async function approveAndPublishMentor(application: MentorApplicationRecord, reviewerId: string) {
  if (application.status !== "approved" || !application.review || application.review.decision !== "approved") throw new Error("Only an approved application can be published.");
  if (!application.conductAccepted) throw new Error("The mentor must accept the community conduct standard before publication.");
  const verification = (application.requestedVerification || "community") as MentorVerification;
  const mentor: MentorDirectoryEntry & { userId: string; publishedAt: string; publishedBy: string; profileVersion: number } = {
    id: `mentor-${application.applicantId}`,
    userId: application.applicantId,
    displayName: application.displayName || "TTHC Community Mentor",
    bio: application.bio || application.experienceSummary,
    verification,
    specialities: application.specialities,
    experienceYears: application.experienceYears ?? 0,
    breedingYears: application.breedingYears,
    clutchCount: application.clutchCount,
    availability: "accepting",
    mentoringGoals: application.mentoringGoals || [],
    acceptingNewMentees: true,
    responseTimeLabel: "New mentor — response time may vary",
    publishedAt: new Date().toISOString(),
    publishedBy: reviewerId,
    profileVersion: 1,
  };
  await publishApprovedMentor(application.id, mentor);
  await updateDoc(doc(db, "mentorApplications", application.id), { status: "published", publishedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
