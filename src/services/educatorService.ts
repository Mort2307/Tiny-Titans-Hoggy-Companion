import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { AgeBand, EducatorProfile } from "../types/Profile";

export type Classroom = {
  id: string;
  ownerId: string;
  name: string;
  subject: string;
  studentAgeBands: AgeBand[];
  classCode: string;
  createdAt?: unknown;
};

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function saveEducatorProfile(uid: string, educator: EducatorProfile) {
  await setDoc(doc(db, "users", uid), { educatorProfile: educator, profileType: "educator", updatedAt: serverTimestamp() }, { merge: true });
}

export async function getEducatorClassrooms(uid: string): Promise<Classroom[]> {
  const snapshot = await getDocs(collection(db, "users", uid, "classrooms"));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Classroom, "id">) }));
}

export async function createClassroom(uid: string, input: Omit<Classroom, "id" | "ownerId" | "classCode" | "createdAt">): Promise<Classroom> {
  const classroomRef = doc(collection(db, "users", uid, "classrooms"));
  const classroom: Classroom = { ...input, id: classroomRef.id, ownerId: uid, classCode: `TT-${randomCode()}` };
  await setDoc(classroomRef, { ...classroom, createdAt: serverTimestamp() });
  return classroom;
}
