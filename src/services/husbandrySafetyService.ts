import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { HUSBANDRY_SAFETY_SEED } from "../data/husbandrySafetySeed";
import { mergeHusbandrySafetyItems } from "../lib/husbandrySafety";
import type { HusbandrySafetyItem } from "../types/husbandrySafety";

const COLLECTION = "husbandrySafetyLibrary";

export async function getHusbandrySafetyLibrary(): Promise<HusbandrySafetyItem[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const overrides = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<HusbandrySafetyItem, "id">),
    }));
    return mergeHusbandrySafetyItems(HUSBANDRY_SAFETY_SEED, overrides);
  } catch (error) {
    console.warn("Husbandry Safety Library overrides unavailable; using bundled evidence set.", error);
    return mergeHusbandrySafetyItems(HUSBANDRY_SAFETY_SEED, []);
  }
}

export async function saveHusbandrySafetyItem(
  item: HusbandrySafetyItem,
  updatedByUid: string,
): Promise<void> {
  const clean = JSON.parse(JSON.stringify(item)) as HusbandrySafetyItem;
  await setDoc(doc(db, COLLECTION, item.id), {
    ...clean,
    id: item.id,
    archived: false,
    updatedByUid,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveHusbandrySafetyItem(
  itemId: string,
  updatedByUid: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, itemId), {
    archived: true,
    updatedByUid,
    updatedAt: serverTimestamp(),
  });
}
