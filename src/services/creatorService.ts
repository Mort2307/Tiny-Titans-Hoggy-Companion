import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { ReportIssue } from "../types/reportIssue";

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

export async function submitFounderApplication(input: Omit<FounderApplication, "id" | "status" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "founderApplications"), {
    ...input,
    status: "Pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitIssueReport(input: Omit<ReportIssue, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "issueReports"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCreatorReports(): Promise<ReportIssue[]> {
  const snapshot = await getDocs(query(collection(db, "issueReports"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ReportIssue, "id">) }));
}

export async function updateCreatorReport(reportId: string, status: ReportIssue["status"]) {
  await updateDoc(doc(db, "issueReports", reportId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getFounderApplications(): Promise<FounderApplication[]> {
  const snapshot = await getDocs(query(collection(db, "founderApplications"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<FounderApplication, "id">) }));
}

export async function updateFounderApplication(id: string, status: FounderApplication["status"]) {
  await updateDoc(doc(db, "founderApplications", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserCount(): Promise<number> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.size;
}
