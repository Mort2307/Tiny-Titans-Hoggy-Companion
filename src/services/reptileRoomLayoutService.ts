import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type PersistedRoomSlot = {
  id: string;
  snakeId: string | null;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const FIELD = "reptileRoomLayout";
const VERSION_FIELD = "reptileRoomLayoutVersion";
const UPDATED_FIELD = "reptileRoomLayoutUpdatedAt";

function isRoomSlot(value: unknown): value is PersistedRoomSlot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PersistedRoomSlot>;
  return (
    typeof item.id === "string" &&
    (typeof item.snakeId === "string" || item.snakeId === null) &&
    typeof item.label === "string" &&
    Number.isFinite(item.x) &&
    Number.isFinite(item.y) &&
    Number.isFinite(item.w) &&
    Number.isFinite(item.h)
  );
}

export async function loadReptileRoomLayout(
  uid: string,
): Promise<PersistedRoomSlot[] | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const value = snapshot.data()[FIELD];
  if (!Array.isArray(value)) return null;
  const layout = value.filter(isRoomSlot);
  return layout.length ? layout : null;
}

export async function saveReptileRoomLayout(
  uid: string,
  layout: PersistedRoomSlot[],
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    [FIELD]: layout,
    [VERSION_FIELD]: 1,
    [UPDATED_FIELD]: serverTimestamp(),
  });
}
