import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");
const syncLocation = httpsCallable<undefined, { success: boolean; represented: boolean; areaId: string | null }>(functions, "syncCommunityLocationMembership");
const rebuildLocationIndexCallable = httpsCallable<undefined, { success: boolean; representedUsers: number; areas: number; usersScanned: number }>(functions, "rebuildCommunityLocationIndex");

export async function syncCommunityLocationMembership(): Promise<void> {
  await syncLocation(undefined);
}

export async function rebuildCommunityLocationIndex(): Promise<{ representedUsers: number; areas: number; usersScanned: number }> {
  const response = await rebuildLocationIndexCallable(undefined);
  return {
    representedUsers: response.data.representedUsers,
    areas: response.data.areas,
    usersScanned: response.data.usersScanned,
  };
}
