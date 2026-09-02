import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");
const syncLocation = httpsCallable<undefined, { success: boolean; represented: boolean; areaId: string | null }>(functions, "syncCommunityLocationMembership");

export async function syncCommunityLocationMembership(): Promise<void> {
  await syncLocation(undefined);
}
