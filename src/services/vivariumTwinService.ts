import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { DEFAULT_VIVARIUM_TWIN, type VivariumDigitalTwin } from "../types/vivariumTwin";
import { evaluateVivariumTwin } from "./vivariumTwinIntelligence";

function twinDoc(uid: string, slotId: string) {
  return doc(db, "users", uid, "vivariumTwins", slotId);
}

export async function loadVivariumTwin(uid: string, slotId: string): Promise<VivariumDigitalTwin> {
  const snapshot = await getDoc(twinDoc(uid, slotId));
  if (!snapshot.exists()) {
    return structuredClone(DEFAULT_VIVARIUM_TWIN);
  }
  const data = snapshot.data() as Partial<VivariumDigitalTwin>;
  const base = structuredClone(DEFAULT_VIVARIUM_TWIN);
  const twin: VivariumDigitalTwin = {
    ...base,
    ...data,
    checklist: { ...base.checklist, ...(data.checklist ?? {}) },
    assets: Array.isArray(data.assets) ? data.assets : [],
    intelligence: { ...base.intelligence, ...(data.intelligence ?? {}) },
    version: 1,
  };
  return twin;
}

export async function saveVivariumTwin(uid: string, slotId: string, twin: VivariumDigitalTwin): Promise<void> {
  const next: VivariumDigitalTwin = {
    ...twin,
    intelligence: evaluateVivariumTwin(twin),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(twinDoc(uid, slotId), next);
}
