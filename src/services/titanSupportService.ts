import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type WallVisibility = "named" | "anonymous";
export interface SupporterWallProfile { visibility: WallVisibility; displayName?: string; socialUrl?: string; }
export interface TitanWallEntry { id: string; displayName: string; socialUrl: string | null; tierLabel: string; amountGbp: number; supportedAt: string | null; }
export interface TitanWallAdminEntry { id?: string; displayName: string; socialUrl: string; tierLabel: string; amountGbp: number; visibility: WallVisibility; supportedAt: string | null; }
export interface TitanSupportStats { totalSupporters: number; totalReceivedGbp: number; updatedAt: string | null; }

type FirestoreWallData = Record<string, unknown>;
type TimestampLike = { toDate: () => Date };

const db = getFirestore(app);
const functions = getFunctions(app, "europe-west2");
const reconcileTitanWall = httpsCallable<void, { created: number; checked: number }>(functions, "reconcileTitanWall");

const OFFICIAL_TITAN: TitanWallEntry = { id: "tiny-titans-official", displayName: "Tiny Titans", socialUrl: "https://www.facebook.com/share/1bmTfhZgc1/", tierLabel: "Founder & Creator", amountGbp: 0, supportedAt: null };

function normaliseUrl(value: string) {
  const socialUrl = value.trim();
  if (!socialUrl) return "";
  let parsed: URL;
  try { parsed = new URL(socialUrl); } catch { throw new Error("Please enter a valid social media link."); }
  if (parsed.protocol !== "https:") throw new Error("Social media links must use HTTPS.");
  return socialUrl;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function";
}

function toEntry(item: { id: string; data: () => FirestoreWallData }): TitanWallEntry | null {
  const data = item.data();
  if (data.visibility !== "named" && data.visibility !== "anonymous") return null;
  const supportedAt = isTimestampLike(data.supportedAt) ? data.supportedAt.toDate().toISOString() : null;
  return {
    id: item.id,
    displayName: String(data.displayName || "Anonymous Titan"),
    socialUrl: typeof data.socialUrl === "string" && data.socialUrl ? data.socialUrl : null,
    tierLabel: String(data.tierLabel || "Titan Supporter"),
    amountGbp: typeof data.amountGbp === "number" ? data.amountGbp : 0,
    supportedAt,
  };
}

export async function getTitanSupportStats(): Promise<TitanSupportStats> {
  const snapshot = await getDoc(doc(db, "supporterStats", "global"));
  const data = snapshot.exists() ? snapshot.data() : {};
  const updatedAt = isTimestampLike(data.updatedAt) ? data.updatedAt.toDate().toISOString() : null;
  return {
    totalSupporters: typeof data.totalSupporters === "number" ? data.totalSupporters : 0,
    totalReceivedGbp: typeof data.totalReceivedGbp === "number" ? data.totalReceivedGbp : 0,
    updatedAt,
  };
}

export async function getTitanWallEntries(): Promise<TitanWallEntry[]> {
  await reconcileTitanWall();
  const snapshot = await getDocs(collection(db, "supporterWall"));
  const entries = snapshot.docs.map(toEntry).filter((entry): entry is TitanWallEntry => entry !== null);
  if (!entries.some((entry) => entry.id === OFFICIAL_TITAN.id)) entries.push(OFFICIAL_TITAN);
  return entries.sort((a, b) => {
    if (a.id === OFFICIAL_TITAN.id) return -1;
    if (b.id === OFFICIAL_TITAN.id) return 1;
    return (b.supportedAt ?? "").localeCompare(a.supportedAt ?? "");
  });
}

export async function saveTitanWallProfile(uid: string, profile: SupporterWallProfile, supporter: { tierLabel: string; amountGbp: number; supportedAt?: unknown }): Promise<void> {
  const displayName = profile.visibility === "named" ? String(profile.displayName ?? "").trim() : "Anonymous Titan";
  if (profile.visibility === "named" && !displayName) throw new Error("Please enter the name you would like shown on the Wall of Titans.");
  const socialUrl = normaliseUrl(String(profile.socialUrl ?? ""));
  await setDoc(doc(db, "supporterWall", uid), { uid, displayName, socialUrl, visibility: profile.visibility, recognitionStatus: "chosen", tierLabel: supporter.tierLabel, amountGbp: supporter.amountGbp, supportedAt: supporter.supportedAt ?? null, updatedAt: Timestamp.now() }, { merge: true });
}

export async function saveTitanWallAdminEntry(input: TitanWallAdminEntry): Promise<void> {
  const displayName = input.visibility === "anonymous" ? "Anonymous Titan" : input.displayName.trim();
  if (!displayName) throw new Error("A named Wall entry needs a display name.");
  if (!Number.isFinite(input.amountGbp) || input.amountGbp < 0) throw new Error("Support amount must be a valid non-negative number.");
  const socialUrl = normaliseUrl(input.socialUrl);
  const id = input.id || crypto.randomUUID();
  const supportedAt = input.supportedAt ? Timestamp.fromDate(new Date(input.supportedAt)) : null;
  await setDoc(doc(db, "supporterWall", id), { uid: id, displayName, socialUrl, visibility: input.visibility, recognitionStatus: "chosen", tierLabel: input.tierLabel.trim() || "Titan Supporter", amountGbp: input.amountGbp, supportedAt }, { merge: true });
}

export async function ensureOfficialTitanWallEntry(): Promise<void> {
  await setDoc(doc(db, "supporterWall", OFFICIAL_TITAN.id), { uid: OFFICIAL_TITAN.id, displayName: OFFICIAL_TITAN.displayName, socialUrl: OFFICIAL_TITAN.socialUrl, visibility: "named", recognitionStatus: "chosen", tierLabel: OFFICIAL_TITAN.tierLabel, amountGbp: 0, supportedAt: null }, { merge: true });
}

export async function deleteTitanWallEntry(id: string): Promise<void> {
  if (!id) throw new Error("A Wall entry ID is required.");
  if (id === OFFICIAL_TITAN.id) throw new Error("The official Tiny Titans founder entry cannot be removed from the Wall of Titans.");
  await deleteDoc(doc(db, "supporterWall", id));
}
