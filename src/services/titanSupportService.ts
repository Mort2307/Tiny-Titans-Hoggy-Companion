import { collection, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";
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

const db = getFirestore(app);

export async function getTitanWallEntries(): Promise<TitanWallEntry[]> {
  const snapshot = await getDocs(collection(db, "supporterWall"));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        displayName: String(data.displayName || "Anonymous Titan"),
        socialUrl: typeof data.socialUrl === "string" && data.socialUrl ? data.socialUrl : null,
        tierLabel: String(data.tierLabel || "Titan Supporter"),
        amountGbp: typeof data.amountGbp === "number" ? data.amountGbp : 0,
        supportedAt: data.supportedAt?.toDate?.()?.toISOString?.() ?? null,
      } satisfies TitanWallEntry;
    })
    .sort((a, b) => (b.supportedAt ?? "").localeCompare(a.supportedAt ?? ""));
}

export async function saveTitanWallProfile(
  uid: string,
  profile: SupporterWallProfile,
  supporter: { tierLabel: string; amountGbp: number; supportedAt?: unknown },
): Promise<void> {
  const displayName = profile.visibility === "named" ? String(profile.displayName ?? "").trim() : "Anonymous Titan";
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

  await setDoc(doc(db, "supporterWall", uid), {
    uid,
    displayName,
    socialUrl,
    visibility: profile.visibility,
    tierLabel: supporter.tierLabel,
    amountGbp: supporter.amountGbp,
    supportedAt: supporter.supportedAt ?? null,
  }, { merge: true });
}
