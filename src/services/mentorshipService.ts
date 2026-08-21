import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, writeBatch, where } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import type { MentorshipRequest, MentorshipRequestStatus } from "./mentorNetwork";
import { createWorkspace, type MentorshipWorkspace, type WorkspacePermission } from "./mentorshipWorkspace";

const requests = collection(db, "mentorshipRequests");
const workspaces = collection(db, "mentorshipWorkspaces");

function requireUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to use mentorship.");
  return uid;
}

function toIso(value: unknown): string | undefined {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : undefined;
}

function mapRequest(id: string, data: Record<string, unknown>): MentorshipRequest {
  return {
    id,
    requesterId: String(data.requesterId ?? ""),
    mentorId: String(data.mentorId ?? ""),
    goal: String(data.goal ?? ""),
    message: String(data.message ?? ""),
    requestedRecords: Array.isArray(data.requestedRecords) ? data.requestedRecords.map(String) : [],
    status: (data.status ?? "sent") as MentorshipRequestStatus,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt),
    acceptedAt: toIso(data.acceptedAt),
    workspaceId: typeof data.workspaceId === "string" ? data.workspaceId : undefined,
  };
}

export async function createMentorshipRequest(input: { mentorId: string; goal: string; message: string; requestedRecords: string[] }): Promise<MentorshipRequest> {
  const requesterId = requireUserId();
  if (!input.mentorId || !input.goal || !input.message.trim()) throw new Error("Mentor, goal and message are required.");
  if (input.mentorId === requesterId) throw new Error("You cannot request mentorship from yourself.");

  const existing = await getDocs(query(requests, where("requesterId", "==", requesterId), where("mentorId", "==", input.mentorId), where("status", "in", ["sent", "accepted"]), limit(1)));
  if (!existing.empty) throw new Error("You already have an active or pending mentorship with this mentor.");

  const ref = await addDoc(requests, {
    requesterId,
    mentorId: input.mentorId,
    goal: input.goal,
    message: input.message.trim().slice(0, 4000),
    requestedRecords: input.requestedRecords.slice(0, 12),
    status: "sent",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, requesterId, mentorId: input.mentorId, goal: input.goal, message: input.message.trim().slice(0, 4000), requestedRecords: input.requestedRecords.slice(0, 12), status: "sent", createdAt: new Date().toISOString() };
}

export async function listMentorshipRequestsForMentor(): Promise<MentorshipRequest[]> {
  const mentorId = requireUserId();
  const snapshot = await getDocs(query(requests, where("mentorId", "==", mentorId), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.map(item => mapRequest(item.id, item.data() as Record<string, unknown>));
}

export async function listMyMentorshipRequests(): Promise<MentorshipRequest[]> {
  const requesterId = requireUserId();
  const snapshot = await getDocs(query(requests, where("requesterId", "==", requesterId), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.map(item => mapRequest(item.id, item.data() as Record<string, unknown>));
}

export async function getMentorshipRequest(requestId: string): Promise<MentorshipRequest | null> {
  const userId = requireUserId();
  const snapshot = await getDoc(doc(db, "mentorshipRequests", requestId));
  if (!snapshot.exists()) return null;
  const request = mapRequest(snapshot.id, snapshot.data() as Record<string, unknown>);
  if (request.requesterId !== userId && request.mentorId !== userId) throw new Error("You do not have access to this mentorship request.");
  return request;
}

export async function acceptMentorshipRequest(requestId: string): Promise<string> {
  const mentorId = requireUserId();
  const requestRef = doc(db, "mentorshipRequests", requestId);
  const snapshot = await getDoc(requestRef);
  if (!snapshot.exists()) throw new Error("Mentorship request not found.");
  const request = mapRequest(snapshot.id, snapshot.data() as Record<string, unknown>);
  if (request.mentorId !== mentorId) throw new Error("Only the invited mentor can accept this request.");
  if (request.status !== "sent") throw new Error("This request is no longer awaiting a response.");

  const workspaceRef = doc(workspaces);
  const workspace = createWorkspace(request.goal, request.requesterId, mentorId);
  const batch = writeBatch(db);
  batch.set(workspaceRef, { ...workspace, id: workspaceRef.id, requestId, permissions: workspace.permissions, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.update(requestRef, { status: "accepted", workspaceId: workspaceRef.id, acceptedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await batch.commit();
  return workspaceRef.id;
}

export async function declineMentorshipRequest(requestId: string): Promise<void> {
  const mentorId = requireUserId();
  const ref = doc(db, "mentorshipRequests", requestId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("Mentorship request not found.");
  const request = mapRequest(snapshot.id, snapshot.data() as Record<string, unknown>);
  if (request.mentorId !== mentorId) throw new Error("Only the invited mentor can decline this request.");
  if (request.status !== "sent") throw new Error("This request is no longer awaiting a response.");
  await updateDoc(ref, { status: "declined", updatedAt: serverTimestamp() });
}

export async function getMentorshipWorkspace(workspaceId: string): Promise<MentorshipWorkspace | null> {
  const userId = requireUserId();
  const snapshot = await getDoc(doc(db, "mentorshipWorkspaces", workspaceId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<MentorshipWorkspace> & { participants?: Array<{ userId: string }> };
  if (!data.participants?.some(participant => participant.userId === userId)) throw new Error("You do not have access to this mentorship workspace.");
  return { ...(data as MentorshipWorkspace), id: snapshot.id, permissions: { ...createWorkspace("", "", "").permissions, ...(data.permissions ?? {}) }, messages: Array.isArray(data.messages) ? data.messages : [], events: Array.isArray(data.events) ? data.events : [] };
}

export async function sendMentorshipMessage(workspaceId: string, body: string): Promise<void> {
  const userId = requireUserId();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");
  const workspace = await getMentorshipWorkspace(workspaceId);
  if (!workspace || workspace.status !== "active" || !workspace.participants.some(p => p.userId === userId)) throw new Error("This mentorship workspace is not active.");
  const ref = doc(db, "mentorshipWorkspaces", workspaceId);
  await updateDoc(ref, { messages: [...workspace.messages, { id: crypto.randomUUID(), senderId: userId, body: trimmed.slice(0, 4000), createdAt: new Date().toISOString() }], updatedAt: serverTimestamp() });
}

export async function updateWorkspacePermission(workspaceId: string, permission: WorkspacePermission, enabled: boolean): Promise<void> {
  const userId = requireUserId();
  const workspace = await getMentorshipWorkspace(workspaceId);
  if (!workspace || !workspace.participants.some(p => p.userId === userId && p.role === "mentee")) throw new Error("Only the keeper can change record-sharing permissions.");
  await updateDoc(doc(db, "mentorshipWorkspaces", workspaceId), { [`permissions.${permission}`]: enabled, updatedAt: serverTimestamp() });
}

export async function closeMentorshipWorkspace(workspaceId: string): Promise<void> {
  const userId = requireUserId();
  const workspace = await getMentorshipWorkspace(workspaceId);
  if (!workspace || !workspace.participants.some(p => p.userId === userId)) throw new Error("You do not have access to this workspace.");
  await updateDoc(doc(db, "mentorshipWorkspaces", workspaceId), { status: "closed", permissions: Object.fromEntries(Object.keys(workspace.permissions).map(key => [key, false])), updatedAt: serverTimestamp() });
}
