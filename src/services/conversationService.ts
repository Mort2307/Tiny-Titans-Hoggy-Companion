import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export type ConversationKind = "bug" | "feedback";
export type ConversationMessage = {
  id: string;
  senderId: string;
  senderRole: "user" | "creator";
  message: string;
  createdAt?: unknown;
};

const parentCollection = (kind: ConversationKind) => kind === "bug" ? "issueReports" : "feedback";
const messagesCollection = (kind: ConversationKind, parentId: string) => collection(db, parentCollection(kind), parentId, "messages");

export async function getConversationMessages(kind: ConversationKind, parentId: string): Promise<ConversationMessage[]> {
  const snapshot = await getDocs(query(messagesCollection(kind, parentId), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ConversationMessage, "id">) }));
}

export async function sendConversationMessage(input: { kind: ConversationKind; parentId: string; senderId: string; senderRole: "user" | "creator"; message: string }) {
  const message = input.message.trim();
  if (!message) throw new Error("Please enter a message before sending.");
  if (!input.senderId) throw new Error("You must be signed in to send a message.");
  const ref = await addDoc(messagesCollection(input.kind, input.parentId), {
    senderId: input.senderId,
    senderRole: input.senderRole,
    message,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
