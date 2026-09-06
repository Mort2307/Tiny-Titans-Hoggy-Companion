import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase/config";

export type SubmissionConversationType = "morph-image" | "morph-terminology" | "species" | "vivarium-showcase" | "observation" | "mentor-application";
export type SubmissionConversation = { id: string; submissionType: SubmissionConversationType; submissionId: string; submitterUid: string; submissionTitle: string; submissionStatus?: string; createdAt?: unknown; updatedAt?: unknown; lastMessageAt?: unknown; lastMessagePreview?: string; lastSenderRole?: "user" | "creator"; unreadForSubmitter: number; unreadForCreator: number };
export type SubmissionConversationMessage = { id: string; senderId: string; senderRole: "user" | "creator"; message: string; createdAt?: unknown };
const conversations = collection(db, "submissionConversations");
const messages = (conversationId: string) => collection(db, "submissionConversations", conversationId, "messages");
const conversationIdFor = (submissionType: SubmissionConversationType, submissionId: string) => `${submissionType}__${submissionId}`;
function clean(value: unknown) { return String(value ?? "").trim(); }

export async function ensureSubmissionConversation(input: { submissionType: SubmissionConversationType; submissionId: string; submitterUid: string; submissionTitle: string; submissionStatus?: string }): Promise<SubmissionConversation> {
  const submissionId = clean(input.submissionId); const submitterUid = clean(input.submitterUid); const submissionTitle = clean(input.submissionTitle) || "Submission conversation";
  if (!submissionId || !submitterUid) throw new Error("A submission ID and keeper account are required.");
  const id = conversationIdFor(input.submissionType, submissionId); const ref = doc(conversations, id); const existing = await getDoc(ref);
  if (existing.exists()) return { id: existing.id, ...(existing.data() as Omit<SubmissionConversation, "id">) };
  await runTransaction(db, async (transaction) => { const current = await transaction.get(ref); if (current.exists()) return; transaction.set(ref, { submissionType: input.submissionType, submissionId, submitterUid, submissionTitle, submissionStatus: clean(input.submissionStatus), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), unreadForSubmitter: 0, unreadForCreator: 0 }); });
  return { id, submissionType: input.submissionType, submissionId, submitterUid, submissionTitle, submissionStatus: clean(input.submissionStatus), unreadForSubmitter: 0, unreadForCreator: 0 };
}
export async function getUserSubmissionConversations(uid: string): Promise<SubmissionConversation[]> { if (!uid) return []; const snapshot = await getDocs(query(conversations, where("submitterUid", "==", uid), orderBy("lastMessageAt", "desc"))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SubmissionConversation, "id">) })); }
export async function getCreatorSubmissionConversations(maxResults = 100): Promise<SubmissionConversation[]> { const snapshot = await getDocs(query(conversations, orderBy("lastMessageAt", "desc"), limit(maxResults))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SubmissionConversation, "id">) })); }
export async function getSubmissionConversationMessages(conversationId: string): Promise<SubmissionConversationMessage[]> { const snapshot = await getDocs(query(messages(conversationId), orderBy("createdAt", "asc"))); return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SubmissionConversationMessage, "id">) })); }
export function watchSubmissionConversationMessages(conversationId: string, callback: (messages: SubmissionConversationMessage[]) => void, onError?: (error: Error) => void) { return onSnapshot(query(messages(conversationId), orderBy("createdAt", "asc")), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SubmissionConversationMessage, "id">) }))), (error) => onError?.(error)); }
export async function sendSubmissionConversationMessage(input: { conversationId: string; senderId: string; senderRole: "user" | "creator"; message: string }): Promise<string> {
  const message = input.message.trim(); if (!input.conversationId || !input.senderId) throw new Error("A valid conversation and signed-in account are required."); if (!message) throw new Error("Please enter a message before sending.");
  const conversationRef = doc(conversations, input.conversationId); const messageRef = doc(messages(input.conversationId));
  await runTransaction(db, async (transaction) => { const snapshot = await transaction.get(conversationRef); if (!snapshot.exists()) throw new Error("This submission conversation no longer exists."); const data = snapshot.data() as Partial<SubmissionConversation>; const currentUnread = input.senderRole === "creator" ? Number(data.unreadForSubmitter ?? 0) : Number(data.unreadForCreator ?? 0); transaction.set(messageRef, { senderId: input.senderId, senderRole: input.senderRole, message, createdAt: serverTimestamp() }); transaction.update(conversationRef, { updatedAt: serverTimestamp(), lastMessageAt: serverTimestamp(), lastMessagePreview: message.slice(0, 240), lastSenderRole: input.senderRole, ...(input.senderRole === "creator" ? { unreadForSubmitter: currentUnread + 1 } : { unreadForCreator: currentUnread + 1 }) }); });
  return messageRef.id;
}
export async function markSubmissionConversationRead(conversationId: string, role: "user" | "creator") { if (!conversationId) return; await runTransaction(db, async (transaction) => { const ref = doc(conversations, conversationId); const snapshot = await transaction.get(ref); if (snapshot.exists()) transaction.update(ref, role === "creator" ? { unreadForCreator: 0 } : { unreadForSubmitter: 0 }); }); }
