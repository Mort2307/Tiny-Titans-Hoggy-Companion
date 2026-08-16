import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type KnowledgeCard = { icon: string; title: string; body: string; route: string };
export type KnowledgeLevelContent = { intro: string; cards: KnowledgeCard[]; caution: string };
export type CreatorContentOverrides = {
  knowledgeBase?: Partial<Record<"explorer" | "learner" | "student" | "adult", KnowledgeLevelContent>>;
  challengeNotice?: string;
  communityNotice?: string;
};

const ref = doc(db, "appConfig", "creatorContent");

export async function getCreatorContentOverrides(): Promise<CreatorContentOverrides> {
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() as CreatorContentOverrides : {};
}

export async function saveCreatorContentOverrides(value: CreatorContentOverrides, uid: string): Promise<void> {
  await setDoc(ref, { ...value, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
}
