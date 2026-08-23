import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MentorDirectoryEntry, MentorRole } from "./mentorNetwork";
import type { MentorVerification } from "./mentorshipProfiles";

export type PublishedMentor = MentorDirectoryEntry & { userId: string; publishedAt: string; publishedBy: string; profileVersion: number };
const mentors = collection(db, "mentors");

export async function publishApprovedMentor(applicationId: string, mentor: PublishedMentor) {
  await setDoc(doc(db, "mentors", mentor.id), { ...mentor, sourceApplicationId: applicationId, verification: mentor.verification as MentorVerification, publishedAt: mentor.publishedAt, profileVersion: mentor.profileVersion }, { merge: true });
}

export async function listPublishedMentors(goal: string) {
  const q = query(mentors, where("acceptingNewMentees", "==", true), orderBy("profileVersion", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PublishedMentor)).filter((mentor) => mentor.mentoringGoals.includes(goal));
}

export async function listPublishedMentorsForAdmin() {
  const snapshot = await getDocs(query(mentors, orderBy("profileVersion", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PublishedMentor));
}

export async function updatePublishedMentorRoles(mentorId: string, mentorRoles: MentorRole[]) {
  if (!mentorRoles.length) throw new Error("A published mentor must retain at least one mentor role. Remove the mentor profile entirely if they should no longer mentor.");
  await updateDoc(doc(db, "mentors", mentorId), { mentorRoles, updatedAt: new Date().toISOString() });
}
