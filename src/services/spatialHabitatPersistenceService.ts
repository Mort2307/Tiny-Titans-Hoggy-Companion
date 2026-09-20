import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { SpatialHabitatScene } from "../types/spatialHabitat";
import { normalizeScene } from "./spatialHabitatService";

function sceneRef(uid: string, roomId: string) {
  return doc(db, "users", uid, "spatialHabitats", roomId);
}

export async function loadSpatialHabitat(uid: string, roomId: string): Promise<SpatialHabitatScene | null> {
  const snapshot = await getDoc(sceneRef(uid, roomId));
  if (!snapshot.exists()) return null;
  return normalizeScene(snapshot.data() as SpatialHabitatScene);
}

export async function saveSpatialHabitat(uid: string, roomId: string, scene: SpatialHabitatScene): Promise<void> {
  await setDoc(sceneRef(uid, roomId), {
    ...scene,
    updatedAt: new Date().toISOString(),
  });
}