import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";
import { HUSBANDRY_SAFETY_SEED } from "../data/husbandrySafetySeed";
import { mergeHusbandrySafetyItems } from "../lib/husbandrySafety";
import type { HusbandrySafetyItem } from "../types/husbandrySafety";

const COLLECTION = "husbandrySafetyLibrary";
const AUDIT_COLLECTION = "husbandrySafetyAudit";

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
  const batch = writeBatch(db);
  const itemRef = doc(db, COLLECTION, item.id);
  const auditRef = doc(collection(db, AUDIT_COLLECTION));

  batch.set(itemRef, {
    ...clean,
    id: item.id,
    archived: false,
    updatedByUid,
    updatedAt: serverTimestamp(),
  });
  batch.set(auditRef, {
    itemId: item.id,
    action: "save",
    updatedByUid,
    recordedAt: serverTimestamp(),
    snapshot: clean,
  });

  await batch.commit();
}

export async function archiveHusbandrySafetyItem(
  itemId: string,
  updatedByUid: string,
): Promise<void> {
  const batch = writeBatch(db);
  const itemRef = doc(db, COLLECTION, itemId);
  const auditRef = doc(collection(db, AUDIT_COLLECTION));

  batch.update(itemRef, {
    archived: true,
    updatedByUid,
    updatedAt: serverTimestamp(),
  });
  batch.set(auditRef, {
    itemId,
    action: "archive",
    updatedByUid,
    recordedAt: serverTimestamp(),
  });

  await batch.commit();
}
