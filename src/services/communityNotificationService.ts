import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityNotificationType = "reply" | "reaction" | "followed-content" | "project-update" | "marketplace";

export async function createCommunityNotification(input: { recipientId: string; actorId: string; type: CommunityNotificationType; contentId?: string; title: string; body: string; }): Promise<string> {
  if (!input.recipientId || !input.actorId || input.recipientId === input.actorId) return "";
  const ref = await addDoc(collection(db, "users", input.recipientId, "notifications"), { ...input, read: false, createdAt: serverTimestamp() });
  return ref.id;
}
