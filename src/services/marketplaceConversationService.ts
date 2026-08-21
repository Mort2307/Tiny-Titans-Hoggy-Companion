import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";

export type MarketplaceConversationStatus = "enquiry" | "negotiating" | "reservation-requested" | "reserved" | "payment-arranged" | "completed" | "cancelled";
export type MarketplaceConversation = { id: string; listingId: string; buyerId: string; sellerId: string; listingTitle: string; listingToken?: string; listingPrice?: number | null; status: MarketplaceConversationStatus; lastMessage?: string; createdAt?: unknown; updatedAt?: unknown };
export type MarketplaceMessage = { id: string; senderId: string; message: string; createdAt?: unknown };
const conversations = collection(db, "marketplaceConversations");
const messages = (conversationId: string) => collection(db, "marketplaceConversations", conversationId, "messages");

export async function findMarketplaceConversation(listingId: string, buyerId: string): Promise<MarketplaceConversation | null> {
  const snapshot = await getDocs(query(conversations, where("listingId", "==", listingId), where("buyerId", "==", buyerId), where("status", "in", ["enquiry", "negotiating", "reservation-requested", "reserved", "payment-arranged"])));
  const item = snapshot.docs[0];
  return item ? { id: item.id, ...(item.data() as Omit<MarketplaceConversation, "id">) } : null;
}

export async function createMarketplaceConversation(input: Omit<MarketplaceConversation, "id" | "createdAt" | "updatedAt">, firstMessage: string): Promise<string> {
  const message = firstMessage.trim();
  if (!message) throw new Error("Please enter a message before sending.");
  if (!input.listingId || !input.buyerId || !input.sellerId) throw new Error("The marketplace conversation is missing required participants.");
  if (input.buyerId === input.sellerId) throw new Error("You cannot message yourself about your own listing.");
  const existing = await findMarketplaceConversation(input.listingId, input.buyerId);
  if (existing) { await sendMarketplaceMessage(existing.id, input.buyerId, message); return existing.id; }
  const ref = await addDoc(conversations, { ...input, status: "enquiry", lastMessage: message, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await addDoc(messages(ref.id), { senderId: input.buyerId, message, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getMarketplaceConversation(id: string): Promise<MarketplaceConversation | null> {
  const snapshot = await getDoc(doc(conversations, id));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as Omit<MarketplaceConversation, "id">) } : null;
}

export async function getMarketplaceMessages(id: string): Promise<MarketplaceMessage[]> {
  const snapshot = await getDocs(query(messages(id), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MarketplaceMessage, "id">) }));
}

export async function sendMarketplaceMessage(conversationId: string, senderId: string, message: string): Promise<void> {
  const text = message.trim();
  if (!text) throw new Error("Please enter a message before sending.");
  if (!senderId) throw new Error("You must be signed in to message the seller.");
  await addDoc(messages(conversationId), { senderId, message: text, createdAt: serverTimestamp() });
}

export async function updateMarketplaceConversationStatus(conversationId: string, status: MarketplaceConversationStatus): Promise<void> {
  if (!conversationId) throw new Error("A marketplace conversation is required.");
  await updateDoc(doc(conversations, conversationId), { status, updatedAt: serverTimestamp() });
}
