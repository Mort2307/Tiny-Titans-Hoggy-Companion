import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MentorApplication, MentorshipRequest } from "./mentorNetwork";
import type { MentorshipWorkspace, WorkspaceMessage, WorkspacePermission } from "./mentorshipWorkspace";

const collections = { mentors: "mentors", applications: "mentorApplications", requests: "mentorshipRequests", workspaces: "mentorshipWorkspaces", events: "mentorshipEvents" } as const;

export async function saveMentorApplication(application: MentorApplication) { const ref = doc(db, collections.applications, application.id); await setDoc(ref, { ...application, updatedAt: serverTimestamp() }, { merge: true }); return ref; }
export async function createMentorshipRequest(request: MentorshipRequest) { const ref = await addDoc(collection(db, collections.requests), { ...request, createdAt: serverTimestamp() }); return ref.id; }
export function subscribeToUserMentorshipRequests(userId: string, callback: (requests: MentorshipRequest[]) => void) { const q = query(collection(db, collections.requests), where("requesterId", "==", userId), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MentorshipRequest)))); }
export function subscribeToMentorshipRequest(requestId: string, callback: (request: MentorshipRequest | null) => void) { return onSnapshot(doc(db, collections.requests, requestId), (snapshot) => callback(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as MentorshipRequest) : null)); }
export function subscribeToMentorMentorshipRequests(mentorId: string, callback: (requests: MentorshipRequest[]) => void) { const q = query(collection(db, collections.requests), where("mentorId", "==", mentorId), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MentorshipRequest)))); }
export async function updateMentorshipRequestStatus(requestId: string, status: "declined" | "cancelled") { await updateDoc(doc(db, collections.requests, requestId), { status, updatedAt: serverTimestamp() }); }

function permissionsFromRequestedRecords(records: string[]): Record<WorkspacePermission, boolean> {
  const requested = new Set(records);
  return { view_profile: true, view_weight: requested.has("Weight history"), view_feeding: requested.has("Feeding history"), view_sheds: requested.has("Shed history"), view_genetics: requested.has("Morph / genetics"), view_enclosure: requested.has("Enclosure setup"), view_photos: requested.has("Photos"), view_health: false };
}

export async function acceptMentorshipRequest(requestId: string, mentorId: string) {
  const requestRef = doc(db, collections.requests, requestId);
  const workspaceId = `mentorship-${requestId}`;
  const workspaceRef = doc(db, collections.workspaces, workspaceId);
  const now = new Date().toISOString();
  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error("Mentorship request no longer exists.");
    const request = requestSnapshot.data() as MentorshipRequest;
    if (request.mentorId !== mentorId) throw new Error("You are not the selected mentor for this request.");
    if (request.status !== "sent") throw new Error("This request has already been processed.");
    const workspace: MentorshipWorkspace = { id: workspaceId, goal: request.goal, status: "active", participants: [{ userId: request.requesterId, role: "mentee", joinedAt: now }, { userId: mentorId, role: "mentor", joinedAt: now }], permissions: permissionsFromRequestedRecords(request.requestedRecords), messages: [], events: [{ id: crypto.randomUUID(), type: "accepted", actorId: mentorId, createdAt: now, summary: "Mentorship request accepted and workspace opened." }], createdAt: now, updatedAt: now };
    transaction.update(requestRef, { status: "accepted", updatedAt: serverTimestamp(), acceptedAt: serverTimestamp(), workspaceId });
    transaction.set(workspaceRef, { ...workspace, createdAt: workspace.createdAt, updatedAt: serverTimestamp() });
  });
  return workspaceId;
}

export async function createMentorshipWorkspace(workspace: MentorshipWorkspace) { const ref = doc(db, collections.workspaces, workspace.id); await setDoc(ref, { ...workspace, createdAt: workspace.createdAt, updatedAt: serverTimestamp() }); return ref; }
export async function getMentorshipWorkspace(workspaceId: string) { const snapshot = await getDoc(doc(db, collections.workspaces, workspaceId)); return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as MentorshipWorkspace) : null; }
export async function updateWorkspacePermissions(workspaceId: string, permissions: Record<WorkspacePermission, boolean>) { await updateDoc(doc(db, collections.workspaces, workspaceId), { permissions, updatedAt: serverTimestamp() }); }
export async function appendWorkspaceEvent(workspaceId: string, event: Omit<NonNullable<MentorshipWorkspace["events"]>[number], "id">, eventId: string) { await setDoc(doc(db, collections.events, eventId), { workspaceId, ...event, createdAt: serverTimestamp() }); }
export async function appendWorkspaceMessage(workspaceId: string, message: WorkspaceMessage) { const workspace = await getMentorshipWorkspace(workspaceId); const messages = [...(workspace?.messages ?? []), message]; await updateDoc(doc(db, collections.workspaces, workspaceId), { messages, updatedAt: serverTimestamp() }); }
