import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MentorApplication, MentorshipRequest } from "./mentorNetwork";
import type { MentorshipWorkspace, WorkspacePermission } from "./mentorshipWorkspace";

const collections = {
  mentors: "mentors",
  applications: "mentorApplications",
  requests: "mentorshipRequests",
  workspaces: "mentorshipWorkspaces",
  events: "mentorshipEvents",
} as const;

export async function saveMentorApplication(application: MentorApplication) {
  const ref = doc(db, collections.applications, application.id);
  await setDoc(ref, { ...application, updatedAt: serverTimestamp() }, { merge: true });
  return ref;
}

export async function createMentorshipRequest(request: MentorshipRequest) {
  const ref = await addDoc(collection(db, collections.requests), { ...request, createdAt: serverTimestamp() });
  return ref.id;
}

export function subscribeToUserMentorshipRequests(userId: string, callback: (requests: MentorshipRequest[]) => void) {
  const q = query(collection(db, collections.requests), where("requesterId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MentorshipRequest))));
}

export async function createMentorshipWorkspace(workspace: MentorshipWorkspace) {
  const ref = doc(db, collections.workspaces, workspace.id);
  await setDoc(ref, { ...workspace, createdAt: workspace.createdAt, updatedAt: serverTimestamp() });
  return ref;
}

export async function getMentorshipWorkspace(workspaceId: string) {
  const snapshot = await getDoc(doc(db, collections.workspaces, workspaceId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as MentorshipWorkspace) : null;
}

export async function updateWorkspacePermissions(workspaceId: string, permissions: Record<WorkspacePermission, boolean>) {
  await updateDoc(doc(db, collections.workspaces, workspaceId), { permissions, updatedAt: serverTimestamp() });
}

export async function appendWorkspaceEvent(workspaceId: string, event: Omit<NonNullable<MentorshipWorkspace["events"]>[number], eventId: string) {
  await setDoc(doc(db, collections.events, eventId), { workspaceId, ...event, createdAt: serverTimestamp() });
}
