import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityReaction = "like" | "helpful";

export async function addCommunityReply(contentId: string, authorId: string, authorDisplayName: string, body: string): Promise<string> {
  const cleaned = body.trim().slice(0, 5000);
  if (!contentId || !authorId || !cleaned) throw new Error("A valid community reply is required.");
  const reply = await addDoc(collection(db, "communityContent", contentId, "replies"), {
    authorId,
    authorDisplayName: authorDisplayName.trim().slice(0, 80),
    body: cleaned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "communityContent", contentId), {
    "engagement.comments": increment(1),
    updatedAt: serverTimestamp(),
  });
  return reply.id;
}

export async function reactToCommunityContent(contentId: string, userId: string, reaction: CommunityReaction): Promise<void> {
  if (!contentId || !userId) throw new Error("You must be signed in to react.");
  const reactionRef = doc(db, "communityContent", contentId, "reactions", `${userId}_${reaction}`);
  await updateDoc(doc(db, "communityContent", contentId), {
    [`engagement.${reaction === "helpful" ? "helpful" : "likes"}`]: increment(1),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(reactionRef, { userId, reaction, createdAt: serverTimestamp() }).catch(async () => {
    await addDoc(collection(db, "communityContent", contentId, "reactionEvents"), { userId, reaction, createdAt: serverTimestamp() });
  });
}
