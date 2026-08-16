import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type WallVisibility = "named" | "anonymous";

export interface SupporterWallProfile {
  visibility: WallVisibility;
  displayName?: string;
  socialUrl?: string;
}

export interface TitanWallEntry {
  id: string;
  displayName: string;
  socialUrl: string | null;
  tierLabel: string;
  amountGbp: number;
  supportedAt: string | null;
}

const functions = getFunctions(app, "europe-west2");
const getTitanWall = httpsCallable<
  Record<string, never>,
  { supporters: TitanWallEntry[] }
>(functions, "getTitanWall");
const updateTitanWallProfile = httpsCallable<
  SupporterWallProfile,
  { success: boolean }
>(functions, "updateTitanWallProfile");

export async function getTitanWallEntries(): Promise<TitanWallEntry[]> {
  const result = await getTitanWall({});
  return result.data.supporters;
}

export async function saveTitanWallProfile(profile: SupporterWallProfile): Promise<void> {
  const displayName = profile.visibility === "named" ? String(profile.displayName ?? "").trim() : "";
  const socialUrl = String(profile.socialUrl ?? "").trim();

  if (profile.visibility === "named" && !displayName) {
    throw new Error("Please enter the name you would like shown on the Wall of Titans.");
  }

  if (socialUrl) {
    let parsed: URL;
    try {
      parsed = new URL(socialUrl);
    } catch {
      throw new Error("Please enter a valid social media link.");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("Social media links must use HTTPS.");
    }
  }

  await updateTitanWallProfile({
    visibility: profile.visibility,
    displayName,
    socialUrl,
  });
}
